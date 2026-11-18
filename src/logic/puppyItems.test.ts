import { describe, expect, it } from 'vitest'
import { MAX_STAGE } from './puppy'
import { ITEMS, itemsForStage, nextItem, wordsToUnlock } from './puppyItems'
import type { ItemId } from './puppyItems'

const byId = (id: ItemId) => ITEMS.find((i) => i.id === id)!

describe('ITEMS', () => {
  it('14個あり、id は重複しない', () => {
    expect(ITEMS).toHaveLength(14)
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(14)
  })
  it('ステージの小さい順に並んでいて、0〜20 の範囲に収まっている', () => {
    for (let i = 1; i < ITEMS.length; i++) {
      expect(ITEMS[i].stage).toBeGreaterThan(ITEMS[i - 1].stage)
    }
    expect(ITEMS[0].stage).toBe(0)
    expect(ITEMS[ITEMS.length - 1].stage).toBe(MAX_STAGE)
  })
  it('決められた節目：400語で犬小屋、700語で金メダル、900語でトロフィー、1000語で王冠', () => {
    expect(wordsToUnlock(byId('house'))).toBe(400)
    expect(wordsToUnlock(byId('medal'))).toBe(700)
    expect(wordsToUnlock(byId('trophy'))).toBe(900)
    expect(wordsToUnlock(byId('crown'))).toBe(1000)
  })
  it('最初の3つは、ごはん皿・ボール・首輪', () => {
    expect(ITEMS.slice(0, 3).map((i) => i.id)).toEqual(['bowl', 'ball', 'collar'])
  })
})

describe('itemsForStage', () => {
  it('ステージ0では、ごはん皿だけ', () => {
    expect(itemsForStage(0).map((i) => i.id)).toEqual(['bowl'])
  })
  it('ステージが上がるほど増え、持っているものはなくならない', () => {
    for (let s = 1; s <= MAX_STAGE; s++) {
      const prev = itemsForStage(s - 1).map((i) => i.id)
      const now = itemsForStage(s).map((i) => i.id)
      expect(now).toEqual(expect.arrayContaining(prev))
      expect(now.length).toBeGreaterThanOrEqual(prev.length)
    }
  })
  it('最終ステージでは、全部そろう', () => {
    expect(itemsForStage(MAX_STAGE)).toHaveLength(14)
  })
  it('ちょうどそのステージになった時点で、手に入る', () => {
    expect(itemsForStage(7).some((i) => i.id === 'house')).toBe(false)
    expect(itemsForStage(8).some((i) => i.id === 'house')).toBe(true)
  })
})

describe('nextItem', () => {
  it('次に手に入るアイテムを返す（アイテムのないステージをはさんでも、次のものを返す）', () => {
    expect(nextItem(0)?.id).toBe('ball')
    expect(nextItem(6)?.id).toBe('house') // ステージ7にはアイテムがない
    expect(nextItem(7)?.id).toBe('house')
    expect(nextItem(8)?.id).toBe('flowers')
  })
  it('全部そろっていれば null', () => {
    expect(nextItem(MAX_STAGE)).toBeNull()
  })
})
