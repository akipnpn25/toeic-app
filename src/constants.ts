import type { Pos } from './types'

// 品詞の日本語名
export const POS_LABELS: Record<Pos, string> = {
  noun: '名詞',
  verb: '動詞',
  adj: '形容詞',
  adv: '副詞',
}

// 選択肢として並べる順番
export const POS_LIST: Pos[] = ['noun', 'verb', 'adj', 'adv']
