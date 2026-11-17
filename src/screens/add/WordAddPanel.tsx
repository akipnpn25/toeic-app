import { useState } from 'react'
import { POS_LABELS, POS_LIST } from '../../constants'
import { STARTER_WORDS } from '../../data/starterWords'
import { parseExamples, validateExamples } from '../../logic/vocab'
import { addMissingExamples, addWords, parseBulk, splitMeanings } from '../../logic/words'
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
  const [examples, setExamples] = useState('') // 例文（1行に1文）
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
    // 例文には、英単語がそのままの形で入っている必要がある（語彙問題で空所にするため）
    const exampleList = parseExamples(examples)
    const exampleError = validateExamples(word, exampleList)
    if (exampleError) {
      show(exampleError, true)
      return
    }
    const result = addWords(words, [
      {
        word,
        meanings: meaningList,
        pos: pos === '' ? undefined : pos,
        examples: exampleList.length > 0 ? exampleList : undefined,
      },
    ])
    onChangeWords(result.words)
    if (result.added === 0) {
      show('その単語はすでに登録されています', true)
      return
    }
    show(`「${word.trim()}」を追加しました`)
    setWord('')
    setMeanings('')
    setExamples('')
  }

  function handleSamples() {
    // 新しい単語を追加し、自分で先に登録していた単語には（例文がなければ）サンプルの例文を足す
    const added = addWords(words, STARTER_WORDS)
    const merged = addMissingExamples(added.words, STARTER_WORDS)
    onChangeWords(merged.words)

    const lines: string[] = []
    if (added.added > 0) lines.push(`サンプル単語を${added.added}語追加しました`)
    if (merged.updated > 0) lines.push(`登録済みの${merged.updated}語に例文を追加しました`)
    show(lines.length > 0 ? lines.join('\n') : 'サンプル単語はすべて登録済みです')
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

      {/* 結果のメッセージは、操作した場所の近くに見えるよう、上に出す */}
      {message !== '' && (
        <p className={`${shared.message} ${isError ? shared.error : ''}`}>{message}</p>
      )}

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
        <textarea
          className={shared.textarea}
          style={{ minHeight: 64 }}
          placeholder={'例文（任意・1行に1文）。語彙問題で、英単語の部分が空所になります\nWe must decide by Friday.'}
          value={examples}
          onChange={(e) => setExamples(e.target.value)}
          autoCapitalize="sentences"
          autoCorrect="off"
        />
        <button className={shared.button} onClick={handleAddOne}>
          追加
        </button>
      </div>

      <h3 className={shared.subheading}>まとめて追加</h3>
      <div className={shared.field}>
        <textarea
          className={shared.textarea}
          placeholder={
            '1行に1語。「英単語 意味」の形で貼り付け\ndecide 決める、決心する\ncontract 契約、契約書\n「|」のあとに例文も書けます\nsubmit 提出する | Please submit the form.'
          }
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <button className={shared.button} onClick={handleAddBulk}>
          まとめて追加
        </button>
      </div>

      <h3 className={shared.subheading}>サンプル</h3>
      <button className={shared.buttonSecondary} onClick={handleSamples}>
        サンプル単語を読み込む（{STARTER_WORDS.length}語・例文つき）
      </button>
      <p className={shared.muted}>語彙問題を試すための単語です。いらなくなったら単語一覧から消せます。</p>
    </div>
  )
}
