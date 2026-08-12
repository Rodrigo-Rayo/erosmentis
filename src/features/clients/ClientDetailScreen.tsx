import { useParams, Link, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getClient } from '@/db/repositories/clients.repo'
import { listSessionsForClient, markSessionPaid } from '@/db/repositories/sessions.repo'
import { getActivePackagesForClient, getPackageBalance } from '@/db/repositories/packages.repo'
import { listPaymentsForClient } from '@/db/repositories/payments.repo'
import { db } from '@/db/database'
import { SessionRow } from '@/components/list/SessionRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCents, sumCents } from '@/domain/money'
import { isSessionBillable } from '@/domain/pricing'
import { useState } from 'react'
import { MarkPaidSheet } from '@/features/sessions/MarkPaidSheet'
import { useToast } from '@/components/ui/Toast'
import type { PaymentMethod, Session } from '@/domain/types'
import styles from './ClientDetailScreen.module.css'

export function ClientDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const toast = useToast()
  const [payingSession, setPayingSession] = useState<Session | null>(null)

  const client = useLiveQuery(() => (id ? getClient(id) : undefined), [id])
  const sessions = useLiveQuery(() => (id ? listSessionsForClient(id) : []), [id], [])
  const payments = useLiveQuery(() => (id ? listPaymentsForClient(id) : []), [id], [])
  const activePackages = useLiveQuery(() => (id ? getActivePackagesForClient(id) : []), [id], [])
  const serviceTypes = useLiveQuery(() => db.serviceTypes.toArray(), [], [])

  const packageBalance = useLiveQuery(
    () => (activePackages[0] ? getPackageBalance(activePackages[0].id) : Promise.resolve(null)),
    [activePackages[0]?.id],
    null,
  )

  if (!client) {
    return <p>Cargando…</p>
  }

  const billed = sumCents(sessions.filter(isSessionBillable).map((s) => s.priceCents))
  const collected = sumCents(payments.map((p) => p.amountCents))
  const serviceTypesById = new Map(serviceTypes.map((s) => [s.id, s]))
  const phone = client.people[0]?.phone

  async function handleConfirmPayment(method: PaymentMethod) {
    if (!payingSession) return
    await markSessionPaid({ sessionId: payingSession.id, method })
    toast.show('Cobro registrado')
    setPayingSession(null)
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.avatar} aria-hidden="true">
          {client.kind === 'couple' ? '💑' : client.displayName.charAt(0).toUpperCase()}
        </span>
        <h1 className={styles.name}>{client.displayName}</h1>
        {phone && (
          <div className={styles.contactRow}>
            <a href={`tel:${phone}`} className={styles.contactButton}>
              📞 Llamar
            </a>
            <a
              href={`https://wa.me/${phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className={styles.contactButton}
            >
              💬 WhatsApp
            </a>
          </div>
        )}
      </header>

      {activePackages[0] && packageBalance ? (
        <section className={styles.packageCard}>
          <div className={styles.packageTitle}>{activePackages[0].label}</div>
          <div className={styles.packageBalance}>
            {packageBalance.used} de {activePackages[0].totalSessions} usadas
            {packageBalance.reserved > 0 && `, ${packageBalance.reserved} reservada${packageBalance.reserved > 1 ? 's' : ''}`}
          </div>
        </section>
      ) : (
        <Link
          to={`/clientes/${client.id}/bono/nuevo`}
          state={{ backgroundLocation: location }}
          className={styles.newPackageButton}
        >
          + Añadir bono
        </Link>
      )}

      <section className={styles.totals}>
        <div className={styles.totalItem}>
          <span className={styles.totalLabel}>Facturado</span>
          <span className={styles.totalValue}>{formatCents(billed)}</span>
        </div>
        <div className={styles.totalItem}>
          <span className={styles.totalLabel}>Cobrado</span>
          <span className={styles.totalValue}>{formatCents(collected)}</span>
        </div>
      </section>

      <Link
        to="/sesion/nueva"
        state={{ backgroundLocation: location, presetClientId: client.id }}
        className={styles.newSessionButton}
      >
        + Nueva sesión con {client.displayName.split(' ')[0]}
      </Link>

      <section className={styles.history}>
        <h2 className={styles.historyTitle}>Historial</h2>
        {sessions.length === 0 ? (
          <EmptyState emoji="📋" title="Sin sesiones aún" />
        ) : (
          <div className={styles.list}>
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                client={client}
                serviceType={serviceTypesById.get(session.serviceTypeId)}
                onMarkPaid={setPayingSession}
              />
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
