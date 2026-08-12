import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { dayRange, capitalize } from '@/domain/dates'
import { pendingSessions } from '@/domain/totals'
import { listSessionsInRange, markSessionPaid } from '@/db/repositories/sessions.repo'
import { SessionRow } from '@/components/list/SessionRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { MarkPaidSheet } from '@/features/sessions/MarkPaidSheet'
import { useToast } from '@/components/ui/Toast'
import { formatCents } from '@/domain/money'
import { getErrorMessage } from '@/domain/errors'
import type { PaymentMethod, Session } from '@/domain/types'
import styles from './TodayScreen.module.css'

export function TodayScreen() {
  const toast = useToast()
  const [payingSession, setPayingSession] = useState<Session | null>(null)
  const today = dayRange(new Date())

  const sessions = useLiveQuery(
    () => listSessionsInRange(today.start, today.end),
    [today.start, today.end],
    [],
  )
  const clients = useLiveQuery(() => db.clients.toArray(), [], [])
  const serviceTypes = useLiveQuery(() => db.serviceTypes.toArray(), [], [])

  const allPendingCandidates = useLiveQuery(
    () => db.sessions.where('paymentStatus').equals('pending').toArray(),
    [],
    [],
  )
  const overduePending = pendingSessions(allPendingCandidates)
  const overdueTotal = overduePending.reduce((sum, s) => sum + s.priceCents, 0)

  const clientsById = new Map(clients.map((c) => [c.id, c]))
  const serviceTypesById = new Map(serviceTypes.map((s) => [s.id, s]))

  const dateLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

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
          <p className={styles.eyebrow}>Hoy</p>
          <h1 className={styles.date}>{capitalize(dateLabel)}</h1>
        </div>
        <img
          src={`${import.meta.env.BASE_URL}icons/logo-source.png`}
          alt=""
          aria-hidden="true"
          className={styles.mark}
        />
      </header>

      {overduePending.length > 0 && (
        <section className={styles.pendingBanner}>
          <div>
            <div className={styles.pendingTitle}>Pendiente de cobro</div>
            <div className={styles.pendingSubtitle}>{overduePending.length} sesiones</div>
          </div>
          <div className={styles.pendingAmount}>{formatCents(overdueTotal)}</div>
        </section>
      )}

      <section className={styles.list}>
        {sessions.length === 0 ? (
          <EmptyState
            emoji="🌿"
            title="Sin sesiones hoy"
            description="Toca el botón + para agendar la próxima."
          />
        ) : (
          sessions.map((session) => (
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
