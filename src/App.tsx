import { useState } from 'react'
import styles from './App.module.css'

// タブの種類。この4つ以外の文字は入れられない（TypeScript が止めてくれる）
type Tab = 'drill' | 'cloze' | 'list' | 'add'

// タブ名 → 画面に表示するラベル
const TAB_LABELS: Record<Tab, string> = {
  drill: '単語ドリル',
  cloze: '穴埋め',
  list: '単語一覧',
  add: '追加',
}

function App() {
  // useState：画面が覚えておく値。tab が今のタブ、setTab で変更する
  const [tab, setTab] = useState<Tab>('drill')

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <h1>TOEIC 600</h1>
        <p>いまのタブ：{TAB_LABELS[tab]}</p>
      </main>

      <nav className={styles.tabBar}>
        {/* 見本：1つ目のボタン。押すと setTab('drill') で tab が 'drill' に変わる */}
        <button
          className={`${styles.tabButton} ${tab === 'drill' ? styles.active : ''}`}
          onClick={() => setTab('drill')}
        >
          {TAB_LABELS.drill}
        </button>

        {/* TODO(あなたの番): 見本をまねして、残り3つ（cloze / list / add）を書いてください */}
      </nav>
    </div>
  )
}

export default App
