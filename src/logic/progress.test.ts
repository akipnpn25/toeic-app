import { describe, expect, it } from 'vitest'
import type { DailyLog } from '../types'
import {
  addDays,
  answeredToday,
  bestStreak,
  buildCalendar,
  currentStreak,
  daysBetween,
  isAchieved,
  lastAchievedDay,
  recordToLog,
  toDateKey,
} from './progress'

const TODAY = '2026-11-16' // 月曜日
const GOAL = 10

// その日に n 問答えた記録を作る（goal は GOAL で記録）
function log(entries: Record<string, number>, goal = GOAL): DailyLog {
  const result: DailyLog = {}
  for (const [key, n] of Object.entries(entries)) result[key] = { answered: n, correct: n, goal }
  return result
}

describe('日付キー', () => {
  it('時刻を YYYY-MM-DD にする（月・日は0埋め）', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05')
    expect(toDateKey(new Date(2026, 10, 16, 0, 0).getTime())).toBe('2026-11-16')
  })
  it('日数を足し引きできる（月・年をまたぐ）', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('recordToLog', () => {
  const t = new Date(2026, 10, 16, 12, 0).getTime()
  it('その日の問題数・正解数を増やし、目標も記録する', () => {
    let l: DailyLog = {}
    l = recordToLog(l, t, true, 20)
    l = recordToLog(l, t, false, 20)
    expect(l['2026-11-16']).toEqual({ answered: 2, correct: 1, goal: 20 })
  })
  it('元の記録は書き換えず、他の日はそのまま', () => {
    const before = log({ '2026-11-15': 3 })
    const after = recordToLog(before, t, true, GOAL)
    expect(before['2026-11-16']).toBeUndefined()
    expect(after['2026-11-15']).toEqual(before['2026-11-15'])
  })
})

describe('isAchieved / answeredToday', () => {
  it('目標ちょうどで達成', () => {
    const l = log({ '2026-11-15': 10, '2026-11-14': 9 })
    expect(isAchieved(l, '2026-11-15', TODAY, GOAL)).toBe(true)
    expect(isAchieved(l, '2026-11-14', TODAY, GOAL)).toBe(false)
    expect(isAchieved(l, '2026-11-13', TODAY, GOAL)).toBe(false) // 記録なし
  })
  it('過去の日は、その日に記録した目標で判定する（今の目標を変えても変わらない）', () => {
    const l = log({ '2026-11-15': 10 }) // 当日の目標は10
    expect(isAchieved(l, '2026-11-15', TODAY, 50)).toBe(true)
  })
  it('今日は、いまの目標で判定する', () => {
    const l = log({ [TODAY]: 10 }, 10)
    expect(isAchieved(l, TODAY, TODAY, 10)).toBe(true)
    expect(isAchieved(l, TODAY, TODAY, 20)).toBe(false) // 目標を上げたら未達成に戻る
  })
  it('今日の問題数', () => {
    expect(answeredToday(log({ [TODAY]: 7 }), TODAY)).toBe(7)
    expect(answeredToday({}, TODAY)).toBe(0)
  })
})

describe('daysBetween / lastAchievedDay', () => {
  it('日数を数える（月・年をまたぐ。同じ日は0）', () => {
    expect(daysBetween('2026-11-16', '2026-11-16')).toBe(0)
    expect(daysBetween('2026-11-16', '2026-11-19')).toBe(3)
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3)
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
    expect(daysBetween('2026-03-01', '2026-02-28')).toBe(-1)
  })
  it('夏時間の切り替えがある日をまたいでも、1日は1日', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2) // 米国の夏時間開始（3/8）をまたぐ
  })
  it('いちばん最近に達成した日を返す（今日より後の記録は無視。なければ null）', () => {
    const l = log({ '2026-11-10': 10, '2026-11-14': 10, '2026-11-15': 3, '2026-11-20': 10 })
    expect(lastAchievedDay(l, '2026-11-16', GOAL)).toBe('2026-11-14')
    expect(lastAchievedDay({}, TODAY, GOAL)).toBeNull()
    expect(lastAchievedDay(log({ '2026-11-15': 3 }), TODAY, GOAL)).toBeNull()
  })
})

