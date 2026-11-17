import { useState } from 'react'
import Segmented from '../components/Segmented'
import type { Template, Word, WordFamily } from '../types'
import shared from '../shared.module.css'
import FamilyPanel from './add/FamilyPanel'
import TemplatePanel from './add/TemplatePanel'
import WordAddPanel from './add/WordAddPanel'

type Props = {
  words: Word[]
  families: WordFamily[]
  templates: Template[]
  onChangeWords: (words: Word[]) => void
  onChangeFamilies: (families: WordFamily[]) => void
  onChangeTemplates: (templates: Template[]) => void
}

type Section = 'words' | 'families' | 'templates'

// 「追加」タブ。登録するものを、上のボタンで切り替える。
export default function AddScreen({
  words,
  families,
  templates,
  onChangeWords,
  onChangeFamilies,
  onChangeTemplates,
}: Props) {
  const [section, setSection] = useState<Section>('words')

  return (
    <div>
      <Segmented
        options={[
          { value: 'words', label: '単語' },
          { value: 'families', label: '語の仲間' },
          { value: 'templates', label: 'テンプレート' },
        ]}
        value={section}
        onChange={setSection}
      />
      {section === 'words' && <WordAddPanel words={words} onChangeWords={onChangeWords} />}
      {section === 'families' && (
        <>
          <h2 className={shared.heading}>語の仲間を追加</h2>
          <FamilyPanel families={families} onChangeFamilies={onChangeFamilies} />
        </>
      )}
      {section === 'templates' && (
        <>
          <h2 className={shared.heading}>テンプレート文を追加</h2>
          <TemplatePanel families={families} templates={templates} onChangeTemplates={onChangeTemplates} />
        </>
      )}
    </div>
  )
}
