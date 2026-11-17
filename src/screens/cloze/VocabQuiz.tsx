import { useState } from 'react'
import { POS_LABELS } from '../../constants'
import { applyVocabAnswer, buildVocabQuestion, isEligible } from '../../logic/vocab'
import type { VocabQuestion } from '../../logic/vocab'
import { BLANK } from '../../logic/templates'
import type { Word } from '../../types'
import shared from '../../shared.module.css'
import styles from './Quiz.module.css'

type Props = {
  words: Word[]
  onChangeWords: (words: Word[]) => void
  onAnswered: (isCorrect: boolean) => void // 1問答えるたびに呼ぶ（1日の記録に使う）
}

const LETTERS = ['A', 'B', 'C', 'D']

export default function VocabQuiz({ words, onChangeWords, onAnswered }: Props) {
  const [question, setQuestion] = useState<VocabQuestion | null>(() =>
    buildVocabQuestion(words, Date.now(), null),
  )
  const [picked, setPicked] = useState<number | null>(null) // 選んだ選択肢の位置。null なら未回答
  const [session, setSession] = useState({ answered: 0, correct: 0 })

  function handlePick(index: number) {
    if (question === null || picked !== null) return
    const isCorrect = index === question.answerIndex
    setPicked(index)
    setSession((s) => ({ answered: s.answered + 1, correct: s.correct + (isCorrect ? 1 : 0) }))
    onChangeWords(applyVocabAnswer(words, question.wordId, isCorrect, Date.now()))
    onAnswered(isCorrect)
  }

  function handleNext() {
    setQuestion(buildVocabQuestion(words, Date.now(), question?.wordId ?? null))
    setPicked(null)
  }

  const answered = picked !== null

  // 出題できないときの案内を、原因ごとに出し分ける
  function emptyMessage(): string {
    if (words.filter(isEligible).length === 0) {
      return '例文のある単語がありません。「追加」タブで単語に例文を書くか、「サンプル単語」を読み込んでください。'
    }
    return '誤答を作るために、登録した単語が4語以上必要です。'
  }

  return (
    <div>
      <div className={styles.header}>
        <h2 className={shared.heading}>語彙問題</h2>
        <span className={shared.muted}>
          今回 {session.correct} / {session.answered}
        </span>
      </div>

      {question === null ? (
        <p className={shared.muted}>{emptyMessage()}</p>
      ) : (
        <>
          <VocabView question={question} picked={picked} words={words} onPick={handlePick} />
          {answered && (
            <button className={`${shared.button} ${styles.next}`} onClick={handleNext}>
              次へ
            </button>
          )}
        </>
      )}
    </div>
  )
}

function VocabView({
  question,
  picked,
  words,
  onPick,
}: {
  question: VocabQuestion
  picked: number | null
  words: Word[]
  onPick: (index: number) => void
}) {
  const answered = picked !== null
  const answerChoice = question.choices[question.answerIndex]

  // 英文を、空所の前と後ろに分ける。答えたあとは、空所に正解を入れて強調する
  const [before, ...rest] = question.text.split(BLANK)
  const after = rest.join(BLANK)

  return (
    <>
      <p className={styles.sentence}>
        {before}
        {answered ? (
          <strong className={styles.filled}>{answerChoice.text}</strong>
        ) : (
          <span className={styles.blank}>{BLANK}</span>
        )}
        {after}
      </p>

      <div className={styles.choices}>
        {question.choices.map((c, i) => {
          let state = ''
          if (answered && i === question.answerIndex) state = styles.correct
          else if (answered && i === picked) state = styles.wrong
          const word = words.find((w) => w.id === c.wordId)
          return (
            <button
              key={c.wordId}
              className={`${styles.choice} ${state}`}
              onClick={() => onPick(i)}
              disabled={answered}
            >
              <span className={styles.choiceMain}>
                ({LETTERS[i]}) {c.text}
              </span>
              {/* 答えたあとだけ、各選択肢の品詞と意味を見せる */}
              {answered && word && (
                <span className={styles.choiceSub}>
                  {word.pos ? `${POS_LABELS[word.pos]}　` : ''}
                  {word.meanings.join('、')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={styles.explain}>
          <p className={picked === question.answerIndex ? styles.ok : styles.ng}>
            {picked === question.answerIndex
              ? '✓ 正解！'
              : `✗ 不正解　正解は (${LETTERS[question.answerIndex]}) ${answerChoice.text}`}
          </p>
        </div>
      )}
    </>
  )
}
