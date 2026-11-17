import { useState } from 'react'
import { FORM_LABELS } from '../../constants'
import { PATTERNS } from '../../data/patterns'
import { meaningOf } from '../../logic/families'
import { buildPosQuestion, patternAccuracy, recordPatternAnswer } from '../../logic/posQuiz'
import type { PosQuestion } from '../../logic/posQuiz'
import { BLANK } from '../../logic/templates'
import type { PatternStats, Template, Word, WordFamily } from '../../types'
import shared from '../../shared.module.css'
import styles from './Quiz.module.css'

type Props = {
  words: Word[] // 単語一覧（語の仲間に意味がないとき、ここから意味を探す）
  families: WordFamily[]
  templates: Template[]
  stats: PatternStats // パターンごとの成績
  onChangeStats: (stats: PatternStats) => void
  onAnswered: (isCorrect: boolean) => void // 1問答えるたびに呼ぶ（1日の記録に使う）
}

const LETTERS = ['A', 'B', 'C', 'D']

export default function PosQuiz({ words, families, templates, stats, onChangeStats, onAnswered }: Props) {
  const [question, setQuestion] = useState<PosQuestion | null>(() =>
    buildPosQuestion(templates, families, stats),
  )
  const [picked, setPicked] = useState<number | null>(null) // 選んだ選択肢の位置。null なら未回答
  const [session, setSession] = useState({ answered: 0, correct: 0 })

  function handlePick(index: number) {
    if (question === null || picked !== null) return
    const isCorrect = index === question.answerIndex
    setPicked(index)
    setSession((s) => ({ answered: s.answered + 1, correct: s.correct + (isCorrect ? 1 : 0) }))
    onChangeStats(recordPatternAnswer(stats, question.pattern, isCorrect))
    onAnswered(isCorrect)
  }

  // statsはpropsなので、答えたあとの最新の値（App が更新したもの）で次の問題を作る
  function handleNext() {
    setQuestion(buildPosQuestion(templates, families, stats, Math.random, question?.templateId))
    setPicked(null)
  }

  const answered = picked !== null

  return (
    <div>
      <div className={styles.header}>
        <h2 className={shared.heading}>品詞問題</h2>
        <span className={shared.muted}>
          今回 {session.correct} / {session.answered}
        </span>
      </div>

      {question === null ? (
        <p className={shared.muted}>
          出題できる問題がありません。「追加」タブの「語の仲間」と「テンプレート」から、サンプルを読み込むか登録してください。
        </p>
      ) : (
        <Question
          question={question}
          picked={picked}
          words={words}
          families={families}
          onPick={handlePick}
        />
      )}

      {answered && (
        <button className={`${shared.button} ${styles.next}`} onClick={handleNext}>
          次へ
        </button>
      )}

      <PatternStatsView stats={stats} />
    </div>
  )
}

// 1問分の表示
function Question({
  question,
  picked,
  words,
  families,
  onPick,
}: {
  question: PosQuestion
  picked: number | null
  words: Word[]
  families: WordFamily[]
  onPick: (index: number) => void
}) {
  const answered = picked !== null
  const family = families.find((f) => f.id === question.familyId)
  const answerText = question.choices[question.answerIndex].text

  // 英文を、空所の前と後ろに分ける。答えたあとは、空所に正解を入れて強調する
  const [before, ...rest] = question.text.split(BLANK)
  const after = rest.join(BLANK)

  return (
    <>
      <p className={styles.sentence}>
        {before}
        {answered ? <strong className={styles.filled}>{answerText}</strong> : <span className={styles.blank}>{BLANK}</span>}
        {after}
      </p>

      <div className={styles.choices}>
        {question.choices.map((c, i) => {
          let state = ''
          if (answered && i === question.answerIndex) state = styles.correct
          else if (answered && i === picked) state = styles.wrong
          const meaning = family ? meaningOf(family, c.form, words) : ''
          return (
            <button
              key={c.form}
              className={`${styles.choice} ${state}`}
              onClick={() => onPick(i)}
              disabled={answered}
            >
              <span className={styles.choiceMain}>
                ({LETTERS[i]}) {c.text}
              </span>
              {/* 答えたあとだけ、各選択肢の品詞と意味を見せる */}
              {answered && (
                <span className={styles.choiceSub}>
                  {FORM_LABELS[c.form]}
                  {meaning && `　${meaning}`}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={styles.explain}>
          <p className={picked === question.answerIndex ? styles.ok : styles.ng}>
            {picked === question.answerIndex ? '✓ 正解！' : `✗ 不正解　正解は (${LETTERS[question.answerIndex]}) ${answerText}`}
          </p>
          {question.translation && <p>{question.translation}</p>}
          <p className={styles.clue}>💡 {question.clue}</p>
        </div>
      )}
    </>
  )
}

// パターンごとの正答率（折りたたみ）
function PatternStatsView({ stats }: { stats: PatternStats }) {
  return (
    <details className={styles.stats}>
      <summary>パターン別の正答率（苦手なパターンほど多く出ます）</summary>
      <ul className={styles.statList}>
        {PATTERNS.map((p) => {
          const stat = stats[p.id]
          const acc = patternAccuracy(stat)
          return (
            <li key={p.id} className={styles.statRow}>
              <span className={styles.statLabel}>
                {p.group}：{p.label}
              </span>
              <span className={styles.statBar}>
                <span className={styles.statFill} style={{ width: `${Math.round((acc ?? 0) * 100)}%` }} />
              </span>
              <span className={styles.statValue}>
                {acc === null ? '未挑戦' : `${Math.round(acc * 100)}%（${stat.correct}/${stat.answered}）`}
              </span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
