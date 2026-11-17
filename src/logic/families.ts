// 「語の仲間」（decide / decision / decisive / decisively のような形違いのセット）のロジック。

import type { FormKey, Word, WordFamily } from '../types'

// 入力フォームから受け取る「素材」。forms は形ごとの英単語、meanings は形ごとの意味。
export type FamilyDraft = {
  forms: Partial<Record<FormKey, string>>
  meanings: Record<string, string>
}

// 同じ仲間かどうかを見分けるためのキー。いちばん基本になる形（動詞→名詞→…の順）の綴り。
const KEY_ORDER: FormKey[] = ['verb', 'noun', 'adj', 'adv', 'ing', 'ed', 'person']

export function familyKey(forms: Partial<Record<FormKey, string>>): string {
  for (const form of KEY_ORDER) {
    const text = forms[form]?.trim()
    if (text) return text.toLowerCase()
  }
  return ''
}

// 空欄や前後の空白を取り除いて、「入力のあった形」だけにする
function cleanForms(forms: Partial<Record<FormKey, string>>): Partial<Record<FormKey, string>> {
  const result: Partial<Record<FormKey, string>> = {}
  for (const [form, text] of Object.entries(forms)) {
    const t = text?.trim()
    if (t) result[form as FormKey] = t
  }
  return result
}

export type SaveFamilyResult = {
  families: WordFamily[]
  error?: 'few' | 'duplicate' // few：入力された形が2つ未満
}

// 語の仲間を追加する。editingId を渡すと、その仲間を書き換える（編集）。
export function saveFamily(
  families: WordFamily[],
  draft: FamilyDraft,
  makeId: () => string = () => crypto.randomUUID(),
  editingId?: string,
): SaveFamilyResult {
  const forms = cleanForms(draft.forms)
  if (Object.keys(forms).length < 2) return { families, error: 'few' }

  const key = familyKey(forms)
  if (families.some((f) => f.id !== editingId && familyKey(f) === key)) {
    return { families, error: 'duplicate' }
  }

  // 意味は、入力のある形のものだけ残す
  const meanings: Record<string, string> = {}
  for (const form of Object.keys(forms)) {
    const m = draft.meanings[form]?.trim()
    if (m) meanings[form] = m
  }

  if (editingId !== undefined) {
    return {
      families: families.map((f) => (f.id === editingId ? { id: f.id, ...forms, meanings } : f)),
    }
  }
  return { families: [...families, { id: makeId(), ...forms, meanings }] }
}

export function deleteFamily(families: WordFamily[], id: string): WordFamily[] {
  return families.filter((f) => f.id !== id)
}

// 1行（例："decide / decision / decisive / decisively"）を読み取る。
// 順番は「動詞 名詞 形容詞 副詞」。無い形は "-" と書く。区切りは空白・スラッシュ・「、」。
export function parseFamilyLine(line: string): FamilyDraft | null {
  const tokens = line.trim().split(/[\s/、,]+/).filter((t) => t !== '')
  if (tokens.length !== 4) return null

  const order: FormKey[] = ['verb', 'noun', 'adj', 'adv']
  const forms: Partial<Record<FormKey, string>> = {}
  tokens.forEach((token, i) => {
    if (!/^[-－ー×]+$/.test(token)) forms[order[i]] = token
  })
  if (Object.keys(forms).length < 2) return null
  return { forms, meanings: {} }
}

// 複数行を読み取り、まとめて追加する。
export function addFamiliesFromText(
  families: WordFamily[],
  text: string,
  makeId: () => string = () => crypto.randomUUID(),
): { families: WordFamily[]; added: number; duplicates: number; invalid: string[] } {
  let current = families
  let added = 0
  let duplicates = 0
  const invalid: string[] = []

  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue
    const draft = parseFamilyLine(line)
    if (!draft) {
      invalid.push(line)
      continue
    }
    const result = saveFamily(current, draft, makeId)
    if (result.error === 'duplicate') duplicates++
    else if (result.error) invalid.push(line)
    else {
      current = result.families
      added++
    }
  }
  return { families: current, added, duplicates, invalid }
}

// ある形の意味を返す。語の仲間に意味が書いてなければ、単語一覧に同じ英単語があればその意味を使う。
export function meaningOf(family: WordFamily, form: FormKey, words: Word[]): string {
  const own = family.meanings[form]
  if (own) return own
  const text = family[form]
  if (!text) return ''
  const word = words.find((w) => w.word.toLowerCase() === text.toLowerCase())
  return word ? word.meanings.join('、') : ''
}
