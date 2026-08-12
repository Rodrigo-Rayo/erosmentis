import { useNavigate, useLocation } from 'react-router-dom'
import { formatCents } from '@/domain/money'
import type { Client, ServiceType, Session } from '@/domain/types'
import styles from './SessionRow.module.css'

interface SessionRowProps {
  session: Session
  client: Client | undefined
  serviceType: ServiceType | undefined
  onMarkPaid: (session: Session) => void
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

export function SessionRow({ session, client, serviceType, onMarkPaid }: SessionRowProps) {
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

  return (
    <button type="button" className={styles.row} onClick={openDetail}>
      <span className={styles.time}>{time}</span>
      <span className={styles.accent} style={{ background: `var(--color-${serviceType?.colorToken ?? 'accent'})` }} />
      <span className={styles.body}>
        <div className={styles.name}>{client?.displayName ?? 'Cliente'}</div>
        <div className={styles.meta}>
          <span className={styles.serviceTypeName}>{serviceType?.name ?? ''}</span>
          <span className={styles.modalityIcon}>{session.modality === 'online' ? '💻' : '🏠'}</span>
          {isCancelled && <span className={`${styles.statusChip} ${styles.statusCancelled}`}>Cancelada</span>}
          {!isCancelled && (
            <span className={`${styles.statusChip} ${STATUS_CLASS[session.paymentStatus]}`}>
              {STATUS_LABEL[session.paymentStatus]}
            </span>
          )}
        </div>
      </span>
      {session.paymentStatus === 'pending' && !isCancelled ? (
        <button
          type="button"
          className={styles.payButton}
          onClick={(e) => {
            e.stopPropagation()
            onMarkPaid(session)
          }}
        >
          Cobrar
        </button>
      ) : (
        <span className={styles.price}>{formatCents(session.priceCents)}</span>
      )}
    </button>
  )
}
