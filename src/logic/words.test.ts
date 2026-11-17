import { describe, expect, it } from 'vitest'
import type { Word } from '../types'
import {
  addMissingExamples,
  addWords,
  deleteWord,
  filterWords,
  parseBulk,
  parseLine,
  splitMeanings,
  updateWord,
} from './words'

// テスト用に、連番の id を作る関数
function idMaker() {
  let n = 0
  return () => `id${++n}`
}

function makeWord(id: string, word: string, meanings: string[]): Word {
  return { id, word, meanings, level: 0, correct: 0, wrong: 0, nextReview: 0, addedAt: 0 }
}

describe('splitMeanings', () => {
  it('「、」で区切って配列にし、前後の空白を取る', () => {
    expect(splitMeanings('決める、 決心する ')).toEqual(['決める', '決心する'])
  })
  it('空の要素は捨てる', () => {
    expect(splitMeanings('決める、、')).toEqual(['決める'])
  })
})

describe('parseLine', () => {
  it('「英単語 意味」を読み取る', () => {
    expect(parseLine('decide 決める')).toEqual({ word: 'decide', meanings: ['決める'] })
  })
  it('意味が複数あっても読み取れる', () => {
    expect(parseLine('decide 決める、決心する')?.meanings).toEqual(['決める', '決心する'])
  })
  it('熟語（空白を含む英語）も1つの単語として読み取る', () => {
    expect(parseLine('take over 引き継ぐ')).toEqual({ word: 'take over', meanings: ['引き継ぐ'] })
  })
  it('全角スペース・タブ区切りでも読み取れる', () => {
    expect(parseLine('decide　決める')?.word).toBe('decide')
    expect(parseLine('decide\t決める')?.word).toBe('decide')
  })
  it('意味がない行は null', () => {
    expect(parseLine('decide')).toBeNull()
    expect(parseLine('decide   ')).toBeNull()
  })
  it('「|」のあとの英語は例文として読み取る', () => {
    expect(parseLine('decide 決める、決心する | We must decide by Friday.')).toEqual({
      word: 'decide',
      meanings: ['決める', '決心する'],
      examples: ['We must decide by Friday.'],
    })
    expect(parseLine('decide 決める｜Decide now.')?.examples).toEqual(['Decide now.'])
  })
  it('例文に英単語が入っていない行は、読み取れない行として扱う', () => {
    expect(parseLine('decide 決める | We must choose by Friday.')).toBeNull()
  })
  it('「|」だけで例文が空なら、例文なしで読み取る', () => {
    expect(parseLine('decide 決める |')).toEqual({ word: 'decide', meanings: ['決める'] })
  })
})

describe('parseBulk', () => {
  it('空行は無視し、読み取れない行は invalid に入れる', () => {
    const r = parseBulk('decide 決める\n\nbroken\r\ncontract 契約')
    expect(r.entries.map((e) => e.word)).toEqual(['decide', 'contract'])
    expect(r.invalid).toEqual(['broken'])
  })
})

describe('addWords', () => {
  it('新しい単語を、初期値つきで追加する', () => {
    const r = addWords([], [{ word: 'decide', meanings: ['決める'] }], 1000, idMaker())
    expect(r.added).toBe(1)
    expect(r.words[0]).toMatchObject({
      id: 'id1',
      word: 'decide',
      level: 0,
      correct: 0,
      wrong: 0,
      nextReview: 1000,
      addedAt: 1000,
    })
  })
  it('すでにある単語は、大文字小文字を無視して飛ばす', () => {
    const existing = [makeWord('a', 'Decide', ['決める'])]
    const r = addWords(existing, [{ word: 'decide', meanings: ['別の意味'] }])
    expect(r.added).toBe(0)
    expect(r.duplicates).toBe(1)
    expect(r.words).toHaveLength(1)
  })
  it('貼り付けの中の重複も飛ばす', () => {
    const r = addWords(
      [],
      [
        { word: 'decide', meanings: ['決める'] },
        { word: 'decide', meanings: ['決める'] },
      ],
      0,
      idMaker(),
    )
    expect(r.added).toBe(1)
    expect(r.duplicates).toBe(1)
  })
  it('例文つきの素材なら、例文も保存する', () => {
    const r = addWords([], [{ word: 'decide', meanings: ['決める'], examples: ['We decide.'] }])
    expect(r.words[0].examples).toEqual(['We decide.'])
    expect(addWords([], [{ word: 'x', meanings: ['y'] }]).words[0]).not.toHaveProperty('examples')
  })
  it('元の配列は書き換えない', () => {
    const existing: Word[] = []
    addWords(existing, [{ word: 'decide', meanings: ['決める'] }])
    expect(existing).toHaveLength(0)
  })
})

