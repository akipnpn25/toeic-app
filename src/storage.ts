// データの保存・読み込みは、すべてこのファイルを通す。
// 画面のコードは localStorage を直接さわらない。
// → あとで Firebase に変えるときは、このファイルの中身だけ直せばよい。

import { DEFAULT_SETTINGS } from './constants'
import type { DailyLog, PatternStats, Settings, Template, Word, WordFamily } from './types'

// 他のアプリのデータとぶつからないよう、キーに共通の接頭辞をつける
const PREFIX = 'toeic:'

// localStorage から読む。データがない・壊れているときは fallback（初期値）を返す。
// <T> は「どんな型でも受け取れる」という書き方（ジェネリクス）。
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    // JSON が壊れていた／localStorage が使えない場合
    return fallback
  }
}

// localStorage に書く。文字しか保存できないので JSON.stringify で文字列にする。
function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 容量オーバーなどで失敗しても、アプリは止めない
    console.error(`保存に失敗しました: ${key}`)
  }
}

// 画面側が使う窓口。名前を見れば何をするか分かるようにしてある。
export const storage = {
  loadWords: (): Word[] => load<Word[]>('words', []),
  saveWords: (words: Word[]): void => save('words', words),

  loadFamilies: (): WordFamily[] => load<WordFamily[]>('families', []),
  saveFamilies: (families: WordFamily[]): void => save('families', families),

  loadTemplates: (): Template[] => load<Template[]>('templates', []),
  saveTemplates: (templates: Template[]): void => save('templates', templates),

  loadDailyLog: (): DailyLog => load<DailyLog>('dailyLog', {}),
  saveDailyLog: (log: DailyLog): void => save('dailyLog', log),

  // 品詞問題の、パターンごとの成績
  loadPatternStats: (): PatternStats => load<PatternStats>('patternStats', {}),
  savePatternStats: (stats: PatternStats): void => save('patternStats', stats),

  // 設定：保存されていない項目は初期値で補う（あとで設定項目を増やしても壊れない）
  loadSettings: (): Settings => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>('settings', {}) }),
  saveSettings: (settings: Settings): void => save('settings', settings),
}
