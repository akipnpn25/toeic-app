import { useState } from 'react'
import Segmented from '../components/Segmented'
import type { PatternStats, Template, Word, WordFamily } from '../types'
import PosQuiz from './cloze/PosQuiz'
import VocabQuiz from './cloze/VocabQuiz'

type Props = {
  words: Word[]
  families: WordFamily[]
  templates: Template[]
  stats: PatternStats // 品詞問題のパターンごとの成績
  onChangeWords: (words: Word[]) => void
  onChangeStats: (stats: PatternStats) => void
  onAnswered: (isCorrect: boolean) => void // 1問答えるたびに呼ぶ（1日の記録に使う）
}

type Mode = 'pos' | 'vocab'

// 「穴埋め」タブ。品詞問題と語彙問題を、上のボタンで切り替える。
export default function ClozeScreen({
  words,
  families,
  templates,
  stats,
  onChangeWords,
  onChangeStats,
  onAnswered,
}: Props) {
  const [mode, setMode] = useState<Mode>('pos')

  return (
    <div>
      <Segmented
        options={[
          { value: 'pos', label: '品詞問題' },
          { value: 'vocab', label: '語彙問題' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'pos' ? (
        <PosQuiz
          words={words}
          families={families}
          templates={templates}
          stats={stats}
          onChangeStats={onChangeStats}
          onAnswered={onAnswered}
        />
      ) : (
        <VocabQuiz words={words} onChangeWords={onChangeWords} onAnswered={onAnswered} />
      )}
    </div>
  )
}
