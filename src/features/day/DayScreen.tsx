import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useLocation } from 'react-router-dom'
import { db } from '@/db/database'
import { dayRange, monthRange, weekRange, shiftDays, capitalize } from '@/domain/dates'
import { getWeekFreeSlots, startOfWeekMonday } from '@/domain/schedule'
import { listSessionsInRange, markSessionPaid } from '@/db/repositories/sessions.repo'
import { SessionRow } from '@/components/list/SessionRow'
import { MonthCalendarGrid } from '@/features/month/MonthCalendarGrid'
import { EmptyState } from '@/components/ui/EmptyState'
import { MarkPaidSheet } from '@/features/sessions/MarkPaidSheet'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/domain/errors'
import type { PaymentMethod, Session } from '@/domain/types'
import styles from './DayScreen.module.css'

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatWeekRangeLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)

  const sameMonth = monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear()
  const dayOnly = new Intl.DateTimeFormat('es-ES', { day: 'numeric' })
  const dayMonth = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
  const dayMonthYear = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

  if (sameMonth) {
    return `${dayOnly.format(monday)}–${dayMonth.format(sunday)}`
  }
  const sameYear = monday.getFullYear() === sunday.getFullYear()
  const startLabel = sameYear ? dayMonth.format(monday) : dayMonthYear.format(monday)
  return `${startLabel} – ${dayMonthYear.format(sunday)}`
}

export function DayScreen() {
  const toast = useToast()
  const location = useLocation()
  const [payingSession, setPayingSession] = useState<Session | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
  const [monthOffset, setMonthOffset] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)

  const monthCursor = useMemo(() => {
    const date = new Date()
    date.setMonth(date.getMonth() + monthOffset, 1)
    return date
  }, [monthOffset])

  const monthRangeValue = monthRange(monthCursor)
  const monthSessions = useLiveQuery(
    () => listSessionsInRange(monthRangeValue.start, monthRangeValue.end),
    [monthRangeValue.start, monthRangeValue.end],
    [],
  )

  const dayRangeValue = dayRange(selectedDay)
  const daySessions = useLiveQuery(
    () => listSessionsInRange(dayRangeValue.start, dayRangeValue.end),
    [dayRangeValue.start, dayRangeValue.end],
    [],
  )

  const weekCursor = useMemo(() => new Date(shiftDays(Date.now(), weekOffset * 7)), [weekOffset])
  const weekRangeValue = weekRange(weekCursor, 1)
  const weekSessions = useLiveQuery(
    () => listSessionsInRange(weekRangeValue.start, weekRangeValue.end),
    [weekRangeValue.start, weekRangeValue.end],
    [],
  )
  const weekMonday = useMemo(() => startOfWeekMonday(weekCursor), [weekCursor])
  const freeSlotsByDay = useMemo(
    () => getWeekFreeSlots(weekMonday, weekSessions),
    [weekMonday, weekSessions],
  )

  const clients = useLiveQuery(() => db.clients.toArray(), [], [])
  const serviceTypes = useLiveQuery(() => db.serviceTypes.toArray(), [], [])
  const clientsById = new Map(clients.map((c) => [c.id, c]))
  const serviceTypesById = new Map(serviceTypes.map((s) => [s.id, s]))

  const today = new Date()
  const selectedDayLabel = isSameDay(selectedDay, today)
    ? 'Hoy'
    : capitalize(
        new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(
          selectedDay,
        ),
      )

  const monthLabel = capitalize(
    new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(monthCursor),
  )
  const weekRangeLabel = formatWeekRangeLabel(weekMonday)

  async function handleConfirmPayment(method: PaymentMethod) {
    if (!payingSession) return
    try {
      await markSessionPaid({ sessionId: payingSession.id, method })
      toast.show('Cobro registrado')
    } catch (error) {
      toast.show(getErrorMessage(error))
    } finally {
      setPayingSession(null)
    }
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>Día</p>
          <h1 className={styles.date}>{selectedDayLabel}</h1>
        </div>
        <img
          src={`${import.meta.env.BASE_URL}icons/logo-source.png`}
          alt=""
          aria-hidden="true"
          className={styles.mark}
        />
      </header>

      <section className={styles.calendarSection}>
        <div className={styles.calendarNav}>
          <button type="button" className={styles.navButton} onClick={() => setMonthOffset((v) => v - 1)}>
            ‹
          </button>
          <span className={styles.monthLabel}>{monthLabel}</span>
          <button type="button" className={styles.navButton} onClick={() => setMonthOffset((v) => v + 1)}>
            ›
          </button>
        </div>
        <MonthCalendarGrid
          cursor={monthCursor}
          sessions={monthSessions}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </section>

      <section className={styles.list}>
        {daySessions.length === 0 ? (
          <EmptyState
            emoji="🌿"
            title="Sin sesiones este día"
            description="Toca el botón + para agendar la próxima."
          />
        ) : (
          daySessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              client={clientsById.get(session.clientId)}
              serviceType={serviceTypesById.get(session.serviceTypeId)}
              onMarkPaid={setPayingSession}
            />
          ))
        )}
      </section>

      <section className={styles.weekSection}>
        <div className={styles.weekNav}>
          <button type="button" className={styles.navButton} onClick={() => setWeekOffset((v) => v - 1)}>
            ‹
          </button>
          <span className={styles.weekLabelGroup}>
            <span className={styles.weekLabel}>Horas libres esta semana</span>
            <span className={styles.weekRange}>{weekRangeLabel}</span>
          </span>
          <button type="button" className={styles.navButton} onClick={() => setWeekOffset((v) => v + 1)}>
            ›
          </button>
        </div>
        {freeSlotsByDay.length === 0 ? (
          <p className={styles.weekEmpty}>Sin huecos libres esta semana.</p>
        ) : (
          <div className={styles.weekList}>
            {freeSlotsByDay.map(({ date, slots }) => (
              <div key={date.toISOString()} className={styles.weekDayRow}>
                <span className={styles.weekDayLabel}>
                  {capitalize(new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date))}
                </span>
                <div className={styles.weekSlotChips}>
                  {slots.map((slot) => (
                    <Link
                      key={slot.hour}
                      to="/sesion/nueva"
                      state={{ backgroundLocation: location, presetStartAt: slot.startAt }}
                      className={styles.weekSlotChip}
                    >
                      {String(slot.hour).padStart(2, '0')}:00
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {payingSession && (
        <MarkPaidSheet
          session={payingSession}
          onConfirm={handleConfirmPayment}
          onClose={() => setPayingSession(null)}
        />
      )}
    </div>
  )
}
