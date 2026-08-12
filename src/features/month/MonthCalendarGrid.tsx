import { isSessionBillable } from '@/domain/pricing'
import type { Session } from '@/domain/types'
import styles from './MonthCalendarGrid.module.css'

interface MonthCalendarGridProps {
  cursor: Date
  sessions: Session[]
  selectedDay: Date | null
  onSelectDay: (day: Date) => void
}

const WEEKDAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

type DotStatus = 'none' | 'pending' | 'ok'

function dotStatusForDay(sessions: Session[], date: Date): DotStatus {
  const key = dayKey(date)
  const daySessions = sessions.filter((s) => dayKey(new Date(s.startAt)) === key)
  if (daySessions.length === 0) return 'none'
  const hasPending = daySessions.some((s) => isSessionBillable(s) && s.paymentStatus === 'pending')
  return hasPending ? 'pending' : 'ok'
}

export function MonthCalendarGrid({ cursor, sessions, selectedDay, onSelectDay }: MonthCalendarGridProps) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = (firstOfMonth.getDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < startWeekday; i++) {
    const date = new Date(year, month, 1 - (startWeekday - i))
    cells.push({ date, inMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
  }

  const today = new Date()

  return (
    <div className={styles.wrapper}>
      <div className={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className={styles.weekdayLabel}>
            {label}
          </span>
        ))}
      </div>
      <div className={styles.grid}>
        {cells.map(({ date, inMonth }) => {
          const status = dotStatusForDay(sessions, date)
          const isToday = dayKey(date) === dayKey(today)
          const isSelected = selectedDay !== null && dayKey(date) === dayKey(selectedDay)
          return (
            <button
              type="button"
              key={date.toISOString()}
              className={[
                styles.cell,
                !inMonth ? styles.outOfMonth : '',
                isSelected ? styles.selected : '',
                isToday && !isSelected ? styles.today : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDay(date)}
            >
              <span className={styles.dayNumber}>{date.getDate()}</span>
              {status !== 'none' && (
                <span className={`${styles.dot} ${status === 'pending' ? styles.dotPending : styles.dotOk}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
