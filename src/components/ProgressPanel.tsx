import { DAILY_GOAL_OPTIONS } from '../constants'
import { answeredToday, bestStreak, buildCalendar, currentStreak } from '../logic/progress'
import type { DailyLog } from '../types'
import shared from '../shared.module.css'
import styles from './ProgressPanel.module.css'

type Props = {
  log: DailyLog // 日ごとの記録
  today: string // 今日の日付キー（"2026-11-16"）
  goal: number // 1日の目標問題数
  onChangeGoal: (goal: number) => void
}

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']

export default function ProgressPanel({ log, today, goal, onChangeGoal }: Props) {
  const answered = answeredToday(log, today)
  const streak = currentStreak(log, today, goal)
  const best = bestStreak(log, today, goal)
  const achieved = answered >= goal
  const percent = Math.min(100, Math.round((answered / goal) * 100))
  const calendar = buildCalendar(log, today, goal)

  return (
    <section className={styles.panel}>
      <div className={styles.summary}>
        <span>
          今日 <strong>{answered}</strong> / {goal}問
        </span>
        <span>
          🔥 {streak}日連続<span className={shared.muted}>（最高 {best}日）</span>
        </span>
      </div>

      {/* 進み具合のバー。role="progressbar" は、スクリーンリーダーに「進捗バー」だと伝える印 */}
      <div
        className={styles.bar}
        role="progressbar"
        aria-valuenow={Math.min(answered, goal)}
        aria-valuemin={0}
        aria-valuemax={goal}
      >
        <div className={`${styles.fill} ${achieved ? styles.fillDone : ''}`} style={{ width: `${percent}%` }} />
      </div>
      {achieved && <p className={styles.done}>🎉 今日の目標を達成しました！</p>}

      {/* details / summary は、クリックで開閉できる HTML 標準の部品（JavaScript いらず） */}
      <details className={styles.details}>
        <summary>カレンダーと目標の設定</summary>

        <label className={styles.goalRow}>
          1日の目標
          <select
            className={shared.select}
            value={goal}
            onChange={(e) => onChangeGoal(Number(e.target.value))}
          >
            {DAILY_GOAL_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}問
              </option>
            ))}
          </select>
        </label>

        <div className={styles.calendar}>
          {WEEKDAYS.map((w) => (
            <div key={w} className={styles.weekday}>
              {w}
            </div>
          ))}
          {calendar.flat().map((d) => {
            const classes = [styles.day, styles[d.status]]
            if (d.isToday) classes.push(styles.today)
            if (d.isFuture) classes.push(styles.future)
            return (
              <div key={d.key} className={classes.join(' ')} title={d.key}>
                {d.day}
              </div>
            )
          })}
        </div>
        <p className={`${shared.muted} ${styles.legend}`}>濃い色：目標達成　薄い色：少しやった</p>
      </details>
    </section>
  )
}
