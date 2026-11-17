import { describe, expect, it } from 'vitest'
import { isFeasible } from '../logic/posQuiz'
import { validateTemplate } from '../logic/templates'
import { PATTERNS } from './patterns'
import { STARTER_FAMILIES, STARTER_TEMPLATES } from './starter'

describe('サンプルデータ', () => {
  it('id が重複していない', () => {
    expect(new Set(STARTER_FAMILIES.map((f) => f.id)).size).toBe(STARTER_FAMILIES.length)
    expect(new Set(STARTER_TEMPLATES.map((t) => t.id)).size).toBe(STARTER_TEMPLATES.length)
  })

  it('13パターンすべてに、テンプレートが1つ以上ある', () => {
    for (const p of PATTERNS) {
      expect(STARTER_TEMPLATES.some((t) => t.pattern === p.id), p.id).toBe(true)
    }
  })

  it('すべてのテンプレートが、登録できる内容になっている', () => {
    for (const t of STARTER_TEMPLATES) {
      expect(validateTemplate(t, STARTER_FAMILIES), t.id).toBeNull()
    }
  })

  it('すべてのテンプレートが、少なくとも1つの語の仲間で出題できる', () => {
    for (const t of STARTER_TEMPLATES) {
      const families = t.familyId ? STARTER_FAMILIES.filter((f) => f.id === t.familyId) : STARTER_FAMILIES
      expect(families.some((f) => isFeasible(t, f)), t.id).toBe(true)
    }
  })

  it('語の仲間の意味が、あるすべての形に書いてある', () => {
    for (const f of STARTER_FAMILIES) {
      for (const form of ['noun', 'verb', 'adj', 'adv', 'ing', 'ed', 'person'] as const) {
        if (f[form]) expect(f.meanings[form], `${f.id}.${form}`).toBeTruthy()
      }
    }
  })
})
