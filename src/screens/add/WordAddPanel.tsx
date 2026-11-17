import { useState } from 'react'
import { POS_LABELS, POS_LIST } from '../../constants'
import { addWords, parseBulk, splitMeanings } from '../../logic/words'
import type { Pos, Word } from '../../types'
import shared from '../../shared.module.css'

type Props = {
  words: Word[] // 今ある単語
  onChangeWords: (words: Word[]) => void // 単語リストを新しくする（App が受け取って保存する）
}

// 追加結果をメッセージにする。例："3語を追加しました\n1語は登録済みのため飛ばしました"
function summarize(added: number, duplicates: number, invalid: number): string {
  const lines = [`${added}語を追加しました`]
  if (duplicates > 0) lines.push(`${duplicates}語は登録済みのため飛ばしました`)
  if (invalid > 0) lines.push(`${invalid}行は「英単語 意味」の形で読み取れませんでした`)
  return lines.join('\n')
}

export default function WordAddPanel({ words, onChangeWords }: Props) {
  // 1語ずつ追加するフォームの入力値
  const [word, setWord] = useState('')
  const [meanings, setMeanings] = useState('')
  const [pos, setPos] = useState<Pos | ''>('') // '' は「未選択」
  // まとめて追加する欄の入力値
  const [bulk, setBulk] = useState('')
  // 画面に出すメッセージ
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  function show(text: string, error = false) {
    setMessage(text)
    setIsError(error)
  }

  function handleAddOne() {
    const meaningList = splitMeanings(meanings)
    if (word.trim() === '' || meaningList.length === 0) {
      show('英単語と意味の両方を入力してください', true)
      return
    }
    const result = addWords(words, [
      { word, meanings: meaningList, pos: pos === '' ? undefined : pos },
    ])
    onChangeWords(result.words)
    if (result.added === 0) {
      show('その単語はすでに登録されています', true)
      return
    }
    show(`「${word.trim()}」を追加しました`)
    setWord('')
    setMeanings('')
  }

  function handleAddBulk() {
    const { entries, invalid } = parseBulk(bulk)
    if (entries.length === 0) {
      show('追加できる行がありません。「英単語 意味」を1行ずつ入力してください', true)
      return
    }
    const result = addWords(words, entries)
    onChangeWords(result.words)
    show(summarize(result.added, result.duplicates, invalid.length))
    setBulk('')
  }

  return (
    <div>
      <h2 className={shared.heading}>単語を追加</h2>

      <div className={shared.field}>
        <input
          className={shared.input}
          placeholder="英単語（例：decide）"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <input
          className={shared.input}
          placeholder="意味（複数は「、」で区切る）"
          value={meanings}
          onChange={(e) => setMeanings(e.target.value)}
        />
        <select
          className={shared.select}
          value={pos}
          onChange={(e) => setPos(e.target.value as Pos | '')}
        >
          <option value="">品詞（任意）</option>
          {POS_LIST.map((p) => (
            <option key={p} value={p}>
              {POS_LABELS[p]}
            </option>
          ))}
        </select>
        <button className={shared.button} onClick={handleAddOne}>
          追加
        </button>
      </div>

      <h3 className={shared.subheading}>まとめて追加</h3>
      <div className={shared.field}>
        <textarea
          className={shared.textarea}
          placeholder={'1行に1語。「英単語 意味」の形で貼り付け\ndecide 決める、決心する\ncontract 契約、契約書'}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <button className={shared.button} onClick={handleAddBulk}>
          まとめて追加
        </button>
      </div>

      {message !== '' && (
        <p className={`${shared.message} ${isError ? shared.error : ''}`}>{message}</p>
      )}
    </div>
  )
}
