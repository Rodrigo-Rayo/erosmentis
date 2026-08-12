import type { Client, ServiceType, Session } from '@/domain/types'
import { SessionRow } from './SessionRow'
import styles from './SessionDayList.module.css'

interface SessionDayListProps {
  sessions: Session[]
  clientsById: Map<string, Client>
  serviceTypesById: Map<string, ServiceType>
  onMarkPaid: (session: Session) => void
  /** 'asc' shows soonest/oldest day first (agenda-style); 'desc' shows most recent first (history-style). */
  order?: 'asc' | 'desc'
}

function dayKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function formatDayHeader(timestamp: number): string {
  const date = new Date(timestamp)
  const today = new Date()
  const isSameDay = dayKey(timestamp) === dayKey(today.getTime())

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = dayKey(timestamp) === dayKey(yesterday.getTime())

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = dayKey(timestamp) === dayKey(tomorrow.getTime())

  if (isSameDay) return 'Hoy'
  if (isYesterday) return 'Ayer'
  if (isTomorrow) return 'Mañana'

  const sameYear = date.getFullYear() === today.getFullYear()
  const formatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: sameYear ? undefined : 'numeric',
  }).format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/** Groups sessions by calendar day and renders a date header above each group. */
export function SessionDayList({
  sessions,
  clientsById,
  serviceTypesById,
  onMarkPaid,
  order = 'desc',
}: SessionDayListProps) {
  const sorted = [...sessions].sort((a, b) => (order === 'asc' ? a.startAt - b.startAt : b.startAt - a.startAt))
  const groups: { key: string; label: string; items: Session[] }[] = []

  for (const session of sorted) {
    const key = dayKey(session.startAt)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.key === key) {
      lastGroup.items.push(session)
    } else {
      groups.push({ key, label: formatDayHeader(session.startAt), items: [session] })
    }
  }

  return (
    <div className={styles.wrapper}>
      {groups.map((group) => (
        <section key={group.key} className={styles.group}>
          <h3 className={styles.dayHeader}>{group.label}</h3>
          <div className={styles.rows}>
            {group.items
              .slice()
              .sort((a, b) => a.startAt - b.startAt)
              .map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  client={clientsById.get(session.clientId)}
                  serviceType={serviceTypesById.get(session.serviceTypeId)}
                  onMarkPaid={onMarkPaid}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
