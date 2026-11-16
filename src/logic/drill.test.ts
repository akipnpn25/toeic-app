import { describe, expect, it } from 'vitest'
import type { Pos, Word } from '../types'
import {
  applyAnswer,
  buildNextQuestion,
  makeQuestion,
  pickTargetWord,
  queueRetry,
  recordAnswer,
  removeRetry,
  RETRY_GAP,
  shuffle,
} from './drill'
import type { PickContext, Retry } from './drill'

function makeWord(id: string, word: string, meanings: string[], pos?: Pos): Word {
  return { id, word, meanings, pos, level: 0, correct: 0, wrong: 0, nextReview: 0, addedAt: 0 }
}

// 決まった数を順番に返す偽の random（テストの結果を固定するため）
function fakeRandom(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

const verbs = [
  makeWord('v1', 'decide', ['決める', '決心する'], 'verb'),
  makeWord('v2', 'submit', ['提出する'], 'verb'),
  makeWord('v3', 'require', ['必要とする'], 'verb'),
  makeWord('v4', 'attend', ['出席する'], 'verb'),
]
const nouns = [
  makeWord('n1', 'contract', ['契約'], 'noun'),
  makeWord('n2', 'invoice', ['請求書'], 'noun'),
]

describe('shuffle', () => {
  it('要素は同じで、元の配列は変わらない', () => {
    const src = [1, 2, 3, 4, 5]
    const out = shuffle(src)
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
    expect(src).toEqual([1, 2, 3, 4, 5])
  })
})

describe('makeQuestion', () => {
  it('選択肢は4つで、重複がなく、正解を含む', () => {
    const q = makeQuestion([...verbs, ...nouns], verbs[0])!
    expect(q.choices).toHaveLength(4)
    expect(new Set(q.choices).size).toBe(4)
    expect(q.choices).toContain(q.answer)
  })

  it('正解は、その単語の意味のどれか', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeQuestion([...verbs, ...nouns], verbs[0])!
      expect(verbs[0].meanings).toContain(q.answer)
    }
  })

  it('同じ単語の別の意味は、誤答に混ざらない', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeQuestion([...verbs, ...nouns], verbs[0])!
      const others = q.choices.filter((c) => c !== q.answer)
      expect(others).not.toContain('決める')
      expect(others).not.toContain('決心する')
    }
  })

  it('同じ品詞の単語が十分あれば、誤答はすべて同じ品詞から選ぶ', () => {
    const nounMeanings = ['契約', '請求書']
    for (let i = 0; i < 20; i++) {
      const q = makeQuestion([...verbs, ...nouns], verbs[0])!
      const others = q.choices.filter((c) => c !== q.answer)
      expect(others.some((c) => nounMeanings.includes(c))).toBe(false)
    }
  })

  it('同じ品詞が足りないときは、他の品詞で補う', () => {
    // 動詞は decide, submit の2つだけ → 誤答3つのうち2つ以上は名詞から
    const words = [verbs[0], verbs[1], ...nouns, makeWord('n3', 'budget', ['予算'], 'noun')]
    const q = makeQuestion(words, verbs[0])!
    expect(q.choices).toHaveLength(4)
    expect(q.choices).toContain('提出する') // 同じ品詞はまず入る
  })

  it('意味が複数ある単語は、random しだいで別の意味が出る', () => {
    const words = [...verbs, ...nouns]
    const first = makeQuestion(words, verbs[0], fakeRandom([0]))!
    const last = makeQuestion(words, verbs[0], fakeRandom([0.99]))!
    expect(first.answer).toBe('決める')
    expect(last.answer).toBe('決心する')
  })

  it('誤答が3つ集まらないときは null', () => {
    expect(makeQuestion([verbs[0], verbs[1], verbs[2]], verbs[0])).toBeNull()
  })

  it('他の単語の意味が対象と重なっていたら、誤答にしない', () => {
    // 3語しかなく、うち1語は対象と同じ意味 → 使える誤答は1つだけ
    const words = [
      makeWord('a', 'a', ['決める']),
      makeWord('b', 'b', ['決める']),
      makeWord('c', 'c', ['提出する']),
      makeWord('d', 'd', ['契約']),
    ]
    expect(makeQuestion(words, words[0])).toBeNull()
  })
})

const NOW = 1_000_000
// テスト用の「今の状況」を作る
function ctx(overrides: Partial<PickContext> = {}): PickContext {
  return { now: NOW, lastId: null, retries: [], answeredCount: 0, ...overrides }
}

