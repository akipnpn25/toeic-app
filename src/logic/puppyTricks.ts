// 子犬の「芸」と、そのときの動き（ポーズ）の計算。
// 絵は描かない。「芸の何割まで進んだか」を受け取って、「体をどう動かすか」の数字を返すだけ。
// 数字を返すだけなので、テストで確かめやすい。

import { ITEMS } from './puppyItems'
import { WORDS_PER_STAGE } from './puppy'

// ある瞬間の体の動き。すべて「0 = ふだんの姿勢」からのずれ。
export type Pose = {
  lift: number // 体が持ち上がる高さ。0〜1（1 = ジャンプの頂点）
  turn: number // 回転の角度（ラジアン。0〜2π）。横の幅を cos(turn) 倍にして、くるっと回って見せる
  headTilt: number // 頭のかたむき（ラジアン）。プラスで右、マイナスで左に傾く
  pawRaise: number // 右前足の上がり具合。0〜1
  mouthOpen: number // 口の開き具合。0〜1
  bow: number // おじぎの深さ。0〜1
  tailWag: number // しっぽの左右の振れ。-1〜1
  sway: number // 体の左右のゆれ。-1〜1
  bubble: { text: string; alpha: number } | null // ふきだし（文字と、こさ 0〜1）
}

// ふだんの姿勢（何もしていないとき）
export const NEUTRAL_POSE: Pose = {
  lift: 0,
  turn: 0,
  headTilt: 0,
  pawRaise: 0,
  mouthOpen: 0,
  bow: 0,
  tailWag: 0,
  sway: 0,
  bubble: null,
}

export type TrickId = 'wag' | 'tilt' | 'bark' | 'paw' | 'jump' | 'spin' | 'bow' | 'dance'

export type Trick = {
  id: TrickId
  label: string
  stage: number // このステージになると、できるようになる
  duration: number // かかる時間（ミリ秒）
  // 進み具合 p（0 = はじまり、1 = おわり）から、ポーズを計算する。
  // はじまりとおわりは、必ず「ふだんの姿勢」に戻る（急にポンと姿勢が変わらないように）。
  pose: (p: number) => Partial<Pose>
}

// ---- 動きをなめらかにする道具 ----

const TWO_PI = Math.PI * 2

// 0〜1 の値を、「ゆっくり始まって、ゆっくり終わる」曲線にする（スムーズステップ）
function smooth(x: number): number {
  return x * x * (3 - 2 * x)
}

// 「ふわっと始まり、しばらく続いて、ふわっと終わる」強さ（0 → 1 → 0）。
// 進み具合 p の最初の rise 分で 0 から 1 に上がり、最後の fall 分で 1 から 0 に下がる。
export function envelope(p: number, rise = 0.25, fall = 0.25): number {
  if (p < rise) return smooth(p / rise)
  if (p > 1 - fall) return smooth((1 - p) / fall)
  return 1
}

// ---- 芸の一覧（ステージの小さい順） ----

export const TRICKS: Trick[] = [
  {
    id: 'wag',
    label: 'しっぽふり',
    stage: 0,
    duration: 1400,
    pose: (p) => ({ tailWag: Math.sin(p * TWO_PI * 5) * envelope(p, 0.1, 0.1) }),
  },
  {
    id: 'tilt',
    label: '首かしげ',
    stage: 1,
    duration: 1500,
    pose: (p) => ({ headTilt: 0.4 * envelope(p) }),
  },
  {
    id: 'bark',
    label: 'ワン！',
    stage: 2,
    duration: 1100,
    pose: (p) => {
      const open = Math.abs(Math.sin(p * TWO_PI)) // 2回ほえる（0 → 1 → 0 → 1 → 0）
      return {
        mouthOpen: open,
        lift: 0.12 * open,
        headTilt: -0.1 * open,
        bubble: { text: 'ワン！', alpha: envelope(p, 0.15, 0.25) },
      }
    },
  },
  {
    id: 'paw',
    label: 'お手',
    stage: 4,
    duration: 1800,
    pose: (p) => ({
      pawRaise: envelope(p, 0.2, 0.2),
      headTilt: 0.12 * envelope(p, 0.2, 0.2),
      tailWag: 0.5 * Math.sin(p * TWO_PI * 6) * envelope(p, 0.2, 0.2),
    }),
  },
  {
    id: 'jump',
    label: 'ジャンプ',
    stage: 6,
    duration: 1200,
    pose: (p) => ({ lift: Math.abs(Math.sin(p * TWO_PI)) }), // 2回ぴょんぴょん
  },
  {
    id: 'spin',
    label: '回転',
    stage: 9,
    duration: 1500,
    pose: (p) => ({ turn: smooth(p) * TWO_PI, lift: 0.3 * Math.sin(p * Math.PI) }),
  },
  {
    id: 'bow',
    label: 'おじぎ',
    stage: 12,
    duration: 1700,
    pose: (p) => ({
      bow: envelope(p, 0.3, 0.3),
      tailWag: 0.4 * Math.sin(p * TWO_PI * 6) * envelope(p, 0.3, 0.3),
    }),
  },
  {
    id: 'dance',
    label: 'ダンス',
    stage: 16,
    duration: 2200,
    pose: (p) => {
      const e = envelope(p, 0.1, 0.1)
      return {
        sway: Math.sin(p * TWO_PI * 4) * e,
        lift: 0.15 * Math.abs(Math.sin(p * TWO_PI * 4)) * e,
        headTilt: 0.25 * Math.sin(p * TWO_PI * 4) * e,
        tailWag: Math.sin(p * TWO_PI * 8) * e,
      }
    },
  },
]

// 進み具合 p（0〜1）のときのポーズ。範囲の外の p は、端に丸める。
export function poseAt(trick: Trick, p: number): Pose {
  const clamped = Math.min(Math.max(p, 0), 1)
  return { ...NEUTRAL_POSE, ...trick.pose(clamped) }
}

// このステージでできる芸
export function tricksForStage(stage: number): Trick[] {
  return TRICKS.filter((t) => t.stage <= stage)
}

// タップしたときに見せる芸を選ぶ。直前と同じ芸は、他にもあれば避ける。
export function pickTrick(
  stage: number,
  lastId: TrickId | null,
  random: () => number = Math.random,
): Trick {
  const available = tricksForStage(stage)
  const pool = available.length > 1 ? available.filter((t) => t.id !== lastId) : available
  return pool[Math.floor(random() * pool.length)]
}

// ---- 次のお楽しみ（アイテムか芸） ----

export type NextUnlock = {
  stage: number
  words: number // 解放される、定着した単語の数
  labels: string[] // 同じステージで解放されるアイテム・芸の名前
}

// 次に増えるもの（アイテムと芸をあわせて、いちばん近いもの）
export function nextUnlock(stage: number): NextUnlock | null {
  const upcoming = [...ITEMS, ...TRICKS].filter((x) => x.stage > stage)
  if (upcoming.length === 0) return null
  const next = Math.min(...upcoming.map((x) => x.stage))
  return {
    stage: next,
    words: next * WORDS_PER_STAGE,
    labels: upcoming.filter((x) => x.stage === next).map((x) => x.label),
  }
}
