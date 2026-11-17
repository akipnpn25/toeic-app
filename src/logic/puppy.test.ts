import { describe, expect, it } from 'vitest'
import type { DailyLog, Word } from '../types'
import {
  MAX_STAGE,
  SLEEP_AFTER_DAYS,
  masteredCount,
  moodMessage,
  puppyMood,
  stageOf,
  stageProgress,
} from './puppy'

function word(level: number): Word {
  return { id: String(Math.random()), word: 'x', meanings: ['y'], level, correct: 0, wrong: 0, nextReview: 0, addedAt: 0 }
}

describe('masteredCount', () => {
  it('レベル3以上の単語だけを数える', () => {
    expect(masteredCount([word(0), word(2), word(3), word(4), word(5)])).toBe(3)
    expect(masteredCount([])).toBe(0)
  })
})

describe('stageOf', () => {
  it('50語ごとに1ステージ（0〜49語は 0）', () => {
    expect(stageOf(0)).toBe(0)
    expect(stageOf(49)).toBe(0)
    expect(stageOf(50)).toBe(1)
    expect(stageOf(99)).toBe(1)
    expect(stageOf(100)).toBe(2)
  })
  it('1000語で最終ステージ（20）。それ以上は増えない', () => {
    expect(stageOf(950)).toBe(19)
    expect(stageOf(1000)).toBe(MAX_STAGE)
    expect(stageOf(5000)).toBe(MAX_STAGE)
  })
  it('アイテムが増える節目：400語 → 8、700語 → 14、900語 → 18', () => {
    expect([stageOf(400), stageOf(700), stageOf(900)]).toEqual([8, 14, 18])
  })
})

describe('stageProgress', () => {
  it('次のステージまでの進み具合を返す', () => {
    expect(stageProgress(0)).toEqual({ stage: 0, isMax: false, wordsIntoStage: 0, remaining: 50, ratio: 0 })
    expect(stageProgress(75)).toEqual({ stage: 1, isMax: false, wordsIntoStage: 25, remaining: 25, ratio: 0.5 })
    expect(stageProgress(99).remaining).toBe(1)
  })
  it('最終ステージでは、あと0語・進み具合は 100%', () => {
    expect(stageProgress(1000)).toEqual({ stage: 20, isMax: true, wordsIntoStage: 0, remaining: 0, ratio: 1 })
  })
})

describe('puppyMood', () => {
  const TODAY = '2026-11-20'
  const GOAL = 10
  const log = (entries: Record<string, number>): DailyLog =>
    Object.fromEntries(Object.entries(entries).map(([k, n]) => [k, { answered: n, correct: n, goal: GOAL }]))

  it('今日の目標を達成していれば、ごはんをもらってごきげん', () => {
    expect(puppyMood(log({ [TODAY]: 10 }), TODAY, GOAL)).toBe('fed')
  })
  it('今日はまだでも、昨日までに達成していれば、おなかがすいているだけ', () => {
    expect(puppyMood(log({ '2026-11-19': 10 }), TODAY, GOAL)).toBe('hungry')
    expect(puppyMood(log({ '2026-11-18': 10 }), TODAY, GOAL)).toBe('hungry') // 2日前
  })
  it('目標に届かない日が続いて、最後の達成から3日たつと寝てしまう', () => {
    expect(SLEEP_AFTER_DAYS).toBe(3)
    expect(puppyMood(log({ '2026-11-17': 10 }), TODAY, GOAL)).toBe('sleeping') // 3日前
    expect(puppyMood(log({ '2026-11-01': 10 }), TODAY, GOAL)).toBe('sleeping')
  })
  it('寝ていても、目標を達成すれば起きる', () => {
    expect(puppyMood(log({ '2026-11-10': 10, [TODAY]: 10 }), TODAY, GOAL)).toBe('fed')
  })
  it('少しやっただけ（未達成）では、起きない', () => {
    expect(puppyMood(log({ '2026-11-10': 10, [TODAY]: 3 }), TODAY, GOAL)).toBe('sleeping')
  })
  it('一度も達成していない飼い始めは、寝かせない', () => {
    expect(puppyMood({}, TODAY, GOAL)).toBe('hungry')
    expect(puppyMood(log({ '2026-11-01': 3 }), TODAY, GOAL)).toBe('hungry')
  })
  it('月をまたいでも日数を正しく数える', () => {
    expect(puppyMood(log({ '2026-10-31': 10 }), '2026-11-02', GOAL)).toBe('hungry') // 2日前
    expect(puppyMood(log({ '2026-10-31': 10 }), '2026-11-03', GOAL)).toBe('sleeping') // 3日前
  })
})

describe('moodMessage', () => {
  it('名前を入れた、機嫌ごとのメッセージ', () => {
    expect(moodMessage('fed', 'ポチ')).toContain('ポチ')
    expect(moodMessage('hungry', 'ポチ')).toContain('おなか')
    expect(moodMessage('sleeping', 'ポチ')).toContain('寝て')
  })
})
