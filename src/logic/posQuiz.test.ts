import { describe, expect, it } from 'vitest'
import { PATTERNS } from '../data/patterns'
import type { Template, WordFamily } from '../types'
import {
  buildPosQuestion,
  isFeasible,
  patternAccuracy,
  patternWeight,
  pickDistractorForms,
  pickWeighted,
  recordPatternAnswer,
} from './posQuiz'

const decide: WordFamily = {
  id: 'decide', verb: 'decide', noun: 'decision', adj: 'decisive', adv: 'decisively',
  ing: 'deciding', ed: 'decided', meanings: {},
}
const apply: WordFamily = {
  id: 'apply', verb: 'apply', noun: 'application', person: 'applicant', adj: 'applicable', meanings: {},
}
// 名詞と動詞が同じ綴り
const increase: WordFamily = {
  id: 'increase', verb: 'increase', noun: 'increase', adj: 'increasing', adv: 'increasingly', meanings: {},
}

function template(overrides: Partial<Template> = {}): Template {
  return {
    id: 't1', pattern: 'noun_det', text: 'The ------- of the new office was delayed.',
    answerPos: 'noun', translation: '', clue: 'hint', ...overrides,
  }
}

describe('パターン定義', () => {
  it('13パターンある', () => {
    expect(PATTERNS).toHaveLength(13)
    expect(new Set(PATTERNS.map((p) => p.id)).size).toBe(13)
  })
})

describe('patternWeight / patternAccuracy', () => {
  it('未挑戦は中くらい（3）、全問正解を続けるほど軽く、間違えるほど重くなる', () => {
    const fresh = patternWeight(undefined)
    expect(fresh).toBe(3)
    expect(patternWeight({ answered: 10, correct: 10 })).toBeLessThan(fresh)
    expect(patternWeight({ answered: 10, correct: 0 })).toBeGreaterThan(fresh)
  })
  it('重みは 1 〜 5 の範囲', () => {
    for (const s of [{ answered: 1000, correct: 1000 }, { answered: 1000, correct: 0 }]) {
      expect(patternWeight(s)).toBeGreaterThanOrEqual(1)
      expect(patternWeight(s)).toBeLessThanOrEqual(5)
    }
  })
  it('正答率：未挑戦は null', () => {
    expect(patternAccuracy(undefined)).toBeNull()
    expect(patternAccuracy({ answered: 4, correct: 3 })).toBe(0.75)
  })
})

describe('pickWeighted', () => {
  it('random の値に応じて、重みの大きい範囲から選ばれる', () => {
    // 重み 1:3 → 0〜0.25 が a、0.25〜1 が b
    expect(pickWeighted(['a', 'b'], [1, 3], () => 0.1)).toBe('a')
    expect(pickWeighted(['a', 'b'], [1, 3], () => 0.3)).toBe('b')
    expect(pickWeighted(['a', 'b'], [1, 3], () => 0.999)).toBe('b')
  })
  it('たくさん引くと、重みに近い割合になる', () => {
    let a = 0
    for (let i = 0; i < 4000; i++) if (pickWeighted(['a', 'b'], [1, 3]) === 'a') a++
    expect(a / 4000).toBeGreaterThan(0.2)
    expect(a / 4000).toBeLessThan(0.3)
  })
})

describe('recordPatternAnswer', () => {
  it('問題数と正解数を増やす（元は変えない）', () => {
    const before = {}
    const s1 = recordPatternAnswer(before, 'noun_det', true)
    const s2 = recordPatternAnswer(s1, 'noun_det', false)
    expect(s2.noun_det).toEqual({ answered: 2, correct: 1 })
    expect(before).toEqual({})
  })
})

