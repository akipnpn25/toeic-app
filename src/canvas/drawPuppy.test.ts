import { describe, expect, it } from 'vitest'
import type { Mood } from '../logic/puppy'
import { MAX_STAGE } from '../logic/puppy'
import { ITEMS } from '../logic/puppyItems'
import { VIRTUAL_H, VIRTUAL_W, drawPuppy, puppyScale } from './drawPuppy'
import { COLOR } from './shapes'

// 描く命令（ellipse や arc など）と、色の設定（fillStyle など）を記録するだけの「偽の紙」。
// 本物の Canvas はテスト環境（Node）にないので、「どの命令が、どんな順に呼ばれたか」を記録する。
function recordingContext() {
  const calls: { name: string; args: unknown[] }[] = []
  const ctx = new Proxy(
    {},
    {
      get: (_target, name: string) => (...args: unknown[]) => {
        calls.push({ name, args })
      },
      set: (_target, name: string, value: unknown) => {
        calls.push({ name: `set:${name}`, args: [value] }) // fillStyle = '#ff0000' のような代入も記録する
        return true
      },
    },
  ) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

function record(stage: number, mood: Mood) {
  const { ctx, calls } = recordingContext()
  drawPuppy(ctx, { stage, mood })
  return calls
}

// 描いた絵の、はしからはしまでの範囲を調べる（楕円・円弧・長方形・線の端点）
function bounds(calls: ReturnType<typeof record>) {
  const b = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity }
  const add = (x: number, y: number) => {
    b.left = Math.min(b.left, x)
    b.right = Math.max(b.right, x)
    b.top = Math.min(b.top, y)
    b.bottom = Math.max(b.bottom, y)
  }
  for (const c of calls) {
    const a = c.args as number[]
    if (c.name === 'ellipse') {
      // 傾けた楕円は、長いほうの半径で大きめに見積もる
      const rx = a[4] === 0 ? a[2] : Math.max(a[2], a[3])
      const ry = a[4] === 0 ? a[3] : Math.max(a[2], a[3])
      add(a[0] - rx, a[1] - ry)
      add(a[0] + rx, a[1] + ry)
    } else if (c.name === 'arc') {
      add(a[0] - a[2], a[1] - a[2])
      add(a[0] + a[2], a[1] + a[2])
    } else if (c.name === 'fillRect') {
      add(a[0], a[1])
      add(a[0] + a[2], a[1] + a[3])
    } else if (c.name === 'moveTo' || c.name === 'lineTo') {
      add(a[0], a[1])
    } else if (c.name === 'quadraticCurveTo') {
      add(a[2], a[3])
    }
  }
  return b
}

// 描いたときに設定された色の集まり
function colorsUsed(calls: ReturnType<typeof record>): Set<unknown> {
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
