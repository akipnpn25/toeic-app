import { useEffect, useState } from 'react'
import styles from './App.module.css'
import ProgressPanel from './components/ProgressPanel'
import { recordToLog, toDateKey } from './logic/progress'
import DrillScreen from './screens/DrillScreen'
import AddScreen from './screens/AddScreen'
import ListScreen from './screens/ListScreen'
import { storage } from './storage'
import ClozeScreen from './screens/ClozeScreen'
import type { DailyLog, PatternStats, Settings, Template, Word, WordFamily } from './types'

// タブの種類。この4つ以外の文字は入れられない（TypeScript が止めてくれる）
type Tab = 'drill' | 'cloze' | 'list' | 'add'

// タブ名 → 画面に表示するラベル
const TAB_LABELS: Record<Tab, string> = {
  drill: '単語ドリル',
  cloze: '穴埋め',
  list: '単語一覧',
  add: '追加',
}

// タブを左から並べる順番
const TABS: Tab[] = ['drill', 'cloze', 'list', 'add']

function App() {
  // useState：画面が覚えておく値。tab が今のタブ、setTab で変更する
  const [tab, setTab] = useState<Tab>('drill')

  // 単語リストはアプリ全体で共有するので、いちばん上の App が持つ。
  // useState に関数を渡すと、最初の1回だけ実行される（保存データの読み込みは最初だけでよい）
  const [words, setWords] = useState<Word[]>(() => storage.loadWords())
  const [families, setFamilies] = useState<WordFamily[]>(() => storage.loadFamilies()) // 語の仲間
  const [templates, setTemplates] = useState<Template[]>(() => storage.loadTemplates()) // テンプレート文
  const [patternStats, setPatternStats] = useState<PatternStats>(() => storage.loadPatternStats()) // パターン別の成績
  const [log, setLog] = useState<DailyLog>(() => storage.loadDailyLog()) // 日ごとの記録
  const [settings, setSettings] = useState<Settings>(() => storage.loadSettings())
  // 今日の日付。描画の途中で Date.now() を呼ぶと値が不安定になるので、state に持っておく
  const [today, setToday] = useState(() => toDateKey(Date.now()))

  // アプリを開いたままの日付またぎ対策。
  // iPhone のホーム画面アプリは閉じずに残ることが多いので、画面に戻ってきたときに日付を更新する。
  useEffect(() => {
    function refreshToday() {
      setToday(toDateKey(Date.now()))
    }
    document.addEventListener('visibilitychange', refreshToday)
    // useEffect が返す関数は「後片付け」。画面が消えるときに登録を外す
    return () => document.removeEventListener('visibilitychange', refreshToday)
  }, [])

  // 単語リストを新しくするときは、画面の更新と保存を必ずセットで行う
  function handleChangeWords(next: Word[]) {
    setWords(next)
    storage.saveWords(next)
  }

  function handleChangeFamilies(next: WordFamily[]) {
    setFamilies(next)
    storage.saveFamilies(next)
  }

  function handleChangeTemplates(next: Template[]) {
    setTemplates(next)
    storage.saveTemplates(next)
  }

  function handleChangePatternStats(next: PatternStats) {
    setPatternStats(next)
    storage.savePatternStats(next)
  }

  // 1問答えたときに、今日の記録に足す
  function handleAnswered(isCorrect: boolean) {
    const now = Date.now()
    const next = recordToLog(log, now, isCorrect, settings.dailyGoal)
    setLog(next)
    storage.saveDailyLog(next)
    setToday(toDateKey(now))
  }

  function handleChangeGoal(goal: number) {
    const next = { ...settings, dailyGoal: goal }
    setSettings(next)
    storage.saveSettings(next)
  }

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        {/* 問題を解く画面には、今日の進み具合を上に出す */}
        {(tab === 'drill' || tab === 'cloze') && (
          <ProgressPanel
            log={log}
            today={today}
            goal={settings.dailyGoal}
            onChangeGoal={handleChangeGoal}
          />
        )}

        {/* tab が一致する画面だけを表示する */}
        {tab === 'drill' && (
          <DrillScreen words={words} onChangeWords={handleChangeWords} onAnswered={handleAnswered} />
        )}
        {tab === 'cloze' && (
          <ClozeScreen
            words={words}
            families={families}
            templates={templates}
            stats={patternStats}
            onChangeStats={handleChangePatternStats}
            onAnswered={handleAnswered}
          />
        )}
        {tab === 'list' && <ListScreen words={words} onChangeWords={handleChangeWords} />}
        {tab === 'add' && (
          <AddScreen
            words={words}
            families={families}
            templates={templates}
            onChangeWords={handleChangeWords}
            onChangeFamilies={handleChangeFamilies}
            onChangeTemplates={handleChangeTemplates}
          />
        )}
      </main>

      <nav className={styles.tabBar}>
        {/* TABS の4つ分、同じ形のボタンを作る（map = 配列の1つ1つを別のものに変換する） */}
        {TABS.map((t) => (
          <button
            key={t} // React が「どのボタンか」を見分けるための目印
            className={`${styles.tabButton} ${tab === t ? styles.active : ''}`}
            onClick={() => setTab(t)} // 押したら tab をこのタブに変える
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
