import { describe, expect, it } from 'vitest'
import type { Word } from '../types'
import {
  countDue,
  INTERVAL_DAYS,
  isDue,
  MAX_LEVEL,
  nextReviewTime,
  pickNextWord,
  scheduleAfterAnswer,
  startOfDay,
} from './srs'

function makeWord(id: string, level = 0, nextReview = 0): Word {
  return { id, word: id, meanings: ['x'], level, correct: 0, wrong: 0, nextReview, addedAt: 0 }
}

// 2026年11月16日 22:30（ローカル時間）。月は 0 始まりなので、11月は 10。
const NOW = new Date(2026, 10, 16, 22, 30).getTime()
// 「n日後の0時」をローカル時間で作る
function midnight(daysLater: number) {
  return new Date(2026, 10, 16 + daysLater, 0, 0).getTime()
}

describe('startOfDay / nextReviewTime', () => {
  it('その日の0時を返す', () => {
    expect(startOfDay(NOW)).toBe(midnight(0))
  })
  it('n日後の0時を返す（時刻は切り捨て）', () => {
    expect(nextReviewTime(NOW, 1)).toBe(midnight(1))
    expect(nextReviewTime(NOW, 30)).toBe(midnight(30))
  })
})

describe('scheduleAfterAnswer（正解）', () => {
  it('レベル0〜4の単語が正解するたび、1・3・7・14・30日後になる', () => {
    expect(INTERVAL_DAYS).toEqual([1, 3, 7, 14, 30])
    const expected = [1, 3, 7, 14, 30]
    for (let level = 0; level <= 4; level++) {
      const r = scheduleAfterAnswer(makeWord('a', level), true, NOW)
      expect(r.level).toBe(level + 1)
      expect(r.nextReview).toBe(midnight(expected[level]))
    }
  })
  it('最高レベルでは、レベルが上がらず30日後のまま', () => {
    const r = scheduleAfterAnswer(makeWord('a', MAX_LEVEL), true, NOW)
    expect(r.level).toBe(MAX_LEVEL)
    expect(r.nextReview).toBe(midnight(30))
  })
})

describe('scheduleAfterAnswer（不正解）', () => {
  it('レベルが2下がり、翌日に出題される', () => {
    const r = scheduleAfterAnswer(makeWord('a', 4), false, NOW)
    expect(r.level).toBe(2)
    expect(r.nextReview).toBe(midnight(1))
  })
  it('レベルは0より下がらない', () => {
    expect(scheduleAfterAnswer(makeWord('a', 1), false, NOW).level).toBe(0)
    expect(scheduleAfterAnswer(makeWord('a', 0), false, NOW).level).toBe(0)
  })
  it('正解数・間違い数など、他の項目は変えない', () => {
    const w = { ...makeWord('a', 3), correct: 5, wrong: 2 }
    const r = scheduleAfterAnswer(w, false, NOW)
    expect(r).toMatchObject({ id: 'a', correct: 5, wrong: 2 })
  })
  it('元の単語は書き換えない', () => {
    const w = makeWord('a', 3)
    scheduleAfterAnswer(w, true, NOW)
    expect(w.level).toBe(3)
  })
})

describe('isDue / countDue', () => {
  it('出題日ちょうど、または過ぎていれば出題対象', () => {
    expect(isDue(makeWord('a', 0, NOW), NOW)).toBe(true)
    expect(isDue(makeWord('a', 0, NOW - 1), NOW)).toBe(true)
    expect(isDue(makeWord('a', 0, NOW + 1), NOW)).toBe(false)
  })
  it('対象の数を数える', () => {
    const words = [makeWord('a', 0, 0), makeWord('b', 0, NOW + 1000), makeWord('c', 0, 0)]
    expect(countDue(words, NOW)).toBe(2)
  })
})

describe('pickNextWord', () => {
  it('時期が来ている単語だけから選ぶ', () => {
    const words = [makeWord('a', 0, NOW + 1000), makeWord('b', 0, 0), makeWord('c', 0, NOW + 5000)]
    for (let i = 0; i < 20; i++) {
      expect(pickNextWord(words, NOW, null)!.id).toBe('b')
    }
  })
  it('1つもなければ、いちばん出題日が近い単語を選ぶ', () => {
    const words = [makeWord('a', 0, NOW + 5000), makeWord('b', 0, NOW + 1000), makeWord('c', 0, NOW + 9000)]
    expect(pickNextWord(words, NOW, null)!.id).toBe('b')
  })
  it('直前の単語は、他に単語があれば避ける', () => {
    const words = [makeWord('a'), makeWord('b')]
    for (let i = 0; i < 20; i++) {
      expect(pickNextWord(words, NOW, 'a')!.id).toBe('b')
    }
  })
  it('単語が1つだけなら、それを返す', () => {
    expect(pickNextWord([makeWord('a')], NOW, 'a')!.id).toBe('a')
  })
  it('単語がなければ null', () => {
    expect(pickNextWord([], NOW, null)).toBeNull()
  })
})
