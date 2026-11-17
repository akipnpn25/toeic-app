// 「続けるしくみ」のロジック：1日の記録、目標の達成判定、連続日数、カレンダー。
// 日付は "2026-11-16" のような文字列（日付キー）で扱う。端末のローカル時間の日付。

import type { DailyLog } from '../types'

// ---- 日付キーの道具 ----

// 時刻（ミリ秒）→ "2026-11-16"
export function toDateKey(time: number): string {
  const d = new Date(time)
  const m = String(d.getMonth() + 1).padStart(2, '0') // 月は 0 始まりなので +1。padStart で "1" → "01"
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// "2026-11-16" → その日の0時の Date
function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// 日付キーに n 日を足す（引くときは負の数）
export function addDays(key: string, n: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + n) // 月をまたいでも Date が自動で計算してくれる
  return toDateKey(d.getTime())
}

// ---- 記録 ----

// 1問答えたことを記録する。その日の goal（目標）も一緒に残す。
export function recordToLog(
  log: DailyLog,
  time: number,
  isCorrect: boolean,
  goal: number,
): DailyLog {
  const key = toDateKey(time)
  const prev = log[key] ?? { answered: 0, correct: 0 }
  return {
    ...log,
    [key]: {
      answered: prev.answered + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      goal,
    },
  }
}

// その日の目標。今日は「いま設定している目標」、過去の日は「その日に記録した目標」を使う。
// （目標を変えても、過去の達成・未達成は変わらないようにするため）
function goalOn(log: DailyLog, key: string, today: string, currentGoal: number): number {
  if (key === today) return currentGoal
  return log[key]?.goal ?? currentGoal
}

// その日に目標を達成したか
export function isAchieved(log: DailyLog, key: string, today: string, currentGoal: number): boolean {
  const entry = log[key]
  return entry !== undefined && entry.answered >= goalOn(log, key, today, currentGoal)
}

// 今日答えた問題数
export function answeredToday(log: DailyLog, today: string): number {
  return log[today]?.answered ?? 0
}

// 2つの日付キーの間の日数（from から to まで。to のほうが後なら正の数）。
// 夏時間などで1日が23時間・25時間になる日があっても狂わないよう、UTC（世界標準時）の日付で数える。
export function daysBetween(from: string, to: string): number {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

// 今日以前で、いちばん最近に目標を達成した日。一度もなければ null。
export function lastAchievedDay(log: DailyLog, today: string, currentGoal: number): string | null {
  const days = Object.keys(log)
    .filter((key) => key <= today && isAchieved(log, key, today, currentGoal))
    .sort()
  return days.length > 0 ? days[days.length - 1] : null
}

// ---- 連続日数 ----

// 現在の連続日数。
// 今日まだ目標に届いていなくても、昨日までの連続は切れていない（今日がまだ終わっていないため）。
export function currentStreak(log: DailyLog, today: string, currentGoal: number): number {
  let key = isAchieved(log, today, today, currentGoal) ? today : addDays(today, -1)
  let count = 0
  while (isAchieved(log, key, today, currentGoal)) {
    count++
    key = addDays(key, -1)
  }
  return count
}

// 過去最高の連続日数
export function bestStreak(log: DailyLog, today: string, currentGoal: number): number {
  const days = Object.keys(log)
    .filter((key) => isAchieved(log, key, today, currentGoal))
    .sort() // "2026-11-16" の形なら、文字として並べても日付順になる
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const key of days) {
    run = prev !== null && addDays(prev, 1) === key ? run + 1 : 1
    best = Math.max(best, run)
    prev = key
  }
  return best
}

// ---- カレンダー ----

export type CalendarDay = {
  key: string
  day: number // 日（1〜31）
  status: 'achieved' | 'partial' | 'none' // 達成／少しやった／やっていない
  isToday: boolean
  isFuture: boolean
}

// 最近 weeks 週間のカレンダー。月曜はじまりで、今日を含む週が最後の行。
// 戻り値は「週ごとの配列の配列」（weeks 行 × 7 列）。
export function buildCalendar(
  log: DailyLog,
  today: string,
  currentGoal: number,
  weeks = 4,
): CalendarDay[][] {
  const daysSinceMonday = (parseKey(today).getDay() + 6) % 7 // 日曜(0)→6, 月曜(1)→0, …
  const start = addDays(today, -daysSinceMonday - 7 * (weeks - 1))

  const rows: CalendarDay[][] = []
  for (let w = 0; w < weeks; w++) {
    const row: CalendarDay[] = []
    for (let d = 0; d < 7; d++) {
      const key = addDays(start, w * 7 + d)
      let status: CalendarDay['status'] = 'none'
      if (isAchieved(log, key, today, currentGoal)) status = 'achieved'
      else if ((log[key]?.answered ?? 0) > 0) status = 'partial'
      row.push({
        key,
        day: parseKey(key).getDate(),
        status,
        isToday: key === today,
        isFuture: key > today,
      })
    }
    rows.push(row)
  }
  return rows
}