describe('pickTargetWord', () => {
  it('直前と同じ単語は避ける', () => {
    for (let i = 0; i < 20; i++) {
      expect(pickTargetWord(verbs, ctx({ lastId: 'v1' }))!.word.id).not.toBe('v1')
    }
  })
  it('単語が1つだけなら、それを返す', () => {
    expect(pickTargetWord([verbs[0]], ctx({ lastId: 'v1' }))!.word.id).toBe('v1')
  })
  it('単語がなければ null', () => {
    expect(pickTargetWord([], ctx())).toBeNull()
  })
  it('復習の期日が来た単語だけを出す', () => {
    const words = verbs.map((w) => (w.id === 'v2' ? w : { ...w, nextReview: NOW + 99999 }))
    for (let i = 0; i < 10; i++) {
      expect(pickTargetWord(words, ctx())!.word.id).toBe('v2')
    }
  })
  it('再出題の予約は、数問たったら最優先で出る', () => {
    const retries: Retry[] = [{ wordId: 'v3', dueAt: 3 }]
    const picked = pickTargetWord(verbs, ctx({ retries, answeredCount: 3 }))!
    expect(picked).toMatchObject({ isRetry: true })
    expect(picked.word.id).toBe('v3')
  })
  it('再出題の予約は、まだ早ければ出ない', () => {
    const retries: Retry[] = [{ wordId: 'v3', dueAt: 3 }]
    for (let i = 0; i < 20; i++) {
      expect(pickTargetWord(verbs, ctx({ retries, answeredCount: 2 }))!.isRetry).toBe(false)
    }
  })
  it('直前に出した単語の再出題は、すぐには出さない', () => {
    const retries: Retry[] = [{ wordId: 'v3', dueAt: 0 }]
    for (let i = 0; i < 20; i++) {
      expect(pickTargetWord(verbs, ctx({ retries, lastId: 'v3' }))!.word.id).not.toBe('v3')
    }
  })
})

describe('buildNextQuestion', () => {
  it('単語が足りなければ null', () => {
    expect(buildNextQuestion([verbs[0]], ctx())).toBeNull()
  })
  it('十分あれば問題を作る（通常は isRetry が false）', () => {
    const q = buildNextQuestion([...verbs, ...nouns], ctx())!
    expect(q.isRetry).toBe(false)
  })
  it('再出題の予約から作った問題は isRetry が true', () => {
    const retries: Retry[] = [{ wordId: 'n1', dueAt: 0 }]
    const q = buildNextQuestion([...verbs, ...nouns], ctx({ retries }))!
    expect(q).toMatchObject({ wordId: 'n1', isRetry: true })
  })
})

describe('queueRetry / removeRetry', () => {
  it('間違えた単語を、RETRY_GAP 問あとに出す予約にする', () => {
    expect(queueRetry([], 'v1', 5)).toEqual([{ wordId: 'v1', dueAt: 5 + RETRY_GAP }])
  })
  it('同じ単語の予約は1つだけ（予約し直す）', () => {
    const r = queueRetry([{ wordId: 'v1', dueAt: 4 }], 'v1', 10)
    expect(r).toEqual([{ wordId: 'v1', dueAt: 10 + RETRY_GAP }])
  })
  it('予約を取り除ける', () => {
    expect(removeRetry([{ wordId: 'v1', dueAt: 1 }, { wordId: 'v2', dueAt: 2 }], 'v1')).toEqual([
      { wordId: 'v2', dueAt: 2 },
    ])
  })
})

describe('applyAnswer', () => {
  const q = (isRetry: boolean) => ({
    wordId: 'v1',
    word: 'decide',
    answer: '決める',
    choices: [],
    isRetry,
  })
  const at3 = verbs.map((w) => (w.id === 'v1' ? { ...w, level: 3 } : w))

  it('通常の問題で正解すると、レベルが上がり次の出題日が決まる', () => {
    const r = applyAnswer(at3, q(false), true, NOW)[0]
    expect(r).toMatchObject({ level: 4, correct: 1, wrong: 0 })
    expect(r.nextReview).toBeGreaterThan(NOW)
  })
  it('通常の問題で間違えると、レベルが2下がる', () => {
    const r = applyAnswer(at3, q(false), false, NOW)[0]
    expect(r).toMatchObject({ level: 1, correct: 0, wrong: 1 })
  })
  it('再出題で正解しても、レベルは変わらない（正解数だけ増える）', () => {
    const r = applyAnswer(at3, q(true), true, NOW)[0]
    expect(r).toMatchObject({ level: 3, correct: 1 })
    expect(r.nextReview).toBe(at3[0].nextReview)
  })
  it('再出題でまた間違えても、レベルはさらに下がらない', () => {
    const r = applyAnswer(at3, q(true), false, NOW)[0]
    expect(r).toMatchObject({ level: 3, wrong: 1 })
  })
})

describe('recordAnswer', () => {
  it('正解なら correct が1増える', () => {
    const r = recordAnswer(verbs, 'v1', true)
    expect(r[0]).toMatchObject({ correct: 1, wrong: 0 })
  })
  it('不正解なら wrong が1増える', () => {
    const r = recordAnswer(verbs, 'v1', false)
    expect(r[0]).toMatchObject({ correct: 0, wrong: 1 })
  })
  it('他の単語は変わらず、元の配列も書き換えない', () => {
    const r = recordAnswer(verbs, 'v1', true)
    expect(r[1]).toEqual(verbs[1])
    expect(verbs[0].correct).toBe(0)
  })
})
