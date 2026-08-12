import { useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '@/components/ui/Sheet'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { db } from '@/db/database'
import {
  getSession,
  markSessionPaid,
  softDeleteSession,
  restoreSession,
  updateSessionAttendance,
} from '@/db/repositories/sessions.repo'
import { formatCents } from '@/domain/money'
import type { Attendance, PaymentMethod } from '@/domain/types'
import { MarkPaidSheet } from './MarkPaidSheet'
import styles from './SessionDetailSheet.module.css'

const ATTENDANCE_OPTIONS: { value: Attendance; label: string }[] = [
  { value: 'scheduled', label: 'Programada' },
  { value: 'attended', label: 'Realizada' },
  { value: 'cancelled_by_client', label: 'Cancelada (cliente)' },
  { value: 'cancelled_by_therapist', label: 'Cancelada (tú)' },
  { value: 'no_show', label: 'No se presentó' },
]

export function SessionDetailSheet() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [showPayment, setShowPayment] = useState(false)

  const session = useLiveQuery(() => (id ? getSession(id) : undefined), [id])
  const client = useLiveQuery(
    () => (session ? db.clients.get(session.clientId) : undefined),
    [session?.clientId],
  )
  const serviceType = useLiveQuery(
    () => (session ? db.serviceTypes.get(session.serviceTypeId) : undefined),
    [session?.serviceTypeId],
  )

  function handleClose() {
    const backgroundLocation = (location.state as { backgroundLocation?: unknown } | null)
      ?.backgroundLocation
    if (backgroundLocation) {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
  }

  async function handleDelete() {
    if (!session) return
    await softDeleteSession(session.id)
    toast.show('Sesión eliminada', {
      label: 'Deshacer',
      onClick: () => restoreSession(session.id),
    })
    handleClose()
  }

  async function handlePaymentConfirm(method: PaymentMethod) {
    if (!session) return
    await markSessionPaid({ sessionId: session.id, method })
    toast.show('Cobro registrado')
    setShowPayment(false)
  }

  if (!session) {
    return (
      <Sheet title="Sesión" onClose={handleClose}>
        <p>Cargando…</p>
      </Sheet>
    )
  }

  return (
    <Sheet title={client?.displayName ?? 'Sesión'} onClose={handleClose}>
      <div className={styles.wrapper}>
        <div className={styles.summary}>
          <span className={styles.serviceType}>{serviceType?.name}</span>
          <span className={styles.datetime}>
            {new Intl.DateTimeFormat('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            }).format(new Date(session.startAt))}
          </span>
          <span className={styles.price}>{formatCents(session.priceCents)}</span>
        </div>

        <section className={styles.field}>
          <label className={styles.label}>Asistencia</label>
          <div className={styles.chipRow}>
            {ATTENDANCE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={session.attendance === option.value}
                tone="accent"
                onClick={() => updateSessionAttendance(session.id, option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </section>

        {session.notes && (
          <section className={styles.field}>
            <label className={styles.label}>Notas</label>
            <p className={styles.notes}>{session.notes}</p>
          </section>
        )}

        <div className={styles.actions}>
          {session.paymentStatus === 'pending' && (
            <Button fullWidth onClick={() => setShowPayment(true)}>
              Marcar como cobrada
            </Button>
          )}
          <Button variant="danger" fullWidth onClick={handleDelete}>
            Eliminar sesión
          </Button>
        </div>
      </div>

      {showPayment && (
        <MarkPaidSheet
          session={session}
          onConfirm={handlePaymentConfirm}
          onClose={() => setShowPayment(false)}
        />
      )}
    </Sheet>
  )
}
