// 単語の追加・検索・編集・削除のロジック。
// 画面（React）とは切り離して、「データを受け取って新しいデータを返す」関数だけを置く。
// こうするとテストが書きやすい。どの関数も、受け取った配列を直接は書き換えない。

import type { Pos, Word } from '../types'

// 追加前の「単語の素材」（id や正解数などはまだ持たない）
export type WordEntry = {
  word: string
  meanings: string[]
  pos?: Pos
}

// 比較用のキー。大文字小文字を区別しない（"Decide" と "decide" は同じ単語）
function keyOf(word: string): string {
  return word.trim().toLowerCase()
}

// 「決定、決心」のような文字列を、「、」で区切って配列にする
export function splitMeanings(text: string): string[] {
  return text
    .split('、')
    .map((m) => m.trim())
    .filter((m) => m !== '') // 空の要素は捨てる
}

// 1行（例："decide 決める、決心する"）を読み取る。読み取れなければ null。
export function parseLine(line: string): WordEntry | null {
  const text = line.trim()

  // 1) 英単語部分が半角文字だけ、意味が半角以外から始まる形。
  //    "take over 引き継ぐ" のように、熟語（空白を含む英語）も正しく分けられる。
  //    [\x20-\x7E] は半角の英数字・記号・スペース、[^\x20-\x7E] はそれ以外の文字。
  // 2) うまくいかなければ、最初の空白で2つに分ける。
  const m =
    text.match(/^([\x20-\x7E]+?)\s+([^\x20-\x7E].*)$/) ??
    text.match(/^(\S+)\s+(.+)$/)
  if (!m) return null

  const word = m[1].trim().replace(/\s+/g, ' ')
  const meanings = splitMeanings(m[2])
  if (word === '' || meanings.length === 0) return null
  return { word, meanings }
}

// 貼り付けた複数行を読み取る。空行は無視。読み取れなかった行は invalid に入れる。
export function parseBulk(text: string): { entries: WordEntry[]; invalid: string[] } {
  const entries: WordEntry[] = []
  const invalid: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue
    const entry = parseLine(line)
    if (entry) entries.push(entry)
    else invalid.push(line)
  }
  return { entries, invalid }
}

export type AddResult = {
  words: Word[] // 追加後の単語リスト
  added: number // 追加できた数
  duplicates: number // すでにあって飛ばした数
}

// 単語を追加する。すでにある単語（貼り付けの中での重複も）は飛ばす。
// now と makeId は、テストのときに固定の値を渡せるように引数にしてある。
export function addWords(
  existing: Word[],
  entries: WordEntry[],
  now: number = Date.now(),
  makeId: () => string = () => crypto.randomUUID(),
): AddResult {
  const known = new Set(existing.map((w) => keyOf(w.word)))
  const result = [...existing] // コピーを作る（元の配列は書き換えない）
  let added = 0
  let duplicates = 0

  for (const entry of entries) {
    const key = keyOf(entry.word)
    if (known.has(key)) {
      duplicates++
      continue
    }
    known.add(key)
    result.push({
      id: makeId(),
      word: entry.word.trim(),
      meanings: entry.meanings,
      pos: entry.pos,
      level: 0,
      correct: 0,
      wrong: 0,
      nextReview: now, // すぐ出題してよい
      addedAt: now,
    })
    added++
  }
  return { words: result, added, duplicates }
}

// 検索。英単語か意味のどこかに含まれていればヒット。
export function filterWords(words: Word[], query: string): Word[] {
  const q = keyOf(query)
  if (q === '') return words
  return words.filter(
    (w) => keyOf(w.word).includes(q) || w.meanings.some((m) => m.includes(q)),
  )
}

export type UpdateResult = {
  words: Word[]
  error?: 'empty' | 'duplicate' // 失敗したときだけ理由が入る
}

// 単語の内容（英単語・意味・品詞）を書き換える。
export function updateWord(
  words: Word[],
  id: string,
  patch: { word: string; meanings: string[]; pos?: Pos },
): UpdateResult {
  const word = patch.word.trim()
  if (word === '' || patch.meanings.length === 0) {
    return { words, error: 'empty' }
  }
  // 自分以外に同じ英単語があれば失敗
  const clash = words.some((w) => w.id !== id && keyOf(w.word) === keyOf(word))
  if (clash) return { words, error: 'duplicate' }

  return {
    words: words.map((w) =>
      w.id === id ? { ...w, word, meanings: patch.meanings, pos: patch.pos } : w,
    ),
  }
}

// 削除。id が違うものだけ残す。
export function deleteWord(words: Word[], id: string): Word[] {
  return words.filter((w) => w.id !== id)
}
