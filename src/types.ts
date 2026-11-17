// アプリ全体で使う「データの形」をここにまとめる。
// type は「この形のデータだけ許す」という TypeScript のルール。実行時には消える。

// 品詞：名詞・動詞・形容詞・副詞
export type Pos = 'noun' | 'verb' | 'adj' | 'adv'

// 語の「形」：上の4つに、分詞の -ing 形・-ed 形と、「人を表す名詞」（applicant など）を足したもの
export type FormKey = Pos | 'ing' | 'ed' | 'person'

// 品詞問題の「出題パターン」13種類
export type PatternId =
  | 'noun_det' // 冠詞・所有格のあとの名詞
  | 'noun_obj' // 動詞の目的語になる名詞
  | 'noun_prep' // 前置詞のあとの名詞
  | 'noun_subj' // 主語の位置の名詞
  | 'noun_noun' // 名詞＋名詞
  | 'noun_person' // 人を表す名詞か、物を表す名詞か
  | 'adj_noun' // 名詞の前の形容詞
  | 'adj_be' // be動詞のあとの形容詞
  | 'adv_verb' // 動詞を修飾する副詞
  | 'adv_end' // 完成した文のあとの副詞
  | 'adv_adj' // 形容詞の前の副詞
  | 'verb_modal' // 助動詞・to のあとの動詞
  | 'participle' // 分詞（-ing と -ed）

// 単語1つ分
export type Word = {
  id: string // 一意な目印（他の単語と区別するため）
  word: string // 英単語
  meanings: string[] // 意味（複数ありうるので配列）
  pos?: Pos // 品詞。「?」は「なくてもよい」
  examples?: string[] // 例文（英語。この単語を含む文）。語彙問題の空所にする
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
  person?: string // 人を表す名詞（applicant, employee, manager など）
  // 形ごとの意味。例：{ noun: "決定", verb: "決める" }
  // Record<K, V> は「キーが K、値が V の辞書」
  meanings: Record<string, string>
}

// 品詞問題の「テンプレート文」
export type Template = {
  id: string
  pattern: PatternId // パターン名。例："noun_det"（冠詞のあとの名詞）
  text: string // 空所（-------）を含む英文
  answerPos: FormKey // 正解の形
  translation: string // 和訳
  clue: string // 見分け方のヒント。例："the ------- of → 名詞"
  // この語の仲間でしか使わないテンプレートのときだけ指定する。
  // （「名詞＋名詞」や分詞など、入れる単語によって文として成り立たなくなる問題のため）
  familyId?: string
}

// パターンごとの成績。キーは PatternId
export type PatternStats = Record<string, { answered: number; correct: number }>

// 日ごとの記録。キーは "2026-11-16" のような日付の文字列
// goal は「その日の目標問題数」。あとで目標を変えても、過去の日の達成判定が変わらないように記録しておく。
export type DailyLog = Record<
  string,
  { answered: number; correct: number; goal?: number }
>

// ユーザーの設定
export type Settings = {
  dailyGoal: number // 1日の目標問題数
  puppyName: string // 子犬の名前
}
