import { useState } from 'react'
import { FORM_LABELS, FORM_LIST } from '../../constants'
import { STARTER_FAMILIES } from '../../data/starter'
import { addFamiliesFromText, deleteFamily, saveFamily } from '../../logic/families'
import { mergeById } from '../../logic/templates'
import type { FormKey, WordFamily } from '../../types'
import shared from '../../shared.module.css'
import styles from './AddPanels.module.css'

type Props = {
  families: WordFamily[]
  onChangeFamilies: (families: WordFamily[]) => void
}

// 入力欄の中身（形 → 文字）。まだ何も入力していない状態
function emptyValues(): Record<FormKey, string> {
  return { noun: '', verb: '', adj: '', adv: '', ing: '', ed: '', person: '' }
}

export default function FamilyPanel({ families, onChangeFamilies }: Props) {
  const [forms, setForms] = useState<Record<FormKey, string>>(emptyValues)
  const [meanings, setMeanings] = useState<Record<FormKey, string>>(emptyValues)
  const [editingId, setEditingId] = useState<string | null>(null) // 編集中の仲間の id
  const [bulk, setBulk] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  function show(text: string, error = false) {
    setMessage(text)
    setIsError(error)
  }

  function resetForm() {
    setForms(emptyValues())
    setMeanings(emptyValues())
    setEditingId(null)
  }

  function handleSave() {
    const result = saveFamily(families, { forms, meanings }, undefined, editingId ?? undefined)
    if (result.error === 'few') return show('2つ以上の形を入力してください', true)
    if (result.error === 'duplicate') return show('同じ語の仲間がすでに登録されています', true)
    onChangeFamilies(result.families)
    show(editingId ? '更新しました' : '追加しました')
    resetForm()
  }

  function handleBulk() {
    const result = addFamiliesFromText(families, bulk)
    if (result.added === 0 && result.duplicates === 0) {
      return show('追加できる行がありません。「動詞 名詞 形容詞 副詞」の4つを書いてください', true)
    }
    onChangeFamilies(result.families)
    const lines = [`${result.added}件を追加しました`]
    if (result.duplicates > 0) lines.push(`${result.duplicates}件は登録済みのため飛ばしました`)
    if (result.invalid.length > 0) lines.push(`${result.invalid.length}行は読み取れませんでした`)
    show(lines.join('\n'))
    setBulk('')
  }

  function handleSamples() {
    const { items, added } = mergeById(families, STARTER_FAMILIES)
    onChangeFamilies(items)
    show(added > 0 ? `サンプルの語の仲間を${added}件追加しました` : 'サンプルはすべて追加済みです')
  }

  function startEdit(f: WordFamily) {
    const nextForms = emptyValues()
    const nextMeanings = emptyValues()
    for (const form of FORM_LIST) {
      nextForms[form] = f[form] ?? ''
      nextMeanings[form] = f.meanings[form] ?? ''
    }
    setForms(nextForms)
    setMeanings(nextMeanings)
    setEditingId(f.id)
    setMessage('')
  }

  function handleDelete(f: WordFamily) {
    if (window.confirm(`「${summary(f)}」を削除しますか？`)) {
      onChangeFamilies(deleteFamily(families, f.id))
      if (editingId === f.id) resetForm()
    }
  }

  return (
    <div>
      <p className={shared.muted}>
        decide / decision / decisive / decisively のような「形違いのセット」を登録します。品詞問題の選択肢になります。
      </p>

      <h3 className={shared.subheading}>まとめて追加</h3>
      <div className={shared.field}>
        <textarea
          className={shared.textarea}
          placeholder={'1行に1セット。「動詞 名詞 形容詞 副詞」の順\ndecide decision decisive decisively\nemploy employment - -\n（無い形は - と書く）'}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <button className={shared.button} onClick={handleBulk}>
          まとめて追加
        </button>
      </div>

      <h3 className={shared.subheading}>{editingId ? '編集中' : '1セットずつ追加（意味つき・分詞・人を表す名詞もここから）'}</h3>
      <div className={shared.field}>
        {FORM_LIST.map((form) => (
          <div key={form} className={styles.formRow}>
            <span className={styles.formLabel}>{FORM_LABELS[form]}</span>
            <input
              className={shared.input}
              placeholder="英単語"
              value={forms[form]}
              onChange={(e) => setForms({ ...forms, [form]: e.target.value })}
              autoCapitalize="none"
              autoCorrect="off"
            />
            <input
              className={shared.input}
              placeholder="意味"
              value={meanings[form]}
              onChange={(e) => setMeanings({ ...meanings, [form]: e.target.value })}
            />
          </div>
        ))}
        <div className={styles.actions}>
          <button className={shared.button} onClick={handleSave}>
            {editingId ? '更新' : '追加'}
          </button>
          {editingId && (
            <button className={shared.buttonSecondary} onClick={resetForm}>
              キャンセル
            </button>
          )}
        </div>
      </div>
      <p className={shared.muted}>意味を空にすると、単語一覧に同じ英単語があればその意味を使います。</p>

      {message !== '' && (
        <p className={`${shared.message} ${isError ? shared.error : ''}`}>{message}</p>
      )}

      <h3 className={shared.subheading}>登録済み（{families.length}件）</h3>
      <button className={shared.buttonSecondary} onClick={handleSamples}>
        サンプルを読み込む（8件）
      </button>
      <ul className={styles.list}>
        {families.map((f) => (
          <li key={f.id} className={styles.item}>
            <div className={styles.itemText}>{summary(f)}</div>
            <div className={styles.actions}>
              <button className={shared.buttonSecondary} onClick={() => startEdit(f)}>
                編集
              </button>
              <button className={shared.buttonDanger} onClick={() => handleDelete(f)}>
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// 「decide / decision / decisive / decisively」のように、あるものを並べた表示
function summary(f: WordFamily): string {
  return FORM_LIST.map((form) => f[form])
    .filter((text): text is string => Boolean(text)) // 入力のあるものだけ
    .join(' / ')
}
