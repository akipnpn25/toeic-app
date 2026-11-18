// 子犬のアイテム。ステージが上がると、少しずつ増えていく。
// （ステージは「定着した単語の数 ÷ 50」。logic/puppy.ts）

import { WORDS_PER_STAGE } from './puppy'

export type ItemId =
  | 'bowl' // ごはん皿
  | 'ball' // ボール
  | 'collar' // 首輪
  | 'bone' // 骨のおもちゃ
  | 'cushion' // クッション
  | 'ribbon' // リボン
  | 'bandana' // バンダナ
  | 'house' // 犬小屋
  | 'flowers' // お花
  | 'frisbee' // フリスビー
  | 'medal' // 金メダル
  | 'balloon' // 風船
  | 'trophy' // トロフィー
  | 'crown' // 王冠

export type ItemInfo = {
  id: ItemId
  label: string
  stage: number // このステージになると手に入る
}

// ステージの小さい順に並べる。
// 犬小屋は400語（ステージ8）、金メダルは700語（14）、トロフィーは900語（18）、王冠は1000語（20）。
// ごはん皿は「ごはん」の仕組みに必要なので、最初（ステージ0）から置いてある。
export const ITEMS: ItemInfo[] = [
  { id: 'bowl', label: 'ごはん皿', stage: 0 },
  { id: 'ball', label: 'ボール', stage: 1 },
  { id: 'collar', label: '首輪', stage: 2 },
  { id: 'bone', label: '骨のおもちゃ', stage: 3 },
  { id: 'cushion', label: 'クッション', stage: 4 },
  { id: 'ribbon', label: 'リボン', stage: 5 },
  { id: 'bandana', label: 'バンダナ', stage: 6 },
  { id: 'house', label: '犬小屋', stage: 8 },
  { id: 'flowers', label: 'お花', stage: 10 },
  { id: 'frisbee', label: 'フリスビー', stage: 12 },
  { id: 'medal', label: '金メダル', stage: 14 },
  { id: 'balloon', label: '風船', stage: 16 },
  { id: 'trophy', label: 'トロフィー', stage: 18 },
  { id: 'crown', label: '王冠', stage: 20 },
]

// このステージで持っているアイテム（ステージが上がっても、持っているものはなくならない）
export function itemsForStage(stage: number): ItemInfo[] {
  return ITEMS.filter((item) => item.stage <= stage)
}

// 次に手に入るアイテム。全部そろっていれば null。
export function nextItem(stage: number): ItemInfo | null {
  return ITEMS.find((item) => item.stage > stage) ?? null
}

// そのアイテムが手に入る、定着した単語の数
export function wordsToUnlock(item: ItemInfo): number {
  return item.stage * WORDS_PER_STAGE
}
