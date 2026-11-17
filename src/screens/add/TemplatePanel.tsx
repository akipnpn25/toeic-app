import { useState } from 'react'
import { FORM_LABELS } from '../../constants'
import { PATTERN_BY_ID, PATTERNS } from '../../data/patterns'
import { STARTER_TEMPLATES } from '../../data/starter'
import { BLANK, addTemplate, deleteTemplate, mergeById } from '../../logic/templates'
import type { FormKey, PatternId, Template, WordFamily } from '../../types'
import shared from '../../shared.module.css'
import styles from './AddPanels.module.css'

type Props = {
  families: WordFamily[]
  templates: Template[]
  onChangeTemplates: (templates: Template[]) => void
}

// 語の仲間を選ぶときの表示名（例：decide / decision / …）
function familyName(f: WordFamily): string {
  return [f.verb, f.noun, f.adj, f.adv, f.person].filter(Boolean).slice(0, 3).join(' / ')
}

export default function TemplatePanel({ families, templates, onChangeTemplates }: Props) {
  const [pattern, setPattern] = useState<PatternId>('noun_det')
  const [text, setText] = useState('')
  const [answerPos, setAnswerPos] = useState<FormKey>('noun')
  const [translation, setTranslation] = useState('')
  const [clue, setClue] = useState('')
  const [familyId, setFamilyId] = useState('') // '' は「どの語の仲間でも使う」
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const info = PATTERN_BY_ID[pattern]

  function show(msg: string, error = false) {
    setMessage(msg)
    setIsError(error)
  }

  // パターンを変えたら、そのパターンで選べる正解の形に合わせる
  function handleChangePattern(next: PatternId) {
    setPattern(next)
    const forms = PATTERN_BY_ID[next].answerForms
    if (!forms.includes(answerPos)) setAnswerPos(forms[0])
  }

  function handleAdd() {
    const result = addTemplate(
      templates,
      { pattern, text, answerPos, translation, clue, familyId: familyId || undefined },
      families,
    )
    if (result.error) return show(result.error, true)
    onChangeTemplates(result.templates)
    show('追加しました')
    setText('')
    setTranslation('')
    setClue('')
  }

  function handleSamples() {
    const { items, added } = mergeById(templates, STARTER_TEMPLATES)
    onChangeTemplates(items)
    show(added > 0 ? `サンプルのテンプレートを${added}件追加しました` : 'サンプルはすべて追加済みです')
  }

  function handleDelete(t: Template) {
    if (window.confirm('このテンプレートを削除しますか？')) {
      onChangeTemplates(deleteTemplate(templates, t.id))
    }
  }

  return (
    <div>
      <p className={shared.muted}>
        空所（{BLANK}）が1つある英文を登録します。語の仲間の形違いが選択肢になります。
      </p>
      <div className={shared.field}>
        <select
          className={shared.select}
          value={pattern}
          onChange={(e) => handleChangePattern(e.target.value as PatternId)}
        >
          {PATTERNS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.group}：{p.label}
            </option>
          ))}
        </select>
        <p className={shared.muted}>💡 {info.hint}</p>

        <textarea
          className={shared.textarea}
          style={{ minHeight: 70 }}
          placeholder={`英文（空所は ${BLANK}）\n例：The ------- of the new office was delayed.`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoCapitalize="sentences"
          autoCorrect="off"
        />
        <select
          className={shared.select}
          value={answerPos}
          onChange={(e) => setAnswerPos(e.target.value as FormKey)}
          disabled={info.answerForms.length === 1}
        >
          {info.answerForms.map((f) => (
            <option key={f} value={f}>
              正解の形：{FORM_LABELS[f]}
            </option>
          ))}
        </select>
        <input
          className={shared.input}
          placeholder="和訳（空所は（　）に）"
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
        />
        <input
          className={shared.input}
          placeholder="見分け方のヒント（空なら上の基本ヒント）"
          value={clue}
          onChange={(e) => setClue(e.target.value)}
        />
        <select className={shared.select} value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
          <option value="">どの語の仲間でも使う</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              専用：{familyName(f)}
            </option>
          ))}
        </select>
        <button className={shared.button} onClick={handleAdd}>
          追加
        </button>
      </div>

      {message !== '' && (
        <p className={`${shared.message} ${isError ? shared.error : ''}`}>{message}</p>
      )}

      <h3 className={shared.subheading}>登録済み（{templates.length}件）</h3>
      <button className={shared.buttonSecondary} onClick={handleSamples}>
        サンプルを読み込む（{STARTER_TEMPLATES.length}件）
      </button>

      {PATTERNS.map((p) => {
        const list = templates.filter((t) => t.pattern === p.id)
        if (list.length === 0) return null
        return (
          // パターンごとに、折りたたみで表示する
          <details key={p.id} className={styles.group}>
            <summary>
              {p.group}：{p.label}（{list.length}）
            </summary>
            <ul className={styles.list}>
              {list.map((t) => (
                <li key={t.id} className={styles.item}>
                  <div className={styles.itemText}>{t.text}</div>
                  <div className={shared.muted}>
                    正解：{FORM_LABELS[t.answerPos]}
                    {t.familyId && '・専用'}
                  </div>
                  <div className={styles.actions}>
                    <button className={shared.buttonDanger} onClick={() => handleDelete(t)}>
                      削除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )
      })}
    </div>
  )
}
