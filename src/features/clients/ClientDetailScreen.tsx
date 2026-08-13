import { useParams, Link, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getClient } from '@/db/repositories/clients.repo'
import { listSessionsForClient, markSessionPaid } from '@/db/repositories/sessions.repo'
import {
  getActivePackagesForClient,
  getPackageBalance,
  deletePackage,
  restorePackage,
} from '@/db/repositories/packages.repo'
import { db } from '@/db/database'
import { SessionDayList } from '@/components/list/SessionDayList'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCents } from '@/domain/money'
import { calculateMonthTotals } from '@/domain/totals'
import { getErrorMessage } from '@/domain/errors'
import { useState } from 'react'
import { MarkPaidSheet } from '@/features/sessions/MarkPaidSheet'
import { useToast } from '@/components/ui/Toast'
import { useNotFoundAfterDelay } from '@/hooks/useNotFoundAfterDelay'
import { CoupleIcon } from '@/components/icons/SessionIcons'
import type { PaymentMethod, Session } from '@/domain/types'
import styles from './ClientDetailScreen.module.css'

export function ClientDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const toast = useToast()
  const [payingSession, setPayingSession] = useState<Session | null>(null)

  const client = useLiveQuery(() => (id ? getClient(id) : undefined), [id])
  const clientNotFound = useNotFoundAfterDelay(client)
  const sessions = useLiveQuery(() => (id ? listSessionsForClient(id) : []), [id], [])
  const activePackages = useLiveQuery(() => (id ? getActivePackagesForClient(id) : []), [id], [])
  const serviceTypes = useLiveQuery(() => db.serviceTypes.toArray(), [], [])

  const packageBalance = useLiveQuery(
    () => (activePackages[0] ? getPackageBalance(activePackages[0].id) : Promise.resolve(null)),
    [activePackages[0]?.id],
    null,
  )

  if (!client) {
    return (
      <p>
        {clientNotFound ? (
          <>
            No se ha encontrado este paciente. <Link to="/clientes">Volver a Pacientes</Link>
          </>
        ) : (
          'Cargando…'
        )}
      </p>
    )
  }

  // Same session-derived calculation as the Month screen: billed, collected and pending
  // all come from each session's own paymentStatus, so they always reconcile — summing a
  // separately-queried Payment list here previously let "Cobrado" drift from "Facturado"
  // whenever a paid session was later deleted, or diverge because of package lump-sum
  // purchase payments that don't map 1:1 to a single session.
  const totals = calculateMonthTotals(sessions)
  const serviceTypesById = new Map(serviceTypes.map((s) => [s.id, s]))
  const phone = client.people[0]?.phone

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

  async function handleDeletePackage(packageId: string) {
    try {
      await deletePackage(packageId)
      toast.show('Bono eliminado', {
        label: 'Deshacer',
        onClick: () => restorePackage(packageId).catch((error) => toast.show(getErrorMessage(error))),
      })
    } catch (error) {
      toast.show(getErrorMessage(error))
    }
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <span className={styles.avatar} aria-hidden="true">
          {client.kind === 'couple' ? (
            <CoupleIcon className={styles.avatarIcon} />
          ) : (
            client.displayName.charAt(0).toUpperCase()
          )}
        </span>
        <h1 className={styles.name}>{client.displayName}</h1>
        <div className={styles.contactRow}>
          {phone && (
            <>
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
            </>
          )}
          <Link
            to={`/clientes/${client.id}/editar`}
            state={{ backgroundLocation: location }}
            className={styles.contactButton}
          >
            ✎ Editar
          </Link>
        </div>
      </header>

      {activePackages[0] && packageBalance ? (
        <section className={styles.packageCard}>
          <div className={styles.packageCardMain}>
            <div className={styles.packageTitle}>{activePackages[0].label}</div>
            <div className={styles.packageBalance}>
              {packageBalance.used} de {activePackages[0].totalSessions} usadas
              {packageBalance.reserved > 0 &&
                `, ${packageBalance.reserved} reservada${packageBalance.reserved > 1 ? 's' : ''}`}
            </div>
          </div>
          <button
            type="button"
            className={styles.packageDeleteButton}
            onClick={() => handleDeletePackage(activePackages[0].id)}
            aria-label="Eliminar bono"
          >
            Eliminar
          </button>
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
          <span className={styles.totalValue}>{formatCents(totals.billedCents)}</span>
        </div>
        <div className={styles.totalItem}>
          <span className={styles.totalLabel}>Cobrado</span>
          <span className={styles.totalValue}>{formatCents(totals.collectedCents)}</span>
        </div>
        <div className={styles.totalItem}>
          <span className={styles.totalLabel}>Pendiente</span>
          <span className={styles.totalValuePending}>{formatCents(totals.pendingCents)}</span>
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
          <SessionDayList
            sessions={sessions}
            clientsById={new Map([[client.id, client]])}
            serviceTypesById={serviceTypesById}
            onMarkPaid={setPayingSession}
            order="desc"
          />
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
