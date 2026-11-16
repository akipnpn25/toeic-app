// 間隔反復（Spaced Repetition）のロジック。
// 「覚えた単語ほど、次に出すまでの間隔を空ける」ことで、効率よく定着させる。
//
// ルール
//   正解：レベルが1上がり、次の出題は 1日後 → 3日後 → 7日後 → 14日後 → 30日後
//   不正解：レベルが2下がり（0より下にはならない）、次の出題は翌日

import type { Word } from '../types'

// レベル1〜5に対応する、次の出題までの日数
export const INTERVAL_DAYS = [1, 3, 7, 14, 30]

// いちばん高いレベル（5になったら、以降は30日おきのまま）
export const MAX_LEVEL = INTERVAL_DAYS.length

// 「定着した」とみなすレベル（子犬の育成で使う）
export const MASTERED_LEVEL = 3

// その日の0時0分（ミリ秒）を返す
export function startOfDay(time: number): number {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// 「days 日後の0時」を返す。
// 夜に答えても、日付が変われば出題されるようにするため、時刻ではなく日付で数える。
export function nextReviewTime(now: number, days: number): number {
  const d = new Date(startOfDay(now))
  d.setDate(d.getDate() + days)
  return d.getTime()
}

// 答えたあとの、レベルと次の出題日を計算する（正解数・間違い数はここでは変えない）
export function scheduleAfterAnswer(word: Word, isCorrect: boolean, now: number): Word {
  if (isCorrect) {
    const level = Math.min(word.level + 1, MAX_LEVEL)
    // レベル1なら INTERVAL_DAYS[0]（1日後）、レベル2なら [1]（3日後）…
    return { ...word, level, nextReview: nextReviewTime(now, INTERVAL_DAYS[level - 1]) }
  }
  return {
    ...word,
    level: Math.max(word.level - 2, 0),
    nextReview: nextReviewTime(now, 1),
  }
}

// 出題の時期が来ているか
export function isDue(word: Word, now: number): boolean {
  return word.nextReview <= now
}

// 出題の時期が来ている単語の数
export function countDue(words: Word[], now: number): number {
  return words.filter((w) => isDue(w, now)).length
}

// 次に出す単語を選ぶ。
//   1. 時期が来ている単語の中からランダムに1つ
//   2. 1つもなければ、いちばん出題日が近い単語（先取り練習）
// 直前に出した単語は、他に単語があるなら避ける。
export function pickNextWord(
  words: Word[],
  now: number,
  lastId: string | null,
  random: () => number = Math.random,
): Word | null {
  const pool = words.length > 1 ? words.filter((w) => w.id !== lastId) : words
  if (pool.length === 0) return null

  const due = pool.filter((w) => isDue(w, now))
  if (due.length > 0) return due[Math.floor(random() * due.length)]

  // reduce：配列を1つの値にまとめる。ここでは「nextReview が最小の単語」を探している
  return pool.reduce((earliest, w) => (w.nextReview < earliest.nextReview ? w : earliest))
}
