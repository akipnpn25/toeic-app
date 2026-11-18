import { describe, expect, it } from 'vitest'
import type { Mood } from '../logic/puppy'
import { MAX_STAGE } from '../logic/puppy'
import { ITEMS } from '../logic/puppyItems'
import { NEUTRAL_POSE, TRICKS, poseAt } from '../logic/puppyTricks'
import type { Pose } from '../logic/puppyTricks'
import { VIRTUAL_H, VIRTUAL_W, drawPuppy, puppyScale } from './drawPuppy'
import { COLOR } from './shapes'

type Call = { name: string; args: unknown[] }

// 描く命令（ellipse や arc など）と、色の設定（fillStyle など）を記録するだけの「偽の紙」。
// 本物の Canvas はテスト環境（Node）にないので、「どの命令が、どんな順に呼ばれたか」を記録する。
//
// さらに、紙を動かす命令（translate・scale・rotate）も追跡する。
// ジャンプで体が持ち上がったり、頭が傾いたりしても、紙からはみ出さないか調べるため。
// 追跡しているのは「変換行列」（[a b c d e f]）。点 (x, y) を (a*x + c*y + e, b*x + d*y + f) に移す。
function recordingContext() {
  const calls: Call[] = []
  let m = [1, 0, 0, 1, 0, 0]
  const stack: number[][] = []

  // 図形を描く命令のとき、そのときの変換行列も、いっしょに記録する
  const matrixOf = () => [...m]

  const ctx = new Proxy(
    {},
    {
      get: (_target, name: string) => (...args: unknown[]) => {
        const a = args as number[]
        const [ma, mb, mc, md] = m
        if (name === 'save') stack.push([...m])
        else if (name === 'restore') m = stack.pop() ?? m
        else if (name === 'translate') {
          m = [ma, mb, mc, md, m[4] + ma * a[0] + mc * a[1], m[5] + mb * a[0] + md * a[1]]
        } else if (name === 'scale') {
          m = [ma * a[0], mb * a[0], mc * a[1], md * a[1], m[4], m[5]]
        } else if (name === 'rotate') {
          const cos = Math.cos(a[0])
          const sin = Math.sin(a[0])
          m = [ma * cos + mc * sin, mb * cos + md * sin, -ma * sin + mc * cos, -mb * sin + md * cos, m[4], m[5]]
        }
        calls.push({ name, args: [...args, matrixOf()] }) // 最後の引数に、そのときの行列をつける
      },
      set: (_target, name: string, value: unknown) => {
        calls.push({ name: `set:${name}`, args: [value] }) // fillStyle = '#ff0000' のような代入も記録する
        return true
      },
    },
  ) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

function record(stage: number, mood: Mood, pose?: Pose) {
  const { ctx, calls } = recordingContext()
  drawPuppy(ctx, { stage, mood, pose })
  return calls
}

// 描いた絵の、はしからはしまでの範囲を調べる（楕円・円弧・長方形・線の端点）。
// 紙を動かす命令（translate など）を考えに入れて、最終的に紙のどこに描かれるかで測る。
function bounds(calls: Call[]) {
  const b = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  const addPoint = (m: number[], x: number, y: number) => {
    const px = m[0] * x + m[2] * y + m[4]
    const py = m[1] * x + m[3] * y + m[5]
    b.left = Math.min(b.left, px)
    b.right = Math.max(b.right, px)
    b.top = Math.min(b.top, py)
    b.bottom = Math.max(b.bottom, py)
  }
  // 中心 (x, y)・半径 (rx, ry) の長方形の4つの角を足す
  const addBox = (m: number[], x: number, y: number, rx: number, ry: number) => {
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addPoint(m, x + sx * rx, y + sy * ry)
  }

  for (const c of calls) {
    const args = c.args
    const m = args[args.length - 1] as number[] // 記録のとき最後に足した行列
    const a = args as number[]
    if (c.name === 'ellipse') {
      // 傾けた楕円は、長いほうの半径で大きめに見積もる
      const rotated = a[4] !== 0
      addBox(m, a[0], a[1], rotated ? Math.max(a[2], a[3]) : a[2], rotated ? Math.max(a[2], a[3]) : a[3])
    } else if (c.name === 'arc') {
      addBox(m, a[0], a[1], a[2], a[2])
    } else if (c.name === 'fillRect') {
      addPoint(m, a[0], a[1])
      addPoint(m, a[0] + a[2], a[1] + a[3])
    } else if (c.name === 'moveTo' || c.name === 'lineTo') {
      addPoint(m, a[0], a[1])
    } else if (c.name === 'quadraticCurveTo') {
      addPoint(m, a[2], a[3])
    }
  }
  return b
}

// 描いたときに設定された色の集まり
function colorsUsed(calls: Call[]): Set<unknown> {
  return new Set(
    calls.filter((c) => c.name === 'set:fillStyle' || c.name === 'set:strokeStyle').map((c) => c.args[0]),
  )
}

const moods: Mood[] = ['fed', 'hungry', 'sleeping']

describe('puppyScale', () => {
  it('ステージ0で55%、最終ステージで100%、途中は少しずつ大きくなる', () => {
    expect(puppyScale(0)).toBeCloseTo(0.55)
    expect(puppyScale(MAX_STAGE)).toBeCloseTo(1)
    for (let s = 1; s <= MAX_STAGE; s++) expect(puppyScale(s)).toBeGreaterThan(puppyScale(s - 1))
  })
  it('範囲の外の値は、端に丸める', () => {
    expect(puppyScale(-5)).toBeCloseTo(0.55)
    expect(puppyScale(99)).toBeCloseTo(1)
  })
})

describe('drawPuppy', () => {
  it('すべてのステージ・機嫌で、エラーなく描ける', () => {
    for (let stage = 0; stage <= MAX_STAGE; stage++) {
      for (const mood of moods) {
        expect(() => record(stage, mood)).not.toThrow()
        expect(record(stage, mood).length).toBeGreaterThan(10)
      }
    }
  })

  it('どのステージ・機嫌でも、絵（王冠やトロフィーを含む）が紙からはみ出さない', () => {
    for (let stage = 0; stage <= MAX_STAGE; stage++) {
      for (const mood of moods) {
        const b = bounds(record(stage, mood))
        const where = `stage ${stage} / ${mood}`
        expect(b.left, where).toBeGreaterThanOrEqual(0)
        expect(b.right, where).toBeLessThanOrEqual(VIRTUAL_W)
        expect(b.top, where).toBeGreaterThanOrEqual(0)
        expect(b.bottom, where).toBeLessThanOrEqual(VIRTUAL_H)
      }
    }
  })

  it('機嫌によって、描く内容が変わる（ごきげんなら♥、寝ていれば zzz）', () => {
    const texts = (mood: Mood) =>
      record(5, mood)
        .filter((c) => c.name === 'fillText')
        .map((c) => c.args[0])
    expect(texts('fed')).toEqual(['♥'])
    expect(texts('sleeping')).toEqual(['z', 'z'])
    expect(texts('hungry')).toEqual([])
  })

  it('ステージが上がるほど、描く命令が増える（アイテムが増える）', () => {
    expect(record(MAX_STAGE, 'hungry').length).toBeGreaterThan(record(0, 'hungry').length)
    expect(record(10, 'hungry').length).toBeGreaterThan(record(2, 'hungry').length)
  })

  it('ポーズを渡さなくても、ふだんの姿勢と同じ絵になる', () => {
    expect(record(8, 'fed')).toEqual(record(8, 'fed', NEUTRAL_POSE))
  })

  it('save と restore の数が合っている（紙の状態を戻し忘れない）', () => {
    for (const trick of TRICKS) {
      const calls = record(MAX_STAGE, 'fed', poseAt(trick, 0.5))
      const saves = calls.filter((c) => c.name === 'save').length
      const restores = calls.filter((c) => c.name === 'restore').length
      expect(saves, trick.id).toBe(restores)
    }
  })
})

describe('アイテムの描画', () => {
  it('ステージ0では、ごはん皿だけ（ボール・首輪・犬小屋はまだない）', () => {
    const colors = colorsUsed(record(0, 'hungry'))
    expect(colors.has(COLOR.bowl)).toBe(true)
    expect(colors.has(COLOR.ball)).toBe(false)
    expect(colors.has(COLOR.collar)).toBe(false)
    expect(colors.has(COLOR.houseWall)).toBe(false)
  })

  // [アイテム名, 手に入る色, 手に入るステージ]
  const cases: [string, string, number][] = [
    ['ボール', COLOR.ball, 1],
    ['首輪', COLOR.collar, 2],
    ['骨', COLOR.bone, 3],
    ['クッション', COLOR.cushion, 4],
    ['リボン', COLOR.ribbon, 5],
    ['バンダナ', COLOR.bandana, 6],
    ['犬小屋', COLOR.houseWall, 8],
    ['お花', COLOR.flowerA, 10],
    ['フリスビー', COLOR.frisbee, 12],
    ['金メダル', COLOR.medal, 14],
    ['風船', COLOR.balloon, 16],
    ['トロフィー', COLOR.trophy, 18],
    ['王冠', COLOR.crown, 20],
  ]
  for (const [label, color, stage] of cases) {
    it(`${label}は、ステージ${stage}から描かれる`, () => {
      expect(colorsUsed(record(stage - 1, 'hungry')).has(color), `stage ${stage - 1}`).toBe(false)
      expect(colorsUsed(record(stage, 'hungry')).has(color), `stage ${stage}`).toBe(true)
    })
  }

  it('このテストが、すべてのアイテム（ごはん皿以外）を調べている', () => {
    expect(cases).toHaveLength(ITEMS.length - 1)
  })

  it('ごはん皿のフードは、ごはんをもらった（ごきげんな）ときだけ入る', () => {
    expect(colorsUsed(record(0, 'fed')).has(COLOR.kibble)).toBe(true)
    expect(colorsUsed(record(0, 'hungry')).has(COLOR.kibble)).toBe(false)
    expect(colorsUsed(record(0, 'sleeping')).has(COLOR.kibble)).toBe(false)
  })
})

describe('ポーズ（動き）の描画', () => {
  // 動きの値を指定して描く
  const withPose = (pose: Partial<Pose>, stage = 10, mood: Mood = 'hungry') =>
    record(stage, mood, { ...NEUTRAL_POSE, ...pose })

  // 変換行列の「上への移動量」（f）の、いちばん小さい値。体が持ち上がると小さく（上へ）なる。
  const highestOffset = (calls: Call[]) =>
    Math.min(...calls.filter((c) => c.name === 'ellipse').map((c) => (c.args[c.args.length - 1] as number[])[5]))

  it('どの芸の、どの瞬間でも、絵が紙からはみ出さない（ジャンプ・傾き・回転・ふきだしを含む）', () => {
    for (const stage of [0, 6, 12, MAX_STAGE]) {
      for (const mood of ['fed', 'hungry'] as Mood[]) {
        for (const trick of TRICKS.filter((t) => t.stage <= stage)) {
          for (let i = 0; i <= 20; i++) {
            const b = bounds(record(stage, mood, poseAt(trick, i / 20)))
            const where = `stage ${stage} / ${mood} / ${trick.id} / p=${i / 20}`
            expect(b.left, where).toBeGreaterThanOrEqual(-0.5)
            expect(b.right, where).toBeLessThanOrEqual(VIRTUAL_W + 0.5)
            expect(b.top, where).toBeGreaterThanOrEqual(-0.5)
            expect(b.bottom, where).toBeLessThanOrEqual(VIRTUAL_H + 0.5)
          }
        }
      }
    }
  })

  it('（テスト自体の確認）はみ出す絵は、ちゃんとはみ出しとして検出できる', () => {
    // 最終ステージで、ありえないほど高く跳ばせれば、頭が紙の上に出るはず
    const b = bounds(withPose({ lift: 5 }, MAX_STAGE))
    expect(b.right).toBeGreaterThan(b.left) // 何も記録されずに合格してしまう、を防ぐ
    expect(b.top).toBeLessThan(0)
    // ふつうの最大のジャンプなら、収まっている
    const normal = bounds(withPose({ lift: 1 }, MAX_STAGE))
    expect(normal.top).toBeGreaterThanOrEqual(0)
  })

  it('ジャンプ（lift）が大きいほど、体が上に描かれる', () => {
    const ground = highestOffset(withPose({ lift: 0 }))
    const mid = highestOffset(withPose({ lift: 0.5 }))
    const top = highestOffset(withPose({ lift: 1 }))
    expect(mid).toBeLessThan(ground)
    expect(top).toBeLessThan(mid)
  })

  it('首かしげ（headTilt）では、頭が傾く（rotate が呼ばれる）', () => {
    const rotations = (calls: Call[]) => calls.filter((c) => c.name === 'rotate').map((c) => c.args[0])
    expect(rotations(withPose({}))).toEqual([0])
    expect(rotations(withPose({ headTilt: 0.4 }))).toEqual([0.4])
  })

  it('回転（turn）では、横幅が cos(turn) 倍になる（半回転で最も薄く、1回転で元に戻る）', () => {
    const widthScale = (turn: number) => {
      const scale = withPose({ turn }).find((c) => c.name === 'scale')!
      return scale.args[0] as number
    }
    expect(widthScale(0)).toBeCloseTo(1)
    expect(widthScale(Math.PI / 2)).toBeCloseTo(0.03) // 真横を向いた瞬間も、幅 0 にはしない
    expect(widthScale(Math.PI)).toBeCloseTo(-1) // 反対向き
    expect(widthScale(Math.PI * 2)).toBeCloseTo(1)
  })

  it('お手（pawRaise）のときだけ、前足の「腕」を描く', () => {
    expect(colorsUsed(withPose({ pawRaise: 0 })).has(COLOR.belly)).toBe(true) // おなかの色は fillStyle で使う
    const strokes = (calls: Call[]) =>
      calls.filter((c) => c.name === 'set:strokeStyle' && c.args[0] === COLOR.belly).length
    expect(strokes(withPose({ pawRaise: 0 }))).toBe(0)
    expect(strokes(withPose({ pawRaise: 1 }))).toBe(1)
  })

  it('ほえる（mouthOpen）では口を開け、ふだんの「ω」の口は描かない', () => {
    const mouthArcs = (calls: Call[]) => calls.filter((c) => c.name === 'arc' && c.args[2] === 5 * puppyScale(10)).length
    expect(mouthArcs(withPose({}))).toBe(2)
    expect(mouthArcs(withPose({ mouthOpen: 1 }))).toBe(0)
  })

  it('ふきだしは、指定したときだけ描かれ、文字がそのまま入る', () => {
    const texts = (calls: Call[]) => calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])
    expect(texts(withPose({}))).toEqual([])
    expect(texts(withPose({ bubble: { text: 'ワン！', alpha: 1 } }))).toEqual(['ワン！'])
  })

  it('ふきだしがうすいとき（alpha）は、透明度が設定される', () => {
    const alphas = withPose({ bubble: { text: 'ワン！', alpha: 0.4 } })
      .filter((c) => c.name === 'set:globalAlpha')
      .map((c) => c.args[0])
    expect(alphas).toContain(0.4)
  })
})
