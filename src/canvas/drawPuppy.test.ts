import { describe, expect, it } from 'vitest'
import type { Mood } from '../logic/puppy'
import { MAX_STAGE } from '../logic/puppy'
import { VIRTUAL_H, VIRTUAL_W, drawPuppy, puppyScale } from './drawPuppy'

// 描く命令（ellipse や arc など）を記録するだけの「偽の紙」。
// 本物の Canvas はテスト環境（Node）にないので、「どの命令がどんな順に呼ばれたか」を記録する。
function recordingContext() {
  const calls: { name: string; args: unknown[] }[] = []
  const ctx = new Proxy(
    {},
    {
      get: (_target, name: string) => (...args: unknown[]) => {
        calls.push({ name, args })
      },
      set: () => true, // fillStyle などへの代入は、何もせず受け付ける
    },
  ) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

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
  const moods: Mood[] = ['fed', 'hungry', 'sleeping']

  it('すべてのステージ・機嫌で、エラーなく描ける', () => {
    for (let stage = 0; stage <= MAX_STAGE; stage++) {
      for (const mood of moods) {
        const { ctx, calls } = recordingContext()
        expect(() => drawPuppy(ctx, { stage, mood })).not.toThrow()
        expect(calls.length).toBeGreaterThan(10)
      }
    }
  })

  it('最終ステージの子犬が、紙からはみ出さない', () => {
    // 描いた楕円（x, y, 横の半径, 縦の半径）の外側が、紙の中に収まっているか調べる
    for (const mood of moods) {
      const { ctx, calls } = recordingContext()
      drawPuppy(ctx, { stage: MAX_STAGE, mood })
      for (const c of calls.filter((c) => c.name === 'ellipse')) {
        const [x, y, rx, ry] = c.args as number[]
        expect(x - rx, 'left').toBeGreaterThanOrEqual(0)
        expect(x + rx, 'right').toBeLessThanOrEqual(VIRTUAL_W)
        expect(y - ry, 'top').toBeGreaterThanOrEqual(0)
        expect(y + ry, 'bottom').toBeLessThanOrEqual(VIRTUAL_H)
      }
    }
  })

  it('機嫌によって、描く内容が変わる（ごきげんなら舌とハート、寝ていれば zzz）', () => {
    const texts = (mood: Mood) => {
      const { ctx, calls } = recordingContext()
      drawPuppy(ctx, { stage: 5, mood })
      return calls.filter((c) => c.name === 'fillText').map((c) => c.args[0])
    }
    expect(texts('fed')).toEqual(['♥'])
    expect(texts('sleeping')).toEqual(['z', 'z'])
    expect(texts('hungry')).toEqual([])
  })
})
