// 単語ドリル（4択）の出題ロジック。
// random（0以上1未満の数を返す関数）を引数で受け取れるようにしてあるので、
// テストでは「決まった値を返す偽の random」を渡して、結果を固定できる。

import type { Word } from '../types'

// 1問分のデータ
export type Question = {
  wordId: string // 出題する単語の id
  word: string // 画面に出す英単語
  answer: string // 正解の意味（その単語の意味のうち、今回選ばれた1つ）
  choices: string[] // 4つの選択肢（正解を含む。並びはシャッフル済み）
}

type Random = () => number

// 配列をランダムに並べ替える（Fisher-Yates 法）。元の配列は書き換えない。
export function shuffle<T>(items: T[], random: Random = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)) // 0〜i のどれか
    ;[result[i], result[j]] = [result[j], result[i]] // 入れ替え
  }
  return result
}

// 他の単語の意味から、誤答の候補を「重複なし」で n 個選ぶ。
// 対象と同じ品詞の単語の意味を先に使い、足りなければ他の品詞から補う。
function pickDistractors(words: Word[], target: Word, n: number, random: Random): string[] {
  // 正解になりうる意味（対象の単語の全ての意味）は、誤答に使わない
  const forbidden = new Set(target.meanings)

  const others = words.filter((w) => w.id !== target.id)
  const samePos = target.pos ? others.filter((w) => w.pos === target.pos) : []
  const rest = others.filter((w) => !samePos.includes(w))

  const result: string[] = []
  const used = new Set<string>()
  // 同じ品詞のグループ → それ以外のグループ、の順に、シャッフルして詰めていく
  for (const group of [samePos, rest]) {
    const meanings = shuffle(group.flatMap((w) => w.meanings), random)
    for (const m of meanings) {
      if (result.length >= n) break
      if (forbidden.has(m) || used.has(m)) continue
      used.add(m)
      result.push(m)
    }
  }
  return result
}

// 1つの単語から問題を作る。誤答が3つ集まらなければ null。
export function makeQuestion(
  words: Word[],
  target: Word,
  random: Random = Math.random,
): Question | null {
  const distractors = pickDistractors(words, target, 3, random)
  if (distractors.length < 3) return null

  // 意味が複数ある単語は、毎回ランダムに1つ選ぶ
  const answer = target.meanings[Math.floor(random() * target.meanings.length)]
  return {
    wordId: target.id,
    word: target.word,
    answer,
    choices: shuffle([answer, ...distractors], random),
  }
}

// 次に出題する単語を選ぶ。直前と同じ単語は、他にも単語があるなら避ける。
// （ステップ5で、復習の期日にもとづく選び方に差し替える）
export function pickTargetWord(
  words: Word[],
  lastId: string | null,
  random: Random = Math.random,
): Word | null {
  const candidates = words.length > 1 ? words.filter((w) => w.id !== lastId) : words
  if (candidates.length === 0) return null
  return candidates[Math.floor(random() * candidates.length)]
}

// 「次の問題」を作る。単語が足りないなど、作れないときは null。
export function buildNextQuestion(
  words: Word[],
  lastId: string | null,
  random: Random = Math.random,
): Question | null {
  const target = pickTargetWord(words, lastId, random)
  return target ? makeQuestion(words, target, random) : null
}

// 答えを記録する。正解なら correct、不正解なら wrong を1増やす。
export function recordAnswer(words: Word[], id: string, isCorrect: boolean): Word[] {
  return words.map((w) =>
    w.id === id
      ? {
          ...w,
          correct: w.correct + (isCorrect ? 1 : 0),
          wrong: w.wrong + (isCorrect ? 0 : 1),
        }
      : w,
  )
}