describe('pickDistractorForms', () => {
  it('正解以外の3つを、重複なしで選ぶ', () => {
    const forms = pickDistractorForms(decide, 'noun', 'noun_det')!
    expect(forms).toHaveLength(3)
    expect(new Set(forms).size).toBe(3)
    expect(forms).not.toContain('noun')
  })
  it('パターンで誤答にしてよい形だけを使う（名詞の前の形容詞では、名詞・動詞・副詞・人）', () => {
    for (let i = 0; i < 30; i++) {
      const forms = pickDistractorForms(decide, 'adj', 'adj_noun')!
      for (const f of forms) expect(['noun', 'verb', 'adv', 'person']).toContain(f)
    }
  })
  it('同じ綴りの形は誤答にしない（increase の名詞と動詞）', () => {
    for (let i = 0; i < 30; i++) {
      const forms = pickDistractorForms(increase, 'noun', 'noun_det') // 動詞 increase は使えない
      if (forms) expect(forms).not.toContain('verb')
    }
  })
  it('分詞パターンでは、-ing と -ed の相方が必ず入る', () => {
    for (let i = 0; i < 30; i++) {
      expect(pickDistractorForms(decide, 'ing', 'participle')).toContain('ed')
      expect(pickDistractorForms(decide, 'ed', 'participle')).toContain('ing')
    }
  })
  it('「人か物か」では、人と物の名詞が必ずセットで入る', () => {
    for (let i = 0; i < 30; i++) {
      expect(pickDistractorForms(apply, 'person', 'noun_person')).toContain('noun')
      expect(pickDistractorForms(apply, 'noun', 'noun_person')).toContain('person')
    }
  })
  it('通常の形で足りないときだけ、予備の形（人か物か → -ing）を使う', () => {
    const employ: WordFamily = { id: 'e', verb: 'employ', noun: 'employment', person: 'employee', ing: 'employing', meanings: {} }
    expect(pickDistractorForms(employ, 'person', 'noun_person')!.sort()).toEqual(['ing', 'noun', 'verb'])
    // 形容詞があるなら、予備は使わない
    for (let i = 0; i < 30; i++) {
      expect(pickDistractorForms(apply, 'person', 'noun_person')).not.toContain('ing')
    }
  })
  it('正解の形がない・誤答が足りないときは null', () => {
    expect(pickDistractorForms(apply, 'adv', 'adv_verb')).toBeNull() // adv がない
    const small: WordFamily = { id: 's', verb: 'a', noun: 'b', meanings: {} }
    expect(pickDistractorForms(small, 'noun', 'noun_det')).toBeNull() // 誤答が1つしか作れない
  })
  it('相方が必須なのに仲間にその形がなければ null', () => {
    const noPerson: WordFamily = { id: 'n', verb: 'a', noun: 'b', adj: 'c', adv: 'd', meanings: {} }
    expect(pickDistractorForms(noPerson, 'noun', 'noun_person')).toBeNull()
  })
})

describe('isFeasible', () => {
  it('出題できる組み合わせかを返す', () => {
    expect(isFeasible(template(), decide)).toBe(true)
    expect(isFeasible(template({ pattern: 'adv_verb', answerPos: 'adv' }), apply)).toBe(false)
  })
})

describe('buildPosQuestion', () => {
  const templates = [template()]

  it('選択肢は4つで、重複がなく、answerIndex が正解の形を指す', () => {
    for (let i = 0; i < 30; i++) {
      const q = buildPosQuestion(templates, [decide], {})!
      expect(q.choices).toHaveLength(4)
      expect(new Set(q.choices.map((c) => c.text)).size).toBe(4)
      expect(q.choices[q.answerIndex]).toEqual({ form: 'noun', text: 'decision' })
    }
  })
  it('テンプレートか語の仲間がなければ null', () => {
    expect(buildPosQuestion([], [decide], {})).toBeNull()
    expect(buildPosQuestion(templates, [], {})).toBeNull()
  })
  it('専用の語の仲間が決まっているテンプレートは、その仲間だけを使う', () => {
    const bound = template({ id: 'b', familyId: 'apply', pattern: 'noun_person', answerPos: 'person' })
    for (let i = 0; i < 20; i++) {
      expect(buildPosQuestion([bound], [decide, apply], {})!.familyId).toBe('apply')
    }
    // 専用の仲間が登録されていなければ出題できない
    expect(buildPosQuestion([bound], [decide], {})).toBeNull()
  })
  it('苦手なパターンほど多く出る', () => {
    const ts = [
      template({ id: 'easy', pattern: 'noun_det' }),
      template({ id: 'hard', pattern: 'noun_prep', text: 'Without ------- it failed.' }),
    ]
    const stats = {
      noun_det: { answered: 50, correct: 50 }, // 重み ≒ 1.08
      noun_prep: { answered: 50, correct: 0 }, // 重み ≒ 4.9
    }
    let hard = 0
    for (let i = 0; i < 2000; i++) if (buildPosQuestion(ts, [decide], stats)!.templateId === 'hard') hard++
    expect(hard / 2000).toBeGreaterThan(0.7)
  })
  it('直前と同じテンプレートは、他にあれば避ける', () => {
    const ts = [template({ id: 'a' }), template({ id: 'b', text: 'Another ------- here.' })]
    for (let i = 0; i < 30; i++) {
      expect(buildPosQuestion(ts, [decide], {}, Math.random, 'a')!.templateId).toBe('b')
    }
  })
  it('1つしかなければ、直前と同じでも出す', () => {
    expect(buildPosQuestion(templates, [decide], {}, Math.random, 't1')!.templateId).toBe('t1')
  })
})
