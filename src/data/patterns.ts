// 品詞問題の「13パターン」の定義。
// 画面の表示・問題の作り方・ヒントは、すべてここを元にする。

import type { FormKey, PatternId } from '../types'

export type PatternInfo = {
  id: PatternId
  label: string // 画面に出す名前
  group: string // 大きな分類
  answerForms: FormKey[] // このパターンで、正解にしてよい形
  // 誤答に使ってよい形（優先して使いたい順に並べる）。
  // 「その位置に入っても文法的に正しくなってしまう形」は、ここに入れない。
  // 例：名詞の前（adj_noun）に ed 形を入れると "a decided plan" のように正しくなってしまうので除く。
  distractorPool: FormKey[]
  // 上のプールだけでは誤答が3つ集まらないときに限って使う、予備の形（なるべく使いたくない形）
  fallbackPool?: FormKey[]
  hint: string // 見分け方の基本ヒント
}

export const PATTERNS: PatternInfo[] = [
  {
    id: 'noun_det',
    label: '冠詞・所有格のあと',
    group: '名詞',
    answerForms: ['noun'],
    distractorPool: ['verb', 'adj', 'adv', 'ed'],
    hint: 'a / the / his など、冠詞や所有格のあとは名詞',
  },
  {
    id: 'noun_obj',
    label: '動詞の目的語',
    group: '名詞',
    answerForms: ['noun'],
    distractorPool: ['verb', 'adj', 'adv', 'ed'],
    hint: '他動詞のあと、「〜を」にあたる部分は名詞',
  },
  {
    id: 'noun_prep',
    label: '前置詞のあと',
    group: '名詞',
    answerForms: ['noun'],
    distractorPool: ['verb', 'adj', 'adv', 'ed'],
    hint: 'in / of / without など前置詞のあとは名詞',
  },
  {
    id: 'noun_subj',
    label: '主語の位置',
    group: '名詞',
    answerForms: ['noun'],
    distractorPool: ['verb', 'adj', 'adv', 'ed'],
    hint: '文の主語（〜は／〜が）になるのは名詞',
  },
  {
    id: 'noun_noun',
    label: '名詞＋名詞',
    group: '名詞',
    answerForms: ['noun'],
    distractorPool: ['verb', 'adj', 'adv', 'ed', 'ing'],
    hint: '名詞を前から修飾して「〜用の」の意味になる複合名詞（例：application form）',
  },
  {
    id: 'noun_person',
    label: '人か物か',
    group: '名詞',
    answerForms: ['noun', 'person'],
    distractorPool: ['noun', 'person', 'verb', 'adj', 'adv'],
    fallbackPool: ['ing'], // employ のように形容詞・副詞がない仲間のための予備
    hint: '人なら applicant / employee / manager、物・行為なら application / employment / management',
  },
  {
    id: 'adj_noun',
    label: '名詞の前',
    group: '形容詞',
    answerForms: ['adj'],
    distractorPool: ['noun', 'verb', 'adv', 'person'],
    hint: '名詞を説明する（very や most のあとに置ける）のは形容詞',
  },
  {
    id: 'adj_be',
    label: 'be動詞のあと',
    group: '形容詞',
    answerForms: ['adj'],
    distractorPool: ['noun', 'verb', 'adv', 'person'],
    hint: 'is / was / are のあとで主語の状態を表すのは形容詞',
  },
  {
    id: 'adv_verb',
    label: '動詞を修飾',
    group: '副詞',
    answerForms: ['adv'],
    distractorPool: ['noun', 'verb', 'adj', 'person'],
    hint: '主語と動詞の間、have / has と過去分詞の間などで動詞を修飾するのは副詞',
  },
  {
    id: 'adv_end',
    label: '完成した文のあと',
    group: '副詞',
    answerForms: ['adv'],
    distractorPool: ['noun', 'verb', 'adj', 'person'],
    hint: '文が完成しているところに付け足すのは副詞',
  },
  {
    id: 'adv_adj',
    label: '形容詞の前',
    group: '副詞',
    answerForms: ['adv'],
    distractorPool: ['noun', 'verb', 'adj', 'person'],
    hint: '形容詞を強めたり説明したりするのは副詞',
  },
  {
    id: 'verb_modal',
    label: '助動詞・to のあと',
    group: '動詞',
    answerForms: ['verb'],
    distractorPool: ['noun', 'adj', 'adv', 'ing', 'ed', 'person'],
    hint: 'will / should / can や to のあとは動詞の原形',
  },
  {
    id: 'participle',
    label: '分詞（-ing / -ed）',
    group: '分詞',
    answerForms: ['ing', 'ed'],
    // 先頭は、いつも「-ing と -ed のもう一方」にする（ロジック側で必ず入れる）
    distractorPool: ['ing', 'ed', 'verb', 'adv', 'noun', 'adj'],
    hint: '「〜している」なら -ing、「〜される・〜された」なら -ed',
  },
]

// id から素早く引くための辞書
export const PATTERN_BY_ID = Object.fromEntries(PATTERNS.map((p) => [p.id, p])) as Record<
  PatternId,
  PatternInfo
>
