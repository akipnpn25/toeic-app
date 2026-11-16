import { useState } from 'react'
import { POS_LABELS, POS_LIST } from '../constants'
import { deleteWord, filterWords, splitMeanings, updateWord } from '../logic/words'
import type { Pos, Word } from '../types'
import shared from '../shared.module.css'
import styles from './ListScreen.module.css'

type Props = {
  words: Word[]
  onChangeWords: (words: Word[]) => void
}

export default function ListScreen({ words, onChangeWords }: Props) {
  const [query, setQuery] = useState('') // 検索語
  const [editingId, setEditingId] = useState<string | null>(null) // 編集中の単語の id（なければ null）
  const [editWord, setEditWord] = useState('')
  const [editMeanings, setEditMeanings] = useState('')
  const [editPos, setEditPos] = useState<Pos | ''>('')
  const [error, setError] = useState('')

  // 検索で絞り込み、新しく追加した順（逆順）に並べる
  const visible = filterWords(words, query).slice().reverse()

  function startEdit(w: Word) {
    setEditingId(w.id)
    setEditWord(w.word)
    setEditMeanings(w.meanings.join('、'))
    setEditPos(w.pos ?? '') // ?? は「左が undefined なら右を使う」
    setError('')
  }

  function saveEdit() {
    if (editingId === null) return
    const result = updateWord(words, editingId, {
      word: editWord,
      meanings: splitMeanings(editMeanings),
      pos: editPos === '' ? undefined : editPos,
    })
    if (result.error === 'empty') {
      setError('英単語と意味の両方を入力してください')
      return
    }
    if (result.error === 'duplicate') {
      setError('同じ英単語がすでに登録されています')
      return
    }
    onChangeWords(result.words)
    setEditingId(null)
  }

  function handleDelete(w: Word) {
    // confirm は「OK / キャンセル」の確認ダイアログを出す
    if (window.confirm(`「${w.word}」を削除しますか？`)) {
      onChangeWords(deleteWord(words, w.id))
    }
  }

  return (
    <div>
      <h2 className={shared.heading}>単語一覧（{words.length}語）</h2>

      <input
        className={shared.input}
        type="search"
        placeholder="英単語か意味で検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
      />

      {words.length === 0 && <p className={shared.muted}>まだ単語がありません。「追加」タブから登録しましょう。</p>}
      {words.length > 0 && visible.length === 0 && <p className={shared.muted}>見つかりませんでした。</p>}

      <ul className={styles.list}>
        {visible.map((w) => (
          <li key={w.id} className={styles.item}>
            {editingId === w.id ? (
              // 編集中の表示
              <div className={shared.field}>
                <input className={shared.input} value={editWord} onChange={(e) => setEditWord(e.target.value)} />
                <input
                  className={shared.input}
                  value={editMeanings}
                  onChange={(e) => setEditMeanings(e.target.value)}
                  placeholder="意味（「、」区切り）"
                />
                <select className={shared.select} value={editPos} onChange={(e) => setEditPos(e.target.value as Pos | '')}>
                  <option value="">品詞（任意）</option>
                  {POS_LIST.map((p) => (
                    <option key={p} value={p}>
                      {POS_LABELS[p]}
                    </option>
                  ))}
                </select>
                {error !== '' && <p className={`${shared.error} ${shared.muted}`}>{error}</p>}
                <div className={styles.actions}>
                  <button className={shared.button} onClick={saveEdit}>保存</button>
                  <button className={shared.buttonSecondary} onClick={() => setEditingId(null)}>キャンセル</button>
                </div>
              </div>
            ) : (
              // 通常の表示
              <>
                <div className={styles.word}>
                  {w.word}
                  {w.pos && <span className={styles.pos}>{POS_LABELS[w.pos]}</span>}
                </div>
                <div>{w.meanings.join('、')}</div>
                <div className={shared.muted}>
                  正解 {w.correct}・間違い {w.wrong}
                </div>
                <div className={styles.actions}>
                  <button className={shared.buttonSecondary} onClick={() => startEdit(w)}>編集</button>
                  <button className={shared.buttonDanger} onClick={() => handleDelete(w)}>削除</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
