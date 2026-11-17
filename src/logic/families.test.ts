import { describe, expect, it } from 'vitest'
import type { Word, WordFamily } from '../types'
import {
  addFamiliesFromText,
  deleteFamily,
  familyKey,
  meaningOf,
  parseFamilyLine,
  saveFamily,
} from './families'

function idMaker() {
  let n = 0
  return () => `f${++n}`
}

const decide = {
  forms: { verb: 'decide', noun: 'decision', adj: 'decisive', adv: 'decisively' },
  meanings: { noun: '決定', verb: '決める' },
}

describe('parseFamilyLine', () => {
  it('「動詞 名詞 形容詞 副詞」を読み取る（スラッシュ区切りもOK）', () => {
    expect(parseFamilyLine('decide / decision / decisive / decisively')?.forms).toEqual({
      verb: 'decide',
      noun: 'decision',
      adj: 'decisive',
      adv: 'decisively',
    })
    expect(parseFamilyLine('decide decision decisive decisively')).not.toBeNull()
  })
  it('無い形は - で書ける', () => {
    const d = parseFamilyLine('employ employment - -')!
    expect(d.forms).toEqual({ verb: 'employ', noun: 'employment' })
  })
  it('4つに分けられない行・形が1つしかない行は null', () => {
    expect(parseFamilyLine('decide decision')).toBeNull()
    expect(parseFamilyLine('decide - - -')).toBeNull()
  })
})

describe('saveFamily', () => {
  it('追加すると id がつき、意味は入力のある形だけ残る', () => {
    const r = saveFamily([], { ...decide, meanings: { ...decide.meanings, ing: '余計' } }, idMaker())
    expect(r.error).toBeUndefined()
    expect(r.families[0]).toMatchObject({ id: 'f1', verb: 'decide', noun: 'decision' })
    expect(r.families[0].meanings).toEqual({ noun: '決定', verb: '決める' }) // ing は形がないので捨てる
  })
  it('空欄と前後の空白は取り除く', () => {
    const r = saveFamily([], { forms: { verb: ' decide ', noun: 'decision', adj: '  ' }, meanings: {} })
    expect(r.families[0].verb).toBe('decide')
    expect(r.families[0].adj).toBeUndefined()
  })
  it('形が2つ未満なら追加できない', () => {
    expect(saveFamily([], { forms: { verb: 'decide' }, meanings: {} }).error).toBe('few')
  })
  it('同じ仲間（基本の形が同じ）は、大文字小文字を無視して追加できない', () => {
    const first = saveFamily([], decide, idMaker()).families
    const r = saveFamily(first, { forms: { verb: 'Decide', noun: 'x' }, meanings: {} })
    expect(r.error).toBe('duplicate')
  })
  it('編集では、同じ id の仲間を書き換える（自分自身とは重複にならない）', () => {
    const first = saveFamily([], decide, idMaker()).families
    const r = saveFamily(first, { forms: { verb: 'decide', noun: 'decision', adv: 'decisively' }, meanings: {} }, undefined, 'f1')
    expect(r.error).toBeUndefined()
    expect(r.families).toHaveLength(1)
    expect(r.families[0].adj).toBeUndefined()
  })
})

describe('addFamiliesFromText', () => {
  it('まとめて追加し、重複と読み取れない行を数える', () => {
    const text = 'decide decision decisive decisively\n\ndecide decision - -\nbroken line\napply application applicable -'
    const r = addFamiliesFromText([], text, idMaker())
    expect(r.added).toBe(2)
    expect(r.duplicates).toBe(1)
    expect(r.invalid).toEqual(['broken line'])
  })
})

describe('deleteFamily / familyKey', () => {
  it('id で削除する', () => {
    const fams = [{ id: 'a', verb: 'x', meanings: {} }, { id: 'b', verb: 'y', meanings: {} }] as WordFamily[]
    expect(deleteFamily(fams, 'a').map((f) => f.id)).toEqual(['b'])
  })
  it('キーは、動詞→名詞…の順で最初にある形', () => {
    expect(familyKey({ noun: 'Decision', adj: 'decisive' })).toBe('decision')
  })
})

describe('meaningOf', () => {
  const family: WordFamily = { id: 'f', verb: 'decide', noun: 'decision', meanings: { noun: '決定' } }
  const words = [{ id: 'w', word: 'Decide', meanings: ['決める', '決心する'] }] as Word[]
  it('語の仲間に書いた意味を優先する', () => {
    expect(meaningOf(family, 'noun', words)).toBe('決定')
  })
  it('なければ、単語一覧の同じ英単語の意味を使う', () => {
    expect(meaningOf(family, 'verb', words)).toBe('決める、決心する')
  })
  it('どこにもなければ空文字', () => {
    expect(meaningOf(family, 'adj', words)).toBe('')
  })
})
