import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { monthRange, capitalize } from '@/domain/dates'
import { calculateMonthTotals } from '@/domain/totals'
import { isSessionBillable } from '@/domain/pricing'
import { listSessionsInRange, markSessionPaid } from '@/db/repositories/sessions.repo'
import { SessionDayList } from '@/components/list/SessionDayList'
import { EmptyState } from '@/components/ui/EmptyState'
import { MarkPaidSheet } from '@/features/sessions/MarkPaidSheet'
import { useToast } from '@/components/ui/Toast'
import { formatCents } from '@/domain/money'
import { getErrorMessage } from '@/domain/errors'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { SlideFade } from '@/components/motion/SlideFade'
import { Chip } from '@/components/ui/Chip'
import { ReportsPanel } from '@/features/reports/ReportsPanel'
import type { PaymentMethod, Session } from '@/domain/types'
import styles from './MonthScreen.module.css'

type SubTab = 'mes' | 'informes'

export function MonthScreen() {
  const toast = useToast()
  const [subTab, setSubTab] = useState<SubTab>('mes')
  const [monthOffset, setMonthOffset] = useState(0)
  const [showPendingOnly, setShowPendingOnly] = useState(false)
  const [payingSession, setPayingSession] = useState<Session | null>(null)

  const cursor = useMemo(() => {
    const date = new Date()
    date.setMonth(date.getMonth() + monthOffset, 1)
    return date
  }, [monthOffset])

  const range = monthRange(cursor)
  const sessions = useLiveQuery(
    () => listSessionsInRange(range.start, range.end),
    [range.start, range.end],
    [],
  )
  const clients = useLiveQuery(() => db.clients.toArray(), [], [])
  const serviceTypes = useLiveQuery(() => db.serviceTypes.toArray(), [], [])

  const totals = calculateMonthTotals(sessions)
  const clientsById = new Map(clients.map((c) => [c.id, c]))
  const serviceTypesById = new Map(serviceTypes.map((s) => [s.id, s]))

  const visibleSessions = showPendingOnly
    ? sessions.filter((s) => isSessionBillable(s) && s.paymentStatus === 'pending')
    : sessions

  const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(cursor)

  async function handleConfirmPayment(method: PaymentMethod) {
    if (!payingSession) return
    try {
      const recorded = await markSessionPaid({ sessionId: payingSession.id, method })
      toast.show(recorded ? 'Cobro registrado' : 'Esta sesión ya estaba cobrada')
    } catch (error) {
      toast.show(getErrorMessage(error))
    } finally {
      setPayingSession(null)
    }
  }

  function handleMonthNav(delta: number) {
    setMonthOffset((v) => v + delta)
  }

  const monthSwipe = useSwipeNavigation(
    () => handleMonthNav(1),
    () => handleMonthNav(-1),
  )

  return (
    <div className={styles.wrapper}>
      <div className={styles.subTabToggle}>
        <Chip selected={subTab === 'mes'} tone="accent" onClick={() => setSubTab('mes')}>
          Mes
        </Chip>
        <Chip selected={subTab === 'informes'} tone="accent" onClick={() => setSubTab('informes')}>
          Informes y gastos
        </Chip>
      </div>

      {subTab === 'mes' ? (
        <div style={{ touchAction: 'pan-y' }} {...monthSwipe}>
          <header className={styles.header}>
            <button type="button" className={styles.navButton} onClick={() => handleMonthNav(-1)}>
              ‹
            </button>
            <h1 className={styles.month}>{capitalize(monthLabel)}</h1>
            <button type="button" className={styles.navButton} onClick={() => handleMonthNav(1)}>
              ›
            </button>
          </header>

          <SlideFade itemKey={monthOffset} className={styles.slideContent}>
            <section className={styles.totals}>
              <button type="button" className={styles.totalItem} onClick={() => setShowPendingOnly(false)}>
                <span className={styles.totalLabel}>Facturado</span>
                <span className={styles.totalValue}>{formatCents(totals.billedCents)}</span>
              </button>
              <button type="button" className={styles.totalItem} onClick={() => setShowPendingOnly(false)}>
                <span className={styles.totalLabel}>Cobrado</span>
                <span className={styles.totalValue}>{formatCents(totals.collectedCents)}</span>
              </button>
              <button
                type="button"
                className={`${styles.totalItem} ${showPendingOnly ? styles.totalItemActive : ''}`}
                onClick={() => setShowPendingOnly((v) => !v)}
              >
                <span className={styles.totalLabel}>Pendiente</span>
                <span className={styles.totalValuePending}>{formatCents(totals.pendingCents)}</span>
              </button>
            </section>

            <section className={styles.list}>
              {visibleSessions.length === 0 ? (
                <EmptyState
                  emoji={showPendingOnly ? '✨' : '🌿'}
                  title={showPendingOnly ? 'Nada pendiente de cobro' : 'Sin sesiones este mes'}
                />
              ) : (
                <SessionDayList
                  sessions={visibleSessions}
                  clientsById={clientsById}
                  serviceTypesById={serviceTypesById}
                  onMarkPaid={setPayingSession}
                  order="asc"
                />
              )}
            </section>
          </SlideFade>
        </div>
      ) : (
        <ReportsPanel />
      )}

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
