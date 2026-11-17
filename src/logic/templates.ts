// 品詞問題の「テンプレート文」のロジック。

import { PATTERN_BY_ID } from '../data/patterns'
import type { FormKey, PatternId, Template, WordFamily } from '../types'

// 空所の印（ハイフン7個）
export const BLANK = '-------'

// 空所がいくつあるか
export function countBlanks(text: string): number {
  return text.split(BLANK).length - 1
}

// 空所に答えを入れた文を作る
export function fillBlank(text: string, answer: string): string {
  return text.replace(BLANK, answer)
}

// 入力フォームから受け取る「素材」
export type TemplateDraft = {
  pattern: PatternId
  text: string
  answerPos: FormKey
  translation: string
  clue: string
  familyId?: string
}

// 登録してよい内容か調べる。問題があれば、画面に出すメッセージを返す。なければ null。
export function validateTemplate(draft: TemplateDraft, families: WordFamily[]): string | null {
  if (countBlanks(draft.text) !== 1) {
    return `英文には空所「${BLANK}」をちょうど1つ入れてください`
  }
  const info = PATTERN_BY_ID[draft.pattern]
  if (!info.answerForms.includes(draft.answerPos)) {
    return `「${info.label}」の正解にできない形です`
  }
  if (draft.familyId) {
    const family = families.find((f) => f.id === draft.familyId)
    if (!family) return '指定した語の仲間が見つかりません'
    if (!family[draft.answerPos]) return '指定した語の仲間に、正解の形がありません'
  }
  return null
}

export type AddTemplateResult = { templates: Template[]; error?: string }

// テンプレートを追加する。ヒントが空なら、パターンの基本ヒントを使う。
export function addTemplate(
  templates: Template[],
  draft: TemplateDraft,
  families: WordFamily[],
  makeId: () => string = () => crypto.randomUUID(),
): AddTemplateResult {
  const error = validateTemplate(draft, families)
  if (error) return { templates, error }

  const text = draft.text.trim()
  if (templates.some((t) => t.text === text && t.familyId === draft.familyId)) {
    return { templates, error: '同じ英文がすでに登録されています' }
  }
  const template: Template = {
    id: makeId(),
    pattern: draft.pattern,
    text,
    answerPos: draft.answerPos,
    translation: draft.translation.trim(),
    clue: draft.clue.trim() || PATTERN_BY_ID[draft.pattern].hint,
  }
  if (draft.familyId) template.familyId = draft.familyId
  return { templates: [...templates, template] }
}

export function deleteTemplate(templates: Template[], id: string): Template[] {
  return templates.filter((t) => t.id !== id)
}

// サンプルなど、id つきのデータを「まだ入っていないものだけ」足す
export function mergeById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): { items: T[]; added: number } {
  const known = new Set(existing.map((x) => x.id))
  const fresh = incoming.filter((x) => !known.has(x.id))
  return { items: [...existing, ...fresh], added: fresh.length }
}
