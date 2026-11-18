import { PUPPY_NAME_MAX } from '../constants'
import { MAX_STAGE, WORDS_PER_STAGE, masteredCount, moodMessage, puppyMood, stageProgress } from '../logic/puppy'
import { ITEMS, itemsForStage, nextItem, wordsToUnlock } from '../logic/puppyItems'
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

// 子犬のカード：絵・名前・育ち具合・ひとこと
export default function PuppyCard({ words, log, today, goal, name, onChangeName }: Props) {
  const mastered = masteredCount(words)
  const progress = stageProgress(mastered)
  const mood = puppyMood(log, today, goal)
  const displayName = name.trim() === '' ? 'こいぬ' : name
  const owned = itemsForStage(progress.stage)
  const upcoming = nextItem(progress.stage) // 次に手に入るアイテム（全部そろっていれば null）

  return (
    <section className={styles.card}>
      <div className={styles.picture}>
        <PuppyCanvas stage={progress.stage} mood={mood} />
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
          {progress.isMax
            ? '最終ステージです！'
            : `次のステージまで あと${progress.remaining}語（${WORDS_PER_STAGE}語ごと）`}
        </div>

        <div className={styles.next}>
          アイテム {owned.length} / {ITEMS.length}
          {upcoming && `　次：${upcoming.label}（あと${wordsToUnlock(upcoming) - mastered}語）`}
        </div>

        <p className={styles.message}>{moodMessage(mood, displayName)}</p>
      </div>
    </section>
  )
}
