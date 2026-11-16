// 単語ドリル（4択）の出題ロジック。
// random（0以上1未満の数を返す関数）を引数で受け取れるようにしてあるので、
// テストでは「決まった値を返す偽の random」を渡して、結果を固定できる。

import type { Word } from '../types'
import { pickNextWord, scheduleAfterAnswer } from './srs'

// 1問分のデータ
export type Question = {
  wordId: string // 出題する単語の id
  word: string // 画面に出す英単語
  answer: string // 正解の意味（その単語の意味のうち、今回選ばれた1つ）
  choices: string[] // 4つの選択肢（正解を含む。並びはシャッフル済み）
  isRetry: boolean // 間違えた単語の「再出題」かどうか
}

// 「間違えた単語を、あとでもう一度出す」ための予約
export type Retry = {
  wordId: string
  dueAt: number // 「この回で何問答えたら出してよいか」（答えた問題数で数える）
}

// 間違えてから、何問あとに再出題するか（間に他の問題が3問入る）
export const RETRY_GAP = 3

type Random = () => number

// 配列をランダムに並べ替える（Fisher-Yates 法）。元の配列は書き換えない。
export function shuffle<T>(items: T[], random: Random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)) // 0〜i のどれか
    ;[result[i], result[j]] = [result[j], result[i]] // 入れ替え
  }
  return result
}

// 他の単語の意味から、誤答の候補を「重複なし」で n 個選ぶ。
// 対象と同じ品詞の単語の意味を先に使い、足りなければ他の品詞から補う。
function pickDistractors(words: Word[], target: Word, n: number, random: Random): string[] {
  // 正解になりうる意味（対象の単語の全ての意味）は、誤答に使わない
  const forbidden = new Set(target.meanings)

  const others = words.filter((w) => w.id !== target.id)
  const samePos = target.pos ? others.filter((w) => w.pos === target.pos) : []
  const rest = others.filter((w) => !samePos.includes(w))

  const result: string[] = []
  const used = new Set<string>()
  // 同じ品詞のグループ → それ以外のグループ、の順に、シャッフルして詰めていく
  for (const group of [samePos, rest]) {
    const meanings = shuffle(group.flatMap((w) => w.meanings), random)
    for (const m of meanings) {
      if (result.length >= n) break
      if (forbidden.has(m) || used.has(m)) continue
      used.add(m)
      result.push(m)
    }
  }
  return result
}

// 1つの単語から問題を作る。誤答が3つ集まらなければ null。
export function makeQuestion(
  words: Word[],
  target: Word,
  random: Random = Math.random,
): Question | null {
  const distractors = pickDistractors(words, target, 3, random)
  if (distractors.length < 3) return null

  // 意味が複数ある単語は、毎回ランダムに1つ選ぶ
  const answer = target.meanings[Math.floor(random() * target.meanings.length)]
  return {
    wordId: target.id,
    word: target.word,
    answer,
    choices: shuffle([answer, ...distractors], random),
    isRetry: false,
  }
}

// 次の問題を選ぶときに必要な「今の状況」
export type PickContext = {
  now: number // 今の時刻
  lastId: string | null // 直前に出した単語
  retries: Retry[] // 再出題の予約
  answeredCount: number // この回で、ここまでに答えた問題数
}

// 次に出題する単語を選ぶ。
//   1. 再出題の予約で、答えた問題数が足りている（＝数問たった）ものを最優先
//   2. なければ、復習の期日が来ている単語（srs.ts の pickNextWord）
export function pickTargetWord(
  words: Word[],
  ctx: PickContext,
  random: Random = Math.random,
): { word: Word; isRetry: boolean } | null {
  for (const retry of ctx.retries) {
    if (retry.dueAt > ctx.answeredCount) continue // まだ早い
    // 直前の単語がすぐ再出題されるのは避ける（単語が1つだけなら仕方ない）
    if (words.length > 1 && retry.wordId === ctx.lastId) continue
    const word = words.find((w) => w.id === retry.wordId)
    if (word) return { word, isRetry: true }
  }
  const word = pickNextWord(words, ctx.now, ctx.lastId, random)
  return word ? { word, isRetry: false } : null
}

// 「次の問題」を作る。単語が足りないなど、作れないときは null。
export function buildNextQuestion(
  words: Word[],
  ctx: PickContext,
  random: Random = Math.random,
): Question | null {
  const picked = pickTargetWord(words, ctx, random)
  if (!picked) return null
  const question = makeQuestion(words, picked.word, random)
  return question ? { ...question, isRetry: picked.isRetry } : null
}

// 間違えた単語を再出題の予約に入れる（すでに予約があれば、予約し直す）
export function queueRetry(retries: Retry[], wordId: string, answeredCount: number): Retry[] {
  return [...removeRetry(retries, wordId), { wordId, dueAt: answeredCount + RETRY_GAP }]
}

// 予約から取り除く
export function removeRetry(retries: Retry[], wordId: string): Retry[] {
  return retries.filter((r) => r.wordId !== wordId)
}

// 答えを記録する。正解なら correct、不正解なら wrong を1増やす。
export function recordAnswer(words: Word[], id: string, isCorrect: boolean): Word[] {
  return words.map((w) =>
    w.id === id
      ? {
          ...w,
          correct: w.correct + (isCorrect ? 1 : 0),
          wrong: w.wrong + (isCorrect ? 0 : 1),
        }
      : w,
  )
}

// 答えを反映した、新しい単語リストを返す。
//   - 正解数・間違い数は、いつでも記録する
//   - レベルと次の出題日は、「再出題」ではない通常の問題のときだけ更新する
//     （間違えた直後の再出題で正解しても、レベルを戻さないため。
//       また、再出題でまた間違えても、レベルをさらに下げない）
export function applyAnswer(
  words: Word[],
  question: Question,
  isCorrect: boolean,
  now: number,
): Word[] {
  const recorded = recordAnswer(words, question.wordId, isCorrect)
  if (question.isRetry) return recorded
  return recorded.map((w) =>
    w.id === question.wordId ? scheduleAfterAnswer(w, isCorrect, now) : w,
  )
}
