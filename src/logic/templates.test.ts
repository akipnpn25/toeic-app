import { describe, expect, it } from 'vitest'
import type { Template, WordFamily } from '../types'
import { addTemplate, countBlanks, deleteTemplate, fillBlank, mergeById, validateTemplate } from './templates'
import type { TemplateDraft } from './templates'

const families: WordFamily[] = [{ id: 'f1', verb: 'decide', noun: 'decision', meanings: {} }]

function draft(overrides: Partial<TemplateDraft> = {}): TemplateDraft {
  return {
    pattern: 'noun_det',
    text: 'The ------- of the new office was delayed.',
    answerPos: 'noun',
    translation: '新しいオフィスの（　）は遅れた。',
    clue: '',
    ...overrides,
  }
}

describe('countBlanks / fillBlank', () => {
  it('空所の数を数える', () => {
    expect(countBlanks('The ------- of the')).toBe(1)
    expect(countBlanks('no blank')).toBe(0)
    expect(countBlanks('------- and -------')).toBe(2)
  })
  it('空所に答えを入れる', () => {
    expect(fillBlank('The ------- of it', 'decision')).toBe('The decision of it')
  })
})

describe('validateTemplate', () => {
  it('正しい内容なら null', () => {
    expect(validateTemplate(draft(), families)).toBeNull()
  })
  it('空所が0個・2個以上ならエラー', () => {
    expect(validateTemplate(draft({ text: 'No blank here.' }), families)).toContain('空所')
    expect(validateTemplate(draft({ text: '------- and -------' }), families)).toContain('空所')
  })
  it('パターンの正解にできない形ならエラー', () => {
    expect(validateTemplate(draft({ answerPos: 'adv' }), families)).toContain('正解にできない')
  })
  it('分詞パターンでは ing / ed を選べる', () => {
    expect(validateTemplate(draft({ pattern: 'participle', answerPos: 'ed' }), families)).toBeNull()
  })
  it('専用の語の仲間が存在しない・正解の形がないとエラー', () => {
    expect(validateTemplate(draft({ familyId: 'nothing' }), families)).toContain('見つかりません')
    expect(validateTemplate(draft({ pattern: 'adv_verb', answerPos: 'adv', familyId: 'f1' }), families)).toContain('正解の形')
  })
})

describe('addTemplate', () => {
  it('追加すると id がつき、ヒントが空ならパターンの基本ヒントになる', () => {
    const r = addTemplate([], draft(), families, () => 't1')
    expect(r.templates[0]).toMatchObject({ id: 't1', pattern: 'noun_det' })
    expect(r.templates[0].clue).toContain('冠詞')
  })
  it('ヒントを書けばそれを使う。専用の語の仲間も保存する', () => {
    const r = addTemplate([], draft({ clue: 'the ------- of → 名詞', familyId: 'f1' }), families, () => 't1')
    expect(r.templates[0].clue).toBe('the ------- of → 名詞')
    expect(r.templates[0].familyId).toBe('f1')
  })
  it('同じ英文は二重に追加できない', () => {
    const first = addTemplate([], draft(), families, () => 't1').templates
    expect(addTemplate(first, draft(), families, () => 't2').error).toContain('すでに')
  })
  it('内容に問題があれば追加されない', () => {
    const r = addTemplate([], draft({ text: 'no blank' }), families)
    expect(r.templates).toHaveLength(0)
    expect(r.error).toBeDefined()
  })
})

describe('deleteTemplate / mergeById', () => {
  const t = (id: string) => ({ id }) as Template
  it('id で削除する', () => {
    expect(deleteTemplate([t('a'), t('b')], 'a').map((x) => x.id)).toEqual(['b'])
  })
  it('サンプルの追加では、すでにある id は足さない', () => {
    const r = mergeById([t('a')], [t('a'), t('b')])
    expect(r.items.map((x) => x.id)).toEqual(['a', 'b'])
    expect(r.added).toBe(1)
  })
})
