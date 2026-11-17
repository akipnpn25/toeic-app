import { describe, expect, it } from 'vitest'
import { STARTER_WORDS } from '../data/starterWords'
import type { Word } from '../types'
import {
  applyVocabAnswer,
  buildVocabQuestion,
  isEligible,
  makeBlank,
  parseExamples,
  pickDistractorWords,
  usableExamples,
  validateExamples,
} from './vocab'
import { addWords } from './words'

const NOW = 1_000_000

function w(word: string, pos?: Word['pos'], examples?: string[], extra: Partial<Word> = {}): Word {
  return {
    id: word, word, meanings: [`${word}の意味`], pos, examples,
    level: 0, correct: 0, wrong: 0, nextReview: 0, addedAt: 0, ...extra,
  }
}

describe('makeBlank', () => {
  it('例文の英単語を空所にする', () => {
    expect(makeBlank('We must submit the form.', 'submit')).toEqual({
      text: 'We must ------- the form.',
      matched: 'submit',
    })
  })
  it('大文字小文字を区別しない（文頭の大文字も見つけ、実際の綴りを返す）', () => {
    expect(makeBlank('Submit the form today.', 'submit')).toEqual({
      text: '------- the form today.',
      matched: 'Submit',
    })
  })
  it('別の単語の一部にはヒットしない（submit は submitted に反応しない）', () => {
    expect(makeBlank('She submitted the form.', 'submit')).toBeNull()
    expect(makeBlank('The resubmit button.', 'submit')).toBeNull()
  })
  it('熟語（空白を含む）や記号を含む語も扱える', () => {
    expect(makeBlank('They will take over the firm.', 'take over')?.text).toBe('They will ------- the firm.')
    expect(makeBlank('A state-of-the-art plant.', 'state-of-the-art')?.text).toBe('A ------- plant.')
  })
  it('文の中に最初に出てきた1か所だけを空所にする', () => {
    expect(makeBlank('Submit it, then submit again.', 'submit')?.text).toBe('------- it, then submit again.')
  })
  it('単語が含まれていなければ null', () => {
    expect(makeBlank('Nothing here.', 'submit')).toBeNull()
    expect(makeBlank('anything', '  ')).toBeNull()
  })
})

describe('parseExamples / validateExamples', () => {
  it('1行に1文。空行と前後の空白は捨てる', () => {
    expect(parseExamples(' A submit b.\n\n  C submit d.  \n')).toEqual(['A submit b.', 'C submit d.'])
  })
  it('すべて単語を含んでいれば null、含まない文があればその文を示す', () => {
    expect(validateExamples('submit', ['We submit it.'])).toBeNull()
    expect(validateExamples('submit', ['We submit it.', 'No word.'])).toContain('No word.')
  })
})

describe('usableExamples / isEligible', () => {
  it('単語を含む例文だけが使える', () => {
    const word = w('submit', 'verb', ['We submit it.', 'Broken sentence.'])
    expect(usableExamples(word)).toEqual(['We submit it.'])
    expect(isEligible(word)).toBe(true)
  })
  it('例文がない・使える例文がなければ対象外', () => {
    expect(isEligible(w('submit', 'verb'))).toBe(false)
    expect(isEligible(w('submit', 'verb', ['No word.']))).toBe(false)
  })
})

describe('pickDistractorWords', () => {
  const verbs = ['a', 'b', 'c', 'd'].map((x) => w(`verb_${x}`, 'verb'))
  const nouns = ['a', 'b', 'c'].map((x) => w(`noun_${x}`, 'noun'))
  const target = w('target', 'verb')

  it('同じ品詞の単語から選ぶ', () => {
    for (let i = 0; i < 20; i++) {
      const picked = pickDistractorWords([target, ...verbs, ...nouns], target, 3)!
      expect(picked).toHaveLength(3)
      expect(picked.every((p) => p.pos === 'verb')).toBe(true)
    }
  })
  it('同じ品詞が足りなければ、品詞が未設定の単語 → 別の品詞の順に補う', () => {
    const unknown = w('unknown') // 品詞なし
    const words = [target, verbs[0], unknown, ...nouns]
    for (let i = 0; i < 20; i++) {
      const ids = pickDistractorWords(words, target, 3)!.map((p) => p.id)
      expect(ids).toContain('verb_a')
      expect(ids).toContain('unknown') // 名詞より先に、未設定の単語が入る
    }
  })
  it('正解の単語自身と、同じ綴りの単語は選ばない', () => {
    const dup = w('TARGET', 'verb', undefined, { id: 'dup' })
    for (let i = 0; i < 20; i++) {
      const ids = pickDistractorWords([target, dup, ...verbs], target, 3)!.map((p) => p.id)
      expect(ids).not.toContain('target')
      expect(ids).not.toContain('dup')
    }
  })
  it('足りなければ null', () => {
    expect(pickDistractorWords([target, verbs[0], verbs[1]], target, 3)).toBeNull()
  })
})

