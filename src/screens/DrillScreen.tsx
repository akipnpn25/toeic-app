import { useState } from 'react'
import { POS_LABELS } from '../constants'
import { buildNextQuestion, recordAnswer } from '../logic/drill'
import type { Question } from '../logic/drill'
import type { Word } from '../types'
import shared from '../shared.module.css'
import styles from './DrillScreen.module.css'

type Props = {
  words: Word[]
  onChangeWords: (words: Word[]) => void
}

export default function DrillScreen({ words, onChangeWords }: Props) {
  // 今出している問題。null なら出題できない（単語が足りない）
  const [question, setQuestion] = useState<Question | null>(() => buildNextQuestion(words, null))
  const [answered, setAnswered] = useState(false) // 間違えて「正解を見ている」状態か
  const [picked, setPicked] = useState<string | null>(null) // 選んだ選択肢（「わからない」なら null）
  const [flash, setFlash] = useState('') // 直前に正解したときの短い表示
  const [session, setSession] = useState({ answered: 0, correct: 0 }) // この画面を開いてからの成績

  // 次の問題に進む。words は「答えを記録したあとの最新の単語リスト」を渡す。
  function goNext(latest: Word[], lastId: string) {
    setQuestion(buildNextQuestion(latest, lastId))
    setAnswered(false)
    setPicked(null)
  }

  // choice が null のときは「わからない」
  function handleAnswer(choice: string | null) {
    if (question === null) return
    const isCorrect = choice === question.answer
    const updated = recordAnswer(words, question.wordId, isCorrect)
    onChangeWords(updated)
    setSession((s) => ({ answered: s.answered + 1, correct: s.correct + (isCorrect ? 1 : 0) }))

    if (isCorrect) {
      setFlash('✓ 正解！')
      goNext(updated, question.wordId) // 正解ならすぐ次へ
    } else {
      setFlash('')
      setPicked(choice)
      setAnswered(true) // 間違えたら、正しい意味を見せて止まる
    }
  }

  if (question === null) {
    return (
      <div>
        <h2 className={shared.heading}>単語ドリル</h2>
        <p className={shared.muted}>
          出題には、意味が重ならない単語が4語以上必要です。「追加」タブから登録しましょう。
        </p>
      </div>
    )
  }

  // 出題中の単語の全ての意味（間違えたときに見せる）
  const current = words.find((w) => w.id === question.wordId)

  return (
    <div>
      <div className={styles.header}>
        <h2 className={shared.heading}>単語ドリル</h2>
        <span className={shared.muted}>
          今回 {session.correct} / {session.answered}
        </span>
      </div>

      {flash !== '' && !answered && <p className={styles.flash}>{flash}</p>}

      <div className={styles.word}>
        {question.word}
        {current?.pos && <span className={styles.pos}>{POS_LABELS[current.pos]}</span>}
      </div>

      <div className={styles.choices}>
        {question.choices.map((c) => {
          // 答えたあとは、正解を緑、選んだ間違いを赤にする
          let state = ''
          if (answered && c === question.answer) state = styles.correct
          else if (answered && c === picked) state = styles.wrong
          return (
            <button
              key={c}
              className={`${styles.choice} ${state}`}
              onClick={() => handleAnswer(c)}
              disabled={answered} // 答えたあとは押せない
            >
              {c}
            </button>
          )
        })}
      </div>

      {answered ? (
        <div className={styles.result}>
          <p>
            <strong>{question.word}</strong> = {current?.meanings.join('、')}
          </p>
          <button className={shared.button} onClick={() => goNext(words, question.wordId)}>
            次へ
          </button>
        </div>
      ) : (
        <button className={shared.buttonSecondary} onClick={() => handleAnswer(null)}>
          わからない
        </button>
      )}
    </div>
  )
}
