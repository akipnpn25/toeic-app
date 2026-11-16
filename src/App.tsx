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

// タブを左から並べる順番
const TABS: Tab[] = ['drill', 'cloze', 'list', 'add']

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
