import { beforeEach, describe, expect, it } from 'vitest'
import { storage } from './storage'
import type { Word } from './types'

// テスト用の単語を作る小さな関数
function makeWord(overrides: Partial<Word> = {}): Word {
  return {
    id: 'w1',
    word: 'decide',
    meanings: ['決める', '決心する'],
    level: 0,
    correct: 0,
    wrong: 0,
    nextReview: 0,
    addedAt: 1000,
    ...overrides, // 渡された値で上書きできる
  }
}

describe('storage', () => {
  // 各テストの前に localStorage を空にする（テスト同士が影響しないように）
  beforeEach(() => {
    localStorage.clear()
  })

  it('何も保存していないときは空の配列を返す', () => {
    expect(storage.loadWords()).toEqual([])
  })

  it('単語を保存して、そのまま読み出せる', () => {
    const words = [makeWord(), makeWord({ id: 'w2', word: 'contract' })]
    storage.saveWords(words)
    expect(storage.loadWords()).toEqual(words)
  })

  it('保存を上書きすると、新しい内容になる', () => {
    storage.saveWords([makeWord()])
    storage.saveWords([makeWord({ id: 'w9', word: 'invoice' })])
    expect(storage.loadWords()).toHaveLength(1)
    expect(storage.loadWords()[0].word).toBe('invoice')
  })

  it('データが壊れていても、落ちずに初期値を返す', () => {
    localStorage.setItem('toeic:words', '{これはJSONではない')
    expect(storage.loadWords()).toEqual([])
  })

  it('日ごとの記録は、何もなければ空のオブジェクト', () => {
    expect(storage.loadDailyLog()).toEqual({})
  })

  it('語の仲間・テンプレート・パターン別の成績も、保存して読み出せる', () => {
    expect(storage.loadFamilies()).toEqual([])
    expect(storage.loadTemplates()).toEqual([])
    expect(storage.loadPatternStats()).toEqual({})

    const families = [{ id: 'f', verb: 'decide', noun: 'decision', meanings: {} }]
    storage.saveFamilies(families)
    expect(storage.loadFamilies()).toEqual(families)

    const stats = { noun_det: { answered: 3, correct: 2 } }
    storage.savePatternStats(stats)
    expect(storage.loadPatternStats()).toEqual(stats)
  })

  it('設定は、何もなければ初期値（目標20問）', () => {
    expect(storage.loadSettings()).toEqual({ dailyGoal: 20, puppyName: 'こいぬ' })
  })

  it('設定を保存して読み出せる', () => {
    storage.saveSettings({ dailyGoal: 50, puppyName: 'ポチ' })
    expect(storage.loadSettings()).toEqual({ dailyGoal: 50, puppyName: 'ポチ' })
  })

  it('設定の項目が欠けていても、初期値で補う', () => {
    localStorage.setItem('toeic:settings', '{"dailyGoal":30}') // 昔の保存データ（名前の項目がない）
    expect(storage.loadSettings()).toEqual({ dailyGoal: 30, puppyName: 'こいぬ' })
  })

  it('日ごとの記録を保存して読み出せる', () => {
    const log = { '2026-11-16': { answered: 10, correct: 7 } }
    storage.saveDailyLog(log)
    expect(storage.loadDailyLog()).toEqual(log)
  })
})
