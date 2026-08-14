import type { KeyboardEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { formatCents } from '@/domain/money'
import { MonitorIcon, HomeIcon, CoinIcon } from '@/components/icons/SessionIcons'
import type { Client, ServiceType, Session } from '@/domain/types'
import styles from './SessionRow.module.css'

interface SessionRowProps {
  session: Session
  client: Client | undefined
  serviceType: ServiceType | undefined
  onMarkPaid: (session: Session) => void
  /** Dims the row for past sessions that are already resolved (paid, free, or via package) —
   * a still-pending session stays at full contrast even if its day is in the past, since it's
   * money still owed. */
  dim?: boolean
}

const STATUS_LABEL: Record<Session['paymentStatus'], string> = {
  pending: 'Pendiente',
  paid: 'Cobrada',
  free: 'Gratuita',
  package: 'Bono',
}

const STATUS_CLASS: Record<Session['paymentStatus'], string> = {
  pending: styles.statusPending,
  paid: styles.statusPaid,
  free: styles.statusFree,
  package: styles.statusPackage,
}

export function SessionRow({ session, client, serviceType, onMarkPaid, dim = false }: SessionRowProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(session.startAt),
  )

  const isCancelled =
    session.attendance === 'cancelled_by_client' || session.attendance === 'cancelled_by_therapist'

  function openDetail() {
    navigate(`/sesion/${session.id}`, { state: { backgroundLocation: location } })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetail()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.row} ${dim ? styles.rowDim : ''}`}
      onClick={openDetail}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.timeCol}>
        <span className={styles.time}>{time}</span>
        <span
          className={styles.dot}
          style={{ background: `var(--color-${serviceType?.colorToken ?? 'accent'})` }}
        />
      </span>
      <span className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.name}>{client?.displayName ?? 'Paciente'}</span>
          {isCancelled ? (
            <span className={`${styles.statusChip} ${styles.statusCancelled}`}>Cancelada</span>
          ) : (
            <span className={`${styles.statusChip} ${STATUS_CLASS[session.paymentStatus]}`}>
              {STATUS_LABEL[session.paymentStatus]}
            </span>
          )}
        </div>
        <div className={styles.meta}>
          <span className={styles.serviceTypeName}>{serviceType?.name ?? ''}</span>
          {session.modality === 'online' ? (
            <MonitorIcon className={styles.modalityIcon} aria-label="Online" />
          ) : (
            <HomeIcon className={styles.modalityIcon} aria-label="Presencial" />
          )}
        </div>
      </span>
      {session.paymentStatus === 'pending' && !isCancelled ? (
        <button
          type="button"
          className={styles.payButton}
          aria-label="Marcar como cobrada"
          onClick={(e) => {
            e.stopPropagation()
            onMarkPaid(session)
          }}
        >
          <CoinIcon className={styles.payIcon} />
        </button>
      ) : (
        <span className={styles.price}>{formatCents(session.priceCents)}</span>
      )}
    </div>
  )
}
