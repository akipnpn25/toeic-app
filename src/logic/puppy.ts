// 子犬の育成のロジック（描画は canvas/drawPuppy.ts）。
//   - 育ち具合（ステージ）：定着した単語の数で決まる
//   - 機嫌：今日の目標を達成したか（ごはんをもらったか）で決まる

import type { DailyLog, Word } from '../types'
import { daysBetween, isAchieved, lastAchievedDay } from './progress'
import { MASTERED_LEVEL } from './srs'

// ---- 育ち具合 ----

export const WORDS_PER_STAGE = 50 // 定着した単語が50語増えるごとに1ステージ
export const MAX_STAGE = 20 // 最終ステージ（1000語）

// 定着した単語（レベルが MASTERED_LEVEL = 3 以上）の数
export function masteredCount(words: Word[]): number {
  return words.filter((w) => w.level >= MASTERED_LEVEL).length
}

// ステージ。0〜49語は 0（生まれたて）、50語で 1、…、1000語以上で 20。
export function stageOf(mastered: number): number {
  return Math.min(MAX_STAGE, Math.max(0, Math.floor(mastered / WORDS_PER_STAGE)))
}

export type StageProgress = {
  stage: number
  isMax: boolean // 最終ステージか
  wordsIntoStage: number // 今のステージに入ってから増えた語数（0〜49）
  remaining: number // 次のステージまであと何語（最終ステージなら 0）
  ratio: number // 次のステージまでの進み具合（0〜1。最終ステージなら 1）
}

export function stageProgress(mastered: number): StageProgress {
  const stage = stageOf(mastered)
  if (stage >= MAX_STAGE) {
    return { stage, isMax: true, wordsIntoStage: 0, remaining: 0, ratio: 1 }
  }
  const into = mastered - stage * WORDS_PER_STAGE
  return {
    stage,
    isMax: false,
    wordsIntoStage: into,
    remaining: WORDS_PER_STAGE - into,
    ratio: into / WORDS_PER_STAGE,
  }
}

// ---- 機嫌 ----

// fed：今日の目標を達成して、ごはんをもらった
// hungry：まだごはんをもらっていない
// sleeping：目標を達成しない日が続いて、寝てしまった（いなくなりはしない）
export type Mood = 'fed' | 'hungry' | 'sleeping'

// 最後に目標を達成してから、この日数がたつと寝てしまう。
// 3日 ＝ 達成した日の翌日・翌々日の2日間、続けて達成しなかった（2日あいた）あとの朝から。
export const SLEEP_AFTER_DAYS = 3

export function puppyMood(log: DailyLog, today: string, currentGoal: number): Mood {
  if (isAchieved(log, today, today, currentGoal)) return 'fed'

  const last = lastAchievedDay(log, today, currentGoal)
  // 一度も達成していない（飼い始め）なら、寝かせない
  if (last === null) return 'hungry'
  return daysBetween(last, today) >= SLEEP_AFTER_DAYS ? 'sleeping' : 'hungry'
}

// 機嫌に合わせた、子犬のひとこと
export function moodMessage(mood: Mood, name: string): string {
  switch (mood) {
    case 'fed':
      return `${name}はごはんをもらって、ごきげん！`
    case 'hungry':
      return `${name}はおなかがすいています。今日の目標を達成すると、ごはんがもらえます`
    case 'sleeping':
      return `${name}はぐっすり寝ています…。目標を達成すると起きてくれます`
  }
}
