import { describe, expect, it } from 'vitest'
import { MAX_STAGE } from './puppy'
import {
  NEUTRAL_POSE,
  TRICKS,
  envelope,
  nextUnlock,
  pickTrick,
  poseAt,
  tricksForStage,
} from './puppyTricks'

const STEPS = Array.from({ length: 101 }, (_, i) => i / 100) // 0, 0.01, …, 1

describe('envelope', () => {
  it('はじめは0、まん中は1、おわりは0（ふわっと始まりふわっと終わる）', () => {
    expect(envelope(0)).toBe(0)
    expect(envelope(0.5)).toBe(1)
    expect(envelope(1)).toBe(0)
  })
  it('だんだん上がり、だんだん下がる', () => {
    expect(envelope(0.1)).toBeGreaterThan(0)
    expect(envelope(0.1)).toBeLessThan(envelope(0.2))
    expect(envelope(0.9)).toBeLessThan(envelope(0.8))
  })
})

describe('TRICKS', () => {
  it('8つあり、id は重複しない。ステージの小さい順に並ぶ', () => {
    expect(TRICKS).toHaveLength(8)
    expect(new Set(TRICKS.map((t) => t.id)).size).toBe(8)
    for (let i = 1; i < TRICKS.length; i++) {
      expect(TRICKS[i].stage).toBeGreaterThan(TRICKS[i - 1].stage)
    }
  })
  it('ステージ0からできる芸がある（寝ていないとき、タップで何も起きない子にならない）', () => {
    expect(TRICKS[0].stage).toBe(0)
    expect(tricksForStage(0).map((t) => t.id)).toEqual(['wag'])
  })
  it('指定された芸（首かしげ・お手・ジャンプ・回転・ワン！）が入っている', () => {
    const labels = TRICKS.map((t) => t.label)
    for (const l of ['首かしげ', 'お手', 'ジャンプ', '回転', 'ワン！']) expect(labels).toContain(l)
  })
  it('かかる時間は、どれも 0.5〜3 秒', () => {
    for (const t of TRICKS) {
      expect(t.duration).toBeGreaterThanOrEqual(500)
      expect(t.duration).toBeLessThanOrEqual(3000)
    }
  })
})

describe('poseAt', () => {
  for (const trick of TRICKS) {
    describe(trick.label, () => {
      it('はじめとおわりは、ふだんの姿勢に戻る（急にポンと変わらない）', () => {
        for (const p of [0, 1]) {
          const pose = poseAt(trick, p)
          expect(pose.lift, 'lift').toBeCloseTo(0)
          expect(Math.cos(pose.turn), 'turn（2π は 0 と同じ向き）').toBeCloseTo(1)
          expect(pose.headTilt, 'headTilt').toBeCloseTo(0)
          expect(pose.pawRaise, 'pawRaise').toBeCloseTo(0)
          expect(pose.mouthOpen, 'mouthOpen').toBeCloseTo(0)
          expect(pose.bow, 'bow').toBeCloseTo(0)
          expect(pose.tailWag, 'tailWag').toBeCloseTo(0)
          expect(pose.sway, 'sway').toBeCloseTo(0)
          expect(pose.bubble?.alpha ?? 0, 'bubble').toBeCloseTo(0)
        }
      })

      it('途中の動きが、決まった範囲に収まっている', () => {
        for (const p of STEPS) {
          const pose = poseAt(trick, p)
          expect(pose.lift).toBeGreaterThanOrEqual(0)
          expect(pose.lift).toBeLessThanOrEqual(1)
          expect(pose.pawRaise).toBeGreaterThanOrEqual(0)
          expect(pose.pawRaise).toBeLessThanOrEqual(1)
          expect(pose.mouthOpen).toBeGreaterThanOrEqual(0)
          expect(pose.mouthOpen).toBeLessThanOrEqual(1)
          expect(pose.bow).toBeGreaterThanOrEqual(0)
          expect(pose.bow).toBeLessThanOrEqual(1)
          expect(Math.abs(pose.headTilt)).toBeLessThanOrEqual(0.5)
          expect(Math.abs(pose.tailWag)).toBeLessThanOrEqual(1)
          expect(Math.abs(pose.sway)).toBeLessThanOrEqual(1)
          expect(pose.turn).toBeGreaterThanOrEqual(0)
          expect(pose.turn).toBeLessThanOrEqual(Math.PI * 2 + 1e-9)
          if (pose.bubble) {
            expect(pose.bubble.alpha).toBeGreaterThanOrEqual(0)
            expect(pose.bubble.alpha).toBeLessThanOrEqual(1)
          }
        }
      })
    })
  }

  it('範囲の外の進み具合は、端に丸める', () => {
    expect(poseAt(TRICKS[1], -1)).toEqual(poseAt(TRICKS[1], 0))
    expect(poseAt(TRICKS[1], 5)).toEqual(poseAt(TRICKS[1], 1))
  })

  it('動かないところは、ふだんの姿勢のまま（首かしげで足は上がらない）', () => {
    const pose = poseAt(TRICKS.find((t) => t.id === 'tilt')!, 0.5)
    expect(pose).toEqual({ ...NEUTRAL_POSE, headTilt: pose.headTilt })
    expect(pose.headTilt).toBeCloseTo(0.4)
  })

  it('首かしげは頭を傾ける、お手は足を上げる、ワン！は口を開けてふきだしが出る', () => {
    const at = (id: string, p: number) => poseAt(TRICKS.find((t) => t.id === id)!, p)
    expect(at('tilt', 0.5).headTilt).toBeGreaterThan(0.3)
    expect(at('paw', 0.5).pawRaise).toBe(1)
    const bark = at('bark', 0.25) // 1回目のほえるのピーク
    expect(bark.mouthOpen).toBeCloseTo(1)
    expect(bark.bubble?.text).toBe('ワン！')
    expect(bark.bubble?.alpha).toBe(1)
  })

  it('ジャンプは2回、頂点まで跳ぶ。間で地面に戻る', () => {
    const jump = TRICKS.find((t) => t.id === 'jump')!
    expect(poseAt(jump, 0.25).lift).toBeCloseTo(1)
    expect(poseAt(jump, 0.5).lift).toBeCloseTo(0)
    expect(poseAt(jump, 0.75).lift).toBeCloseTo(1)
  })

  it('回転は、0 から 2π（1回転）まで、後戻りせずに増える', () => {
    const spin = TRICKS.find((t) => t.id === 'spin')!
    let prev = -1
    for (const p of STEPS) {
      const turn = poseAt(spin, p).turn
      expect(turn).toBeGreaterThanOrEqual(prev)
      prev = turn
    }
    expect(poseAt(spin, 1).turn).toBeCloseTo(Math.PI * 2)
  })
})