describe('addMissingExamples', () => {
  const entries = [
    { word: 'decide', meanings: ['決める'], examples: ['We decide.'] },
    { word: 'contract', meanings: ['契約'], examples: ['The contract is long.'] },
    { word: 'invoice', meanings: ['請求書'] }, // 例文なし
  ]
  it('例文のない登録済みの単語に、素材の例文を足す（大文字小文字は無視）', () => {
    const words = [makeWord('1', 'Decide', ['決める']), makeWord('2', 'invoice', ['請求書'])]
    const r = addMissingExamples(words, entries)
    expect(r.updated).toBe(1)
    expect(r.words[0].examples).toEqual(['We decide.'])
    expect(r.words[1].examples).toBeUndefined() // 素材に例文がない
  })
  it('すでに例文がある単語は、書き換えない', () => {
    const words = [{ ...makeWord('1', 'decide', ['決める']), examples: ['My own sentence to decide.'] }]
    const r = addMissingExamples(words, entries)
    expect(r.updated).toBe(0)
    expect(r.words[0].examples).toEqual(['My own sentence to decide.'])
  })
  it('素材にない単語は、そのまま', () => {
    const words = [makeWord('1', 'other', ['別'])]
    expect(addMissingExamples(words, entries)).toEqual({ words, updated: 0 })
  })
})

describe('filterWords', () => {
  const words = [makeWord('1', 'decide', ['決める']), makeWord('2', 'contract', ['契約'])]
  it('空の検索語なら全部返す', () => {
    expect(filterWords(words, '  ')).toHaveLength(2)
  })
  it('英単語で検索できる（大文字小文字を無視）', () => {
    expect(filterWords(words, 'DEC').map((w) => w.id)).toEqual(['1'])
  })
  it('意味で検索できる', () => {
    expect(filterWords(words, '契').map((w) => w.id)).toEqual(['2'])
  })
})

describe('updateWord', () => {
  const words = [makeWord('1', 'decide', ['決める']), makeWord('2', 'contract', ['契約'])]
  it('内容を書き換える（正解数などは残る）', () => {
    const r = updateWord(words, '1', { word: 'decide', meanings: ['決定する'], pos: 'verb' })
    expect(r.error).toBeUndefined()
    expect(r.words[0]).toMatchObject({ meanings: ['決定する'], pos: 'verb', level: 0 })
  })
  it('他の単語と同じ英単語にはできない', () => {
    expect(updateWord(words, '1', { word: 'Contract', meanings: ['x'] }).error).toBe('duplicate')
  })
  it('自分自身と同じ英単語のままなら成功する', () => {
    expect(updateWord(words, '1', { word: 'decide', meanings: ['x'] }).error).toBeUndefined()
  })
  it('例文を保存でき、空にすると例文の項目がなくなる', () => {
    const withEx = updateWord(words, '1', { word: 'decide', meanings: ['決める'], examples: ['We decide.'] })
    expect(withEx.words[0].examples).toEqual(['We decide.'])
    const cleared = updateWord(withEx.words, '1', { word: 'decide', meanings: ['決める'], examples: [] })
    expect(cleared.words[0].examples).toBeUndefined()
  })
  it('英単語か意味が空なら失敗する', () => {
    expect(updateWord(words, '1', { word: ' ', meanings: ['x'] }).error).toBe('empty')
    expect(updateWord(words, '1', { word: 'decide', meanings: [] }).error).toBe('empty')
  })
})

describe('deleteWord', () => {
  it('指定した id の単語だけ消える', () => {
    const words = [makeWord('1', 'a', ['x']), makeWord('2', 'b', ['y'])]
    expect(deleteWord(words, '1').map((w) => w.id)).toEqual(['2'])
  })
})