describe('currentStreak', () => {
  it('記録がなければ 0', () => {
    expect(currentStreak({}, TODAY, GOAL)).toBe(0)
  })
  it('今日を含めて連続日数を数える', () => {
    const l = log({ [TODAY]: 10, '2026-11-15': 12, '2026-11-14': 10 })
    expect(currentStreak(l, TODAY, GOAL)).toBe(3)
  })
  it('今日がまだ未達成でも、昨日までの連続は切れない', () => {
    const l = log({ [TODAY]: 3, '2026-11-15': 10, '2026-11-14': 10 })
    expect(currentStreak(l, TODAY, GOAL)).toBe(2)
  })
  it('昨日が未達成なら、連続は切れる', () => {
    const l = log({ '2026-11-14': 10, '2026-11-13': 10 }) // 昨日(15日)なし、今日もなし
    expect(currentStreak(l, TODAY, GOAL)).toBe(0)
  })
  it('途中で1日抜けたら、そこまで', () => {
    const l = log({ [TODAY]: 10, '2026-11-15': 10, '2026-11-13': 10 })
    expect(currentStreak(l, TODAY, GOAL)).toBe(2)
  })
  it('月をまたいでも数えられる', () => {
    const l = log({ '2026-11-01': 10, '2026-10-31': 10, '2026-10-30': 10 })
    expect(currentStreak(l, '2026-11-01', GOAL)).toBe(3)
  })
})

describe('bestStreak', () => {
  it('記録がなければ 0', () => {
    expect(bestStreak({}, TODAY, GOAL)).toBe(0)
  })
  it('過去のいちばん長い連続を返す', () => {
    const l = log({
      '2026-10-01': 10, '2026-10-02': 10, '2026-10-03': 10, '2026-10-04': 10, // 4日連続
      '2026-10-10': 10, '2026-10-11': 10, // 2日連続
      [TODAY]: 10, // 1日
    })
    expect(bestStreak(l, TODAY, GOAL)).toBe(4)
  })
  it('未達成の日は数えない', () => {
    const l = log({ '2026-10-01': 10, '2026-10-02': 5, '2026-10-03': 10 })
    expect(bestStreak(l, TODAY, GOAL)).toBe(1)
  })
})

describe('buildCalendar', () => {
  const rows = buildCalendar(log({ [TODAY]: 10, '2026-11-15': 3 }), TODAY, GOAL)

  it('4週間 × 7日で、今日を含む週が最後の行', () => {
    expect(rows).toHaveLength(4)
    expect(rows.every((r) => r.length === 7)).toBe(true)
    expect(rows[3].some((d) => d.isToday)).toBe(true)
  })
  it('月曜はじまり（今日が月曜なら、最後の行の先頭が今日）', () => {
    expect(rows[3][0].key).toBe(TODAY)
    expect(rows[0][0].key).toBe('2026-10-26') // 3週間前の月曜
  })
  it('今日より先の日は isFuture', () => {
    expect(rows[3][0].isFuture).toBe(false)
    expect(rows[3][1].isFuture).toBe(true)
  })
  it('達成・少しやった・やっていない を区別する', () => {
    const day = (key: string) => rows.flat().find((d) => d.key === key)!
    expect(day(TODAY).status).toBe('achieved')
    expect(day('2026-11-15').status).toBe('partial')
    expect(day('2026-11-14').status).toBe('none')
  })
  it('日曜が今日のとき、最後の行の末尾が今日になる', () => {
    const r = buildCalendar({}, '2026-11-22', GOAL)
    expect(r[3][6].key).toBe('2026-11-22')
    expect(r[3][6].isToday).toBe(true)
  })
})