describe('tricksForStage / pickTrick', () => {
  it('ステージが上がるほど、できる芸が増える（なくならない）', () => {
    for (let s = 1; s <= MAX_STAGE; s++) {
      expect(tricksForStage(s).length).toBeGreaterThanOrEqual(tricksForStage(s - 1).length)
    }
    expect(tricksForStage(MAX_STAGE)).toHaveLength(8)
  })
  it('ステージ1で首かしげ、2でワン！、4でお手、6でジャンプ、9で回転ができる', () => {
    expect(tricksForStage(1).map((t) => t.id)).toContain('tilt')
    expect(tricksForStage(2).map((t) => t.id)).toContain('bark')
    expect(tricksForStage(3).map((t) => t.id)).not.toContain('paw')
    expect(tricksForStage(4).map((t) => t.id)).toContain('paw')
    expect(tricksForStage(6).map((t) => t.id)).toContain('jump')
    expect(tricksForStage(8).map((t) => t.id)).not.toContain('spin')
    expect(tricksForStage(9).map((t) => t.id)).toContain('spin')
  })
  it('できる芸の中から選ぶ。直前と同じ芸は、他にあれば避ける', () => {
    for (let i = 0; i < 50; i++) {
      const trick = pickTrick(5, 'paw')
      expect(trick.stage).toBeLessThanOrEqual(5)
      expect(trick.id).not.toBe('paw')
    }
  })
  it('芸が1つしかなければ、直前と同じでもそれを選ぶ', () => {
    expect(pickTrick(0, 'wag').id).toBe('wag')
  })
  it('いろいろな芸が選ばれる（かたよらない）', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) seen.add(pickTrick(MAX_STAGE, null).id)
    expect(seen.size).toBe(8)
  })
})

describe('nextUnlock', () => {
  it('次に増えるアイテム・芸のうち、いちばん近いものを返す', () => {
    expect(nextUnlock(0)).toEqual({ stage: 1, words: 50, labels: ['ボール', '首かしげ'] })
    expect(nextUnlock(6)).toEqual({ stage: 8, words: 400, labels: ['犬小屋'] }) // 回転は9
    expect(nextUnlock(8)).toEqual({ stage: 9, words: 450, labels: ['回転'] })
  })
  it('全部そろっていれば null', () => {
    expect(nextUnlock(MAX_STAGE)).toBeNull()
  })
})