describe('buildVocabQuestion', () => {
  const words = [
    w('submit', 'verb', ['We must submit the form today.']),
    w('postpone', 'verb'),
    w('require', 'verb'),
    w('attend', 'verb'),
    w('deadline', 'noun'),
  ]

  it('例文のある単語を正解にして、4択を作る', () => {
    for (let i = 0; i < 20; i++) {
      const q = buildVocabQuestion(words, NOW, null)!
      expect(q.wordId).toBe('submit')
      expect(q.text).toBe('We must ------- the form today.')
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices.map((c) => c.text)).size).toBe(4)
      expect(q.choices[q.answerIndex].text).toBe('submit')
    }
  })
  it('誤答は同じ品詞の単語（動詞が3つあれば、名詞は混ざらない）', () => {
    for (let i = 0; i < 30; i++) {
      const q = buildVocabQuestion(words, NOW, null)!
      expect(q.choices.map((c) => c.text)).not.toContain('deadline')
    }
  })
  it('文頭の空所なら、選択肢も大文字で始める', () => {
    const ws = [w('submit', 'verb', ['Submit the form today.']), w('a', 'verb'), w('b', 'verb'), w('c', 'verb')]
    const q = buildVocabQuestion(ws, NOW, null)!
    expect(q.choices.map((c) => c.text).sort()).toEqual(['A', 'B', 'C', 'Submit'])
  })
  it('例文が複数あれば、毎回ランダムに選ぶ', () => {
    const ws = [w('submit', 'verb', ['One submit.', 'Two submit.']), ...words.slice(1)]
    expect(buildVocabQuestion(ws, NOW, null, () => 0)!.sentence).toBe('One submit.')
    expect(buildVocabQuestion(ws, NOW, null, () => 0.99)!.sentence).toBe('Two submit.')
  })
  it('復習の時期が来ている単語を優先する', () => {
    const ws = [
      w('submit', 'verb', ['We submit it.'], { nextReview: NOW + 99999 }),
      w('attend', 'verb', ['We attend it.']),
      w('postpone', 'verb'),
      w('require', 'verb'),
    ]
    for (let i = 0; i < 20; i++) expect(buildVocabQuestion(ws, NOW, null)!.wordId).toBe('attend')
  })
  it('例文のある単語がなければ null / 単語が足りなくても null', () => {
    expect(buildVocabQuestion(words.map((x) => ({ ...x, examples: undefined })), NOW, null)).toBeNull()
    expect(buildVocabQuestion(words.slice(0, 3), NOW, null)).toBeNull()
  })
})

describe('applyVocabAnswer', () => {
  const words = [w('a', 'verb', undefined, { level: 2 }), w('b', 'verb')]
  it('正解：正解数+1、レベル+1、次の出題日が先になる', () => {
    const r = applyVocabAnswer(words, 'a', true, NOW)[0]
    expect(r).toMatchObject({ correct: 1, wrong: 0, level: 3 })
    expect(r.nextReview).toBeGreaterThan(NOW)
  })
  it('不正解：間違い数+1、レベル-2', () => {
    expect(applyVocabAnswer(words, 'a', false, NOW)[0]).toMatchObject({ correct: 0, wrong: 1, level: 0 })
  })
  it('他の単語は変わらない', () => {
    expect(applyVocabAnswer(words, 'a', true, NOW)[1]).toEqual(words[1])
  })
})

describe('サンプル単語', () => {
  it('すべての例文に、見出しの英単語がそのまま入っている', () => {
    for (const e of STARTER_WORDS) {
      expect(validateExamples(e.word, e.examples ?? []), e.word).toBeNull()
      expect(e.examples?.length, e.word).toBeGreaterThan(0)
    }
  })
  it('24語あり、品詞ごとに誤答が作れるだけの数がある', () => {
    expect(STARTER_WORDS).toHaveLength(24)
    const { words } = addWords([], STARTER_WORDS, NOW)
    for (const target of words) {
      expect(buildVocabQuestion([target], NOW, null)).toBeNull() // 1語だけでは出題できない
      expect(pickDistractorWords(words, target, 3), target.word).not.toBeNull()
    }
  })
  it('全部読み込めば、24語すべてが出題対象になる', () => {
    const { words } = addWords([], STARTER_WORDS, NOW)
    expect(words.filter(isEligible)).toHaveLength(24)
  })
})
