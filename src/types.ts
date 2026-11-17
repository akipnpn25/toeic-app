// アプリ全体で使う「データの形」をここにまとめる。
// type は「この形のデータだけ許す」という TypeScript のルール。実行時には消える。

// 品詞：名詞・動詞・形容詞・副詞
export type Pos = 'noun' | 'verb' | 'adj' | 'adv'

// 語の「形」：上の4つに、分詞の -ing 形と -ed 形を足したもの
export type FormKey = Pos | 'ing' | 'ed'

// 単語1つ分
export type Word = {
  id: string // 一意な目印（他の単語と区別するため）
  word: string // 英単語
  meanings: string[] // 意味（複数ありうるので配列）
  pos?: Pos // 品詞。「?」は「なくてもよい」
  level: number // 間隔反復のレベル（0〜）
  correct: number // 正解した回数
  wrong: number // 間違えた回数
  nextReview: number // 次に出題してよい時刻（ミリ秒。Date.now() と同じ単位）
  addedAt: number // 追加した時刻（ミリ秒）
}

// 語の仲間：decide / decision / decisive / decisively のような形違いのセット
export type WordFamily = {
  id: string
  noun?: string
  verb?: string
  adj?: string
  adv?: string
  ing?: string
  ed?: string
  // 形ごとの意味。例：{ noun: "決定", verb: "決める" }
  // Record<K, V> は「キーが K、値が V の辞書」
  meanings: Record<string, string>
}

// 品詞問題の「テンプレート文」
export type Template = {
  id: string
  pattern: string // パターン名。例："noun_det"（冠詞のあとの名詞）
  text: string // 空所（-------）を含む英文
  answerPos: FormKey // 正解の形
  translation: string // 和訳
  clue: string // 見分け方のヒント。例："the ------- of → 名詞"
}

// 日ごとの記録。キーは "2026-11-16" のような日付の文字列
// goal は「その日の目標問題数」。あとで目標を変えても、過去の日の達成判定が変わらないように記録しておく。
export type DailyLog = Record<
  string,
  { answered: number; correct: number; goal?: number }
>

// ユーザーの設定
export type Settings = {
  dailyGoal: number // 1日の目標問題数
}
