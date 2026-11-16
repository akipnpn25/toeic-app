import { describe, expect, it } from 'vitest'
import type { Pos, Word } from '../types'
import { buildNextQuestion, makeQuestion, pickTargetWord, recordAnswer, shuffle } from './drill'

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

describe('pickTargetWord', () => {
  it('直前と同じ単語は避ける', () => {
    for (let i = 0; i < 20; i++) {
      expect(pickTargetWord(verbs, 'v1')!.id).not.toBe('v1')
    }
  })
  it('単語が1つだけなら、それを返す', () => {
    expect(pickTargetWord([verbs[0]], 'v1')!.id).toBe('v1')
  })
  it('単語がなければ null', () => {
    expect(pickTargetWord([], null)).toBeNull()
  })
})

describe('buildNextQuestion', () => {
  it('単語が足りなければ null', () => {
    expect(buildNextQuestion([verbs[0]], null)).toBeNull()
  })
  it('十分あれば問題を作る', () => {
    expect(buildNextQuestion([...verbs, ...nouns], null)).not.toBeNull()
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
