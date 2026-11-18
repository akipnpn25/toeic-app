import { useState } from 'react'
import { PUPPY_NAME_MAX } from '../constants'
import { MAX_STAGE, masteredCount, moodMessage, puppyMood, stageProgress } from '../logic/puppy'
import { ITEMS, itemsForStage } from '../logic/puppyItems'
import { TRICKS, nextUnlock, tricksForStage } from '../logic/puppyTricks'
import type { Trick } from '../logic/puppyTricks'
import type { DailyLog, Word } from '../types'
import PuppyCanvas from './PuppyCanvas'
import styles from './PuppyCard.module.css'

type Props = {
  words: Word[]
  log: DailyLog
  today: string
  goal: number
  name: string
  onChangeName: (name: string) => void
}

// 子犬のカード：絵・名前・育ち具合・できること・ひとこと
export default function PuppyCard({ words, log, today, goal, name, onChangeName }: Props) {
  const [doing, setDoing] = useState<Trick | null>(null) // いま見せている芸（なければ null）

  const mastered = masteredCount(words)
  const progress = stageProgress(mastered)
  const mood = puppyMood(log, today, goal)
  const displayName = name.trim() === '' ? 'こいぬ' : name
  const items = itemsForStage(progress.stage)
  const tricks = tricksForStage(progress.stage)
  const upcoming = nextUnlock(progress.stage) // 次に増えるアイテム・芸（全部そろっていれば null）

  return (
    <section className={styles.card}>
      <div className={styles.picture}>
        {/* 絵のタップ・アニメーションは PuppyCanvas が担当。芸の始まりと終わりだけ、ここで受け取る */}
        <PuppyCanvas stage={progress.stage} mood={mood} onTrick={setDoing} />
      </div>

      <div className={styles.info}>
        <input
          className={styles.name}
          value={name}
          maxLength={PUPPY_NAME_MAX}
          placeholder="名前をつける"
          onChange={(e) => onChangeName(e.target.value)}
          aria-label="子犬の名前"
        />
        <div className={styles.stage}>
          ステージ {progress.stage} / {MAX_STAGE}
          <span className={styles.count}>　定着 {mastered}語</span>
        </div>

        <div className={styles.bar} role="progressbar" aria-valuenow={Math.round(progress.ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.fill} style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
        </div>
        <div className={styles.next}>
          {progress.isMax ? '最終ステージです！' : `次のステージまで あと${progress.remaining}語`}
        </div>

        <div className={styles.next}>
          アイテム {items.length} / {ITEMS.length}　芸 {tricks.length} / {TRICKS.length}
        </div>
        {upcoming && (
          <div className={styles.next}>
            次：{upcoming.labels.join('・')}（あと{upcoming.words - mastered}語）
          </div>
        )}

        {/* 芸の最中は、その名前を。そうでなければ、タップのヒントを */}
        <p className={styles.trick}>
          {doing
            ? `♪ ${doing.label}${doing.label.endsWith('！') ? '' : '！'}` // 「ワン！」には「！」を重ねない
            : mood === 'sleeping'
              ? ''
              : `${displayName}をタップすると、芸を見せてくれます`}
        </p>
        <p className={styles.message}>{moodMessage(mood, displayName)}</p>
      </div>
    </section>
  )
}
