import styles from './Segmented.module.css'

type Props<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

// 「単語 | 語の仲間 | テンプレート」のように、どれか1つを選ぶ横並びのボタン。
// <T extends string> は「選択肢の値は文字列ならなんでもよい」という書き方（ジェネリクス）。
export default function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className={styles.segmented} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={`${styles.option} ${o.value === value ? styles.active : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
