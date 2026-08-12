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
  updateSessionDetails,
} from '@/db/repositories/sessions.repo'
import { listServiceTypes } from '@/db/repositories/serviceTypes.repo'
import { formatCents } from '@/domain/money'
import type { Attendance, Modality, PaymentMethod } from '@/domain/types'
import { MarkPaidSheet } from './MarkPaidSheet'
import styles from './SessionDetailSheet.module.css'

const ATTENDANCE_OPTIONS: { value: Attendance; label: string }[] = [
  { value: 'scheduled', label: 'Programada' },
  { value: 'attended', label: 'Realizada' },
  { value: 'cancelled_by_client', label: 'Cancelada (paciente)' },
  { value: 'cancelled_by_therapist', label: 'Cancelada (tú)' },
  { value: 'no_show', label: 'No se presentó' },
]

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function SessionDetailSheet() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [showPayment, setShowPayment] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [editServiceTypeId, setEditServiceTypeId] = useState('')
  const [editStartAt, setEditStartAt] = useState('')
  const [editModality, setEditModality] = useState<Modality>('online')
  const [editPriceEuros, setEditPriceEuros] = useState('0')
  const [editNotes, setEditNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const session = useLiveQuery(() => (id ? getSession(id) : undefined), [id])
  const client = useLiveQuery(
    () => (session ? db.clients.get(session.clientId) : undefined),
    [session?.clientId],
  )
  const serviceType = useLiveQuery(
    () => (session ? db.serviceTypes.get(session.serviceTypeId) : undefined),
    [session?.serviceTypeId],
  )
  const serviceTypes = useLiveQuery(() => listServiceTypes(), [], [])

  function enterEditMode() {
    if (!session) return
    setEditServiceTypeId(session.serviceTypeId)
    setEditStartAt(toLocalInputValue(new Date(session.startAt)))
    setEditModality(session.modality)
    setEditPriceEuros((session.priceCents / 100).toString())
    setEditNotes(session.notes)
    setIsEditing(true)
  }

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

  async function handleSaveEdit() {
    if (!session) return
    const startAt = new Date(editStartAt)
    if (Number.isNaN(startAt.getTime())) return
    setIsSaving(true)
    try {
      await updateSessionDetails(session.id, {
        serviceTypeId: editServiceTypeId,
        startAt: startAt.getTime(),
        modality: editModality,
        priceCents: Math.round((Number.parseFloat(editPriceEuros) || 0) * 100),
        notes: editNotes,
      })
      toast.show('Sesión actualizada')
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (!session) {
    return (
      <Sheet title="Sesión" onClose={handleClose}>
        <p>Cargando…</p>
      </Sheet>
    )
  }

  if (isEditing) {
    return (
      <Sheet title={`Editar sesión — ${client?.displayName ?? ''}`} onClose={() => setIsEditing(false)}>
        <div className={styles.wrapper}>
          <section className={styles.field}>
            <label className={styles.label}>Tipo de sesión</label>
            <div className={styles.chipRow}>
              {serviceTypes.map((type) => (
                <Chip
                  key={type.id}
                  selected={type.id === editServiceTypeId}
                  tone="accent"
                  onClick={() => setEditServiceTypeId(type.id)}
                >
                  {type.name}
                </Chip>
              ))}
            </div>
          </section>

          <section className={styles.field}>
            <label className={styles.label}>Fecha y hora</label>
            <input
              type="datetime-local"
              className={styles.editInput}
              value={editStartAt}
              onChange={(e) => setEditStartAt(e.target.value)}
            />
          </section>

          <section className={styles.field}>
            <label className={styles.label}>Modalidad</label>
            <div className={styles.chipRow}>
              <Chip selected={editModality === 'online'} tone="accent" onClick={() => setEditModality('online')}>
                💻 Online
              </Chip>
              <Chip
                selected={editModality === 'in_person'}
                tone="accent"
                onClick={() => setEditModality('in_person')}
              >
                🏠 Presencial
              </Chip>
            </div>
          </section>

          <section className={styles.field}>
            <label className={styles.label}>Precio</label>
            <input
              type="number"
              inputMode="decimal"
              className={styles.editInput}
              value={editPriceEuros}
              onChange={(e) => setEditPriceEuros(e.target.value)}
            />
          </section>

          <section className={styles.field}>
            <label className={styles.label}>Notas</label>
            <textarea
              className={styles.editTextarea}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
            />
          </section>

          <div className={styles.actions}>
            <Button fullWidth onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title={client?.displayName ?? 'Sesión'} onClose={handleClose}>
      <div className={styles.wrapper}>
        <div className={styles.summary}>
          <span className={styles.serviceType}>{serviceType?.name}</span>
          <span className={styles.datetime}>
            {capitalize(
              new Intl.DateTimeFormat('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(session.startAt)),
            )}
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
          <Button variant="secondary" fullWidth onClick={enterEditMode}>
            Editar sesión
          </Button>
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

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
