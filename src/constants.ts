import type { Pos, Settings } from './types'

// 1日の目標問題数の選択肢
export const DAILY_GOAL_OPTIONS = [10, 20, 30, 50]

// 設定の初期値
export const DEFAULT_SETTINGS: Settings = { dailyGoal: 20 }

// 品詞の日本語名
export const POS_LABELS: Record<Pos, string> = {
  noun: '名詞',
  verb: '動詞',
  adj: '形容詞',
  adv: '副詞',
}

// 選択肢として並べる順番
export const POS_LIST: Pos[] = ['noun', 'verb', 'adj', 'adv']
