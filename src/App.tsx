import { useState } from 'react'
import styles from './App.module.css'
import AddScreen from './screens/AddScreen'
import DrillScreen from './screens/DrillScreen'
import ListScreen from './screens/ListScreen'
import { storage } from './storage'
import type { Word } from './types'

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

  // 単語リストを新しくするときは、画面の更新と保存を必ずセットで行う
  function handleChangeWords(next: Word[]) {
    setWords(next)
    storage.saveWords(next)
  }

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        {/* tab が一致する画面だけを表示する */}
        {tab === 'drill' && <DrillScreen words={words} onChangeWords={handleChangeWords} />}
        {tab === 'cloze' && <p>穴埋めはステップ8・9で作ります。</p>}
        {tab === 'list' && <ListScreen words={words} onChangeWords={handleChangeWords} />}
        {tab === 'add' && <AddScreen words={words} onChangeWords={handleChangeWords} />}
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
