// 品詞問題（Part 5 形式）の出題ロジック。
//   1. 苦手なパターンほど出やすいように、重み付きランダムでパターンを選ぶ
//   2. そのパターンのテンプレート文と、当てはまる「語の仲間」を選ぶ
//   3. 語の仲間の形違い（decision / decisive …）から、4つの選択肢を作る

import { PATTERN_BY_ID } from '../data/patterns'
import type { FormKey, PatternId, PatternStats, Template, WordFamily } from '../types'
import { shuffle } from './drill'

type Random = () => number

// ---- パターンごとの成績と「重み」 ----

// 正答率。まだ1問も解いていなければ null。
export function patternAccuracy(stat: PatternStats[string] | undefined): number | null {
  if (!stat || stat.answered === 0) return null
  return stat.correct / stat.answered
}

// パターンの出やすさ（重み）。正答率が低いほど大きい。
// 解いた数が少ないうちは正答率が不安定なので、「正解1・不正解1」を最初から足して滑らかにしている
// （ラプラス平滑化）。未挑戦は正答率 50% 扱い → 重み 3。全問正解を続けると 1 に近づき、全問不正解だと 5 に近づく。
export function patternWeight(stat: PatternStats[string] | undefined): number {
  const answered = stat?.answered ?? 0
  const correct = stat?.correct ?? 0
  const smoothed = (correct + 1) / (answered + 2)
  return 1 + 4 * (1 - smoothed)
}

// 重みに応じて、items から1つ選ぶ（重いほど選ばれやすい）
export function pickWeighted<T>(items: T[], weights: number[], random: Random = Math.random): T {
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r < 0) return items[i]
  }
  return items[items.length - 1] // 計算誤差で最後まで来てしまったとき
}

export function recordPatternAnswer(
  stats: PatternStats,
  pattern: PatternId,
  isCorrect: boolean,
): PatternStats {
  const prev = stats[pattern] ?? { answered: 0, correct: 0 }
  return {
    ...stats,
    [pattern]: { answered: prev.answered + 1, correct: prev.correct + (isCorrect ? 1 : 0) },
  }
}

// ---- 選択肢づくり ----

// 必ず選択肢に入れたい「相方」の形。
//   分詞：-ing と -ed は、セットで並べて「どちらか」を問う
//   人か物か：人を表す名詞と、物を表す名詞をセットで並べる
function requiredForm(pattern: PatternId, answer: FormKey): FormKey | undefined {
  if (pattern === 'participle') return answer === 'ing' ? 'ed' : answer === 'ed' ? 'ing' : undefined
  if (pattern === 'noun_person') return answer === 'noun' ? 'person' : answer === 'person' ? 'noun' : undefined
  return undefined
}

// 誤答に使う形を3つ選ぶ。選べなければ null（この語の仲間・この問題では出題できない）。
//   - 同じ綴りの形（increase の名詞と動詞など）は、正解と区別できないので使わない
//   - パターンごとに「誤答にしてよい形」が決まっている（data/patterns.ts）
export function pickDistractorForms(
  family: WordFamily,
  answerForm: FormKey,
  pattern: PatternId,
  random: Random = Math.random,
): FormKey[] | null {
  const answerText = family[answerForm]
  if (!answerText) return null

  const used = new Set([answerText.toLowerCase()])
  const result: FormKey[] = []
  // 使えるなら result に入れる（その形がない・すでに同じ綴りがあるなら false）
  const take = (form: FormKey): boolean => {
    const text = family[form]
    if (!text || used.has(text.toLowerCase())) return false
    used.add(text.toLowerCase())
    result.push(form)
    return true
  }

  const required = requiredForm(pattern, answerForm)
  if (required && !take(required)) return null

  const info = PATTERN_BY_ID[pattern]
  const usable = (f: FormKey) => f !== answerForm && f !== required
  for (const form of shuffle(info.distractorPool.filter(usable), random)) {
    if (result.length >= 3) break
    take(form)
  }
  // まだ足りないときだけ、予備の形を（決まった順に）使う
  for (const form of info.fallbackPool?.filter(usable) ?? []) {
    if (result.length >= 3) break
    take(form)
  }
  return result.length === 3 ? result : null
}

// このテンプレートを、この語の仲間で出題できるか
export function isFeasible(template: Template, family: WordFamily): boolean {
  return pickDistractorForms(family, template.answerPos, template.pattern, () => 0) !== null
}

// ---- 問題づくり ----

export type PosChoice = { form: FormKey; text: string }

export type PosQuestion = {
  templateId: string
  pattern: PatternId
  familyId: string
  text: string // 空所（-------）を含む英文
  translation: string
  clue: string
  choices: PosChoice[] // (A)〜(D) の4つ（並びはシャッフル済み）
  answerIndex: number // 正解の位置（0〜3）
}

// 次の問題を作る。出題できるものが1つもなければ null。
// avoidTemplateId を渡すと、直前と同じテンプレートはできるだけ避ける。
export function buildPosQuestion(
  templates: Template[],
  families: WordFamily[],
  stats: PatternStats,
  random: Random = Math.random,
  avoidTemplateId?: string,
): PosQuestion | null {
  // 出題できる「テンプレート × 語の仲間」の組み合わせを、パターンごとに集める
  const byPattern = new Map<PatternId, { template: Template; family: WordFamily }[]>()
  for (const template of templates) {
    // 専用の語の仲間が決まっているテンプレートは、その仲間だけを使う
    const candidates = template.familyId
      ? families.filter((f) => f.id === template.familyId)
      : families
    for (const family of candidates) {
      if (!isFeasible(template, family)) continue
      const list = byPattern.get(template.pattern) ?? []
      list.push({ template, family })
      byPattern.set(template.pattern, list)
    }
  }
  if (byPattern.size === 0) return null

  // 1) 苦手なパターンほど選ばれやすい、重み付きランダム
  const patterns = [...byPattern.keys()]
  const pattern = pickWeighted(patterns, patterns.map((p) => patternWeight(stats[p])), random)

  // 2) そのパターンの中から1つ。直前と同じ文は、他にあれば避ける
  let pairs = byPattern.get(pattern)!
  const others = pairs.filter((p) => p.template.id !== avoidTemplateId)
  if (others.length > 0) pairs = others
  const { template, family } = pairs[Math.floor(random() * pairs.length)]

  // 3) 選択肢を作って、並べ替える
  const distractors = pickDistractorForms(family, template.answerPos, template.pattern, random)!
  const forms = shuffle([template.answerPos, ...distractors], random)
  const choices = forms.map((form) => ({ form, text: family[form]! }))

  return {
    templateId: template.id,
    pattern: template.pattern,
    familyId: family.id,
    text: template.text,
    translation: template.translation,
    clue: template.clue,
    choices,
    answerIndex: forms.indexOf(template.answerPos),
  }
}
