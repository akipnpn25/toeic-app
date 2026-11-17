import { useState } from 'react'
import { POS_LABELS } from '../constants'
import { applyAnswer, buildNextQuestion, queueRetry, removeRetry } from '../logic/drill'
import type { Question, Retry } from '../logic/drill'
import { countDue } from '../logic/srs'
import type { Word } from '../types'
import shared from '../shared.module.css'
import styles from './DrillScreen.module.css'

type Props = {
  words: Word[]
  onChangeWords: (words: Word[]) => void
  onAnswered: (isCorrect: boolean) => void // 1問答えるたびに呼ぶ（1日の記録に使う）
}

export default function DrillScreen({ words, onChangeWords, onAnswered }: Props) {
  // 問題を作った時刻。描画の途中で Date.now() を呼ぶと値が不安定になるので、state に持っておく
  const [now, setNow] = useState(() => Date.now())
  // 今出している問題。null なら出題できない（単語が足りない）
  const [question, setQuestion] = useState<Question | null>(() =>
    buildNextQuestion(words, { now, lastId: null, retries: [], answeredCount: 0 }),
  )
  const [answered, setAnswered] = useState(false) // 間違えて「正解を見ている」状態か
  const [picked, setPicked] = useState<string | null>(null) // 選んだ選択肢（「わからない」なら null）
  const [flash, setFlash] = useState('') // 直前に正解したときの短い表示
  const [session, setSession] = useState({ answered: 0, correct: 0 }) // この画面を開いてからの成績
  const [retries, setRetries] = useState<Retry[]>([]) // 「あとでもう一度出す」予約

  // 次の問題に進む。latest は「答えを記録したあとの最新の単語リスト」。
  // retries と answeredCount も、更新後の値を引数で受け取る（state の更新は次の描画まで反映されないため）
  function goNext(latest: Word[], lastId: string, nextRetries: Retry[], answeredCount: number) {
    const time = Date.now()
    setNow(time)
    setQuestion(
      buildNextQuestion(latest, { now: time, lastId, retries: nextRetries, answeredCount }),
    )
    setAnswered(false)
    setPicked(null)
  }

  // choice が null のときは「わからない」
  function handleAnswer(choice: string | null) {
    if (question === null) return
    const isCorrect = choice === question.answer
    const updated = applyAnswer(words, question, isCorrect, Date.now())
    onChangeWords(updated)
    onAnswered(isCorrect)

    const answeredCount = session.answered + 1
    setSession({ answered: answeredCount, correct: session.correct + (isCorrect ? 1 : 0) })

    // 間違えたら数問あとの再出題を予約する。正解なら、予約があれば消す。
    const nextRetries = isCorrect
      ? removeRetry(retries, question.wordId)
      : queueRetry(retries, question.wordId, answeredCount)
    setRetries(nextRetries)

    if (isCorrect) {
      setFlash('✓ 正解！')
      goNext(updated, question.wordId, nextRetries, answeredCount) // 正解ならすぐ次へ
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
  // 今日の復習が残っている単語の数
  const dueCount = countDue(words, now)

  return (
    <div>
      <div className={styles.header}>
        <h2 className={shared.heading}>単語ドリル</h2>
        <span className={shared.muted}>
          今回 {session.correct} / {session.answered}
        </span>
      </div>
      <p className={shared.muted}>
        {dueCount > 0 ? `復習する単語：残り${dueCount}語` : '今日の復習は終わりです（先取り練習中）'}
      </p>

      {question.isRetry && <p className={styles.retry}>↻ さっき間違えた単語です</p>}
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
          <button
            className={shared.button}
            onClick={() => goNext(words, question.wordId, retries, session.answered)}
          >
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
