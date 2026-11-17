// 語彙問題（Part 5 形式）のロジック。
// 登録した単語を含む例文から、その単語を空所（-------）にした問題を作る。
// 誤答は、できるだけ同じ品詞の別の単語から選ぶ。

import type { Word } from '../types'
import { recordAnswer, shuffle } from './drill'
import { pickNextWord, scheduleAfterAnswer } from './srs'
import { BLANK } from './templates'

type Random = () => number

// ---- 例文 ----

// 正規表現で特別な意味をもつ記号（. や ? など）を、ただの文字として扱えるようにする
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 例文の中の英単語を空所にする。例文に単語が（単語として）含まれていなければ null。
//   - 大文字小文字は区別しない（文頭の "Submit" も見つける）
//   - submit が submitted の一部にヒットしないよう、前後が英数字でないものだけを探す
// matched は、例文の中に実際にあった綴り（文頭なら大文字で始まる）
export function makeBlank(sentence: string, word: string): { text: string; matched: string } | null {
  const target = word.trim()
  if (target === '') return null
  const re = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(target)})(?![A-Za-z0-9])`, 'i')
  const m = re.exec(sentence)
  if (!m) return null
  const start = m.index + m[1].length
  const matched = m[2]
  return { text: sentence.slice(0, start) + BLANK + sentence.slice(start + matched.length), matched }
}

// 1行に1文の入力を、例文の配列にする（空行は捨てる）
export function parseExamples(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

// 例文がすべて、その単語を含んでいるか調べる。問題があればメッセージ、なければ null。
export function validateExamples(word: string, examples: string[]): string | null {
  for (const sentence of examples) {
    if (makeBlank(sentence, word) === null) {
      return `例文に「${word.trim()}」が含まれていません：${sentence}`
    }
  }
  return null
}

// この単語に、問題にできる例文があるか
export function usableExamples(word: Word): string[] {
  return (word.examples ?? []).filter((s) => makeBlank(s, word.word) !== null)
}

export function isEligible(word: Word): boolean {
  return usableExamples(word).length > 0
}

// ---- 問題づくり ----

export type VocabChoice = { wordId: string; text: string }

export type VocabQuestion = {
  wordId: string // 正解の単語の id
  sentence: string // 元の例文
  text: string // 空所（-------）にした例文
  choices: VocabChoice[] // (A)〜(D) の4つ（並びはシャッフル済み）
  answerIndex: number // 正解の位置（0〜3）
}

// 誤答にする単語を n 個選ぶ。足りなければ null。
// 優先順位：同じ品詞 → 品詞が未設定の単語 → 別の品詞。（目標の単語に品詞がなければ、全部同じ扱い）
export function pickDistractorWords(
  words: Word[],
  target: Word,
  n: number,
  random: Random = Math.random,
): Word[] | null {
  const targetKey = target.word.trim().toLowerCase()
  const others = words.filter((w) => w.id !== target.id && w.word.trim().toLowerCase() !== targetKey)

  const groups = target.pos
    ? [
        others.filter((w) => w.pos === target.pos),
        others.filter((w) => w.pos === undefined),
        others.filter((w) => w.pos !== undefined && w.pos !== target.pos),
      ]
    : [others]

  const result: Word[] = []
  for (const group of groups) {
    for (const w of shuffle(group, random)) {
      if (result.length >= n) break
      result.push(w)
    }
  }
  return result.length === n ? result : null
}

// 文頭の空所など、例文の綴りが大文字で始まっているときは、選択肢も大文字で始める
// （選択肢だけ小文字だと、正解がすぐ分かってしまうため）
function matchCase(text: string, matched: string): string {
  const first = matched.charAt(0)
  if (first !== first.toLowerCase() && text.charAt(0) === text.charAt(0).toLowerCase()) {
    return text.charAt(0).toUpperCase() + text.slice(1)
  }
  return text
}

// 次の問題を作る。出題できなければ null。
// 例文のある単語の中から、復習の時期が来ているものを優先して選ぶ（srs.ts と同じ選び方）。
export function buildVocabQuestion(
  words: Word[],
  now: number,
  lastId: string | null,
  random: Random = Math.random,
): VocabQuestion | null {
  const eligible = words.filter(isEligible)
  const target = pickNextWord(eligible, now, lastId, random)
  if (!target) return null

  const distractors = pickDistractorWords(words, target, 3, random)
  if (!distractors) return null

  // 例文が複数あれば、毎回ランダムに1つ選ぶ
  const examples = usableExamples(target)
  const sentence = examples[Math.floor(random() * examples.length)]
  const blank = makeBlank(sentence, target.word)!

  const items = shuffle([target, ...distractors], random)
  return {
    wordId: target.id,
    sentence,
    text: blank.text,
    choices: items.map((w) => ({ wordId: w.id, text: matchCase(w.word, blank.matched) })),
    answerIndex: items.indexOf(target),
  }
}

// 答えを反映する。正解数・間違い数を記録し、レベルと次の出題日も更新する。
// （文の中で使えた＝定着のよい証拠なので、単語ドリルと同じ間隔反復のルールで扱う）
export function applyVocabAnswer(words: Word[], wordId: string, isCorrect: boolean, now: number): Word[] {
  return recordAnswer(words, wordId, isCorrect).map((w) =>
    w.id === wordId ? scheduleAfterAnswer(w, isCorrect, now) : w,
  )
}
