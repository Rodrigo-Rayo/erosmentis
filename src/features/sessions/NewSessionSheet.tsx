import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, type Location } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import { ClientAutocomplete } from '@/features/clients/ClientAutocomplete'
import { listServiceTypes } from '@/db/repositories/serviceTypes.repo'
import { findConsumablePackage, getPackageBalance } from '@/db/repositories/packages.repo'
import {
  createSession,
  createWeeklySeries,
  listSessionsForClient,
  softDeleteSession,
} from '@/db/repositories/sessions.repo'
import { formatCents } from '@/domain/money'
import { nextHalfHourBoundary, shiftDays } from '@/domain/dates'
import type { Client, Modality } from '@/domain/types'
import styles from './NewSessionSheet.module.css'

interface NewSessionSheetProps {
  presetClientId?: string
}

function formatDateTimeLabel(date: Date): string {
  const dayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(
    date,
  )
  const timeLabel = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date)
  return `${dayLabel}, ${timeLabel}`
}

export function NewSessionSheet({ presetClientId }: NewSessionSheetProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [serviceTypeId, setServiceTypeId] = useState<string>('')
  const [startAt, setStartAt] = useState<Date>(() => nextHalfHourBoundary())
  const [modality, setModality] = useState<Modality>('online')
  const [usePackage, setUsePackage] = useState(false)
  const [customPriceCents, setCustomPriceCents] = useState<number | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [notes, setNotes] = useState('')
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [repeatWeeks, setRepeatWeeks] = useState(4)
  const [isSaving, setIsSaving] = useState(false)

  const serviceTypes = useLiveQuery(() => listServiceTypes(), [], [])

  const consumablePackage = useLiveQuery(
    () => (client && serviceTypeId ? findConsumablePackage(client.id, serviceTypeId) : Promise.resolve(null)),
    [client?.id, serviceTypeId],
    null,
  )

  const packageBalance = useLiveQuery(
    () => (consumablePackage ? getPackageBalance(consumablePackage.id) : Promise.resolve(null)),
    [consumablePackage?.id],
    null,
  )

  const selectedServiceType = useMemo(
    () => serviceTypes.find((s) => s.id === serviceTypeId) ?? null,
    [serviceTypes, serviceTypeId],
  )

  // Preselect a client when the sheet is opened from a client's own detail screen.
  useEffect(() => {
    if (!presetClientId) return
    import('@/db/repositories/clients.repo').then(({ getClient }) => {
      getClient(presetClientId).then((c) => c && setClient(c))
    })
  }, [presetClientId])

  // Smart default for service type: the client's own default, else their most recent session type, else the first active type.
  useEffect(() => {
    if (!client || serviceTypes.length === 0 || serviceTypeId) return
    let cancelled = false
    async function pickDefault() {
      if (client!.defaultServiceTypeId) {
        setServiceTypeId(client!.defaultServiceTypeId)
        return
      }
      const history = await listSessionsForClient(client!.id)
      if (!cancelled && history[0]) {
        setServiceTypeId(history[0].serviceTypeId)
        return
      }
      if (!cancelled) {
        setServiceTypeId(serviceTypes[0].id)
      }
    }
    pickDefault()
    return () => {
      cancelled = true
    }
  }, [client, serviceTypes, serviceTypeId])

  useEffect(() => {
    setUsePackage(Boolean(consumablePackage))
  }, [consumablePackage])

  const effectivePriceCents = useMemo(() => {
    if (customPriceCents !== null) return customPriceCents
    if (usePackage && consumablePackage) return consumablePackage.perSessionValueCents
    return selectedServiceType?.priceCents ?? 0
  }, [customPriceCents, usePackage, consumablePackage, selectedServiceType])

  function handleClose() {
    const backgroundLocation = (location.state as { backgroundLocation?: Location } | null)
      ?.backgroundLocation
    if (backgroundLocation) {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
  }

  async function handleSave() {
    if (!client || !serviceTypeId) return
    setIsSaving(true)
    try {
      if (repeatWeekly) {
        const sessions = await createWeeklySeries(
          {
            clientId: client.id,
            serviceTypeId,
            startAt: startAt.getTime(),
            modality,
            notes,
            usePackage,
          },
          repeatWeeks,
        )
        toast.show(`${sessions.length} sesiones creadas`, {
          label: 'Deshacer',
          onClick: () => {
            sessions.forEach((s) => softDeleteSession(s.id))
          },
        })
      } else {
        const session = await createSession({
          clientId: client.id,
          serviceTypeId,
          startAt: startAt.getTime(),
          modality,
          notes,
          usePackage,
        })
        toast.show('Sesión guardada', {
          label: 'Deshacer',
          onClick: () => softDeleteSession(session.id),
        })
      }
      handleClose()
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'No se pudo guardar la sesión')
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = client !== null && serviceTypeId !== '' && !isSaving

  return (
    <Sheet title="Nueva sesión" onClose={handleClose}>
      <div className={styles.form}>
        <section className={styles.field}>
          <label className={styles.label}>Cliente</label>
          <ClientAutocomplete value={client} onSelect={setClient} autoFocus={!presetClientId} />
        </section>

        {serviceTypes.length > 0 && (
          <section className={styles.field}>
            <label className={styles.label}>Tipo de sesión</label>
            <div className={styles.chipRow}>
              {serviceTypes.map((type) => (
                <Chip
                  key={type.id}
                  selected={type.id === serviceTypeId}
                  tone="accent"
                  onClick={() => {
                    setServiceTypeId(type.id)
                    setCustomPriceCents(null)
                  }}
                >
                  {type.name}
                </Chip>
              ))}
            </div>
          </section>
        )}

        <section className={styles.field}>
          <label className={styles.label}>Cuándo</label>
          <div className={styles.chipRow}>
            <Chip onClick={() => setStartAt(new Date(shiftDays(startAt.getTime(), -1)))}>‹ día</Chip>
            <button
              type="button"
              className={styles.dateButton}
              onClick={() => {
                const input = document.getElementById('session-datetime-input') as HTMLInputElement | null
                input?.showPicker?.() ?? input?.focus()
              }}
            >
              {formatDateTimeLabel(startAt)}
            </button>
            <Chip onClick={() => setStartAt(new Date(shiftDays(startAt.getTime(), 1)))}>día ›</Chip>
          </div>
          <input
            id="session-datetime-input"
            type="datetime-local"
            className={styles.hiddenDateInput}
            value={toLocalInputValue(startAt)}
            onChange={(e) => {
              const next = new Date(e.target.value)
              if (!Number.isNaN(next.getTime())) setStartAt(next)
            }}
          />
        </section>

        <section className={styles.field}>
          {consumablePackage && packageBalance ? (
            <label className={styles.packageToggle}>
              <input
                type="checkbox"
                checked={usePackage}
                onChange={(e) => setUsePackage(e.target.checked)}
              />
              Usar bono ({packageBalance.available} restantes)
            </label>
          ) : (
            <>
              <label className={styles.label}>Precio</label>
              <input
                type="number"
                inputMode="decimal"
                className={styles.priceInput}
                value={(effectivePriceCents / 100).toString()}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value)
                  setCustomPriceCents(Number.isNaN(value) ? 0 : Math.round(value * 100))
                }}
              />
              <span className={styles.priceHint}>{formatCents(effectivePriceCents)}</span>
            </>
          )}
        </section>

        <button type="button" className={styles.moreToggle} onClick={() => setShowMore((v) => !v)}>
          {showMore ? 'Menos opciones' : 'Más opciones'}
        </button>

        {showMore && (
          <div className={styles.moreOptions}>
            <section className={styles.field}>
              <label className={styles.label}>Modalidad</label>
              <div className={styles.chipRow}>
                <Chip selected={modality === 'online'} onClick={() => setModality('online')}>
                  💻 Online
                </Chip>
                <Chip selected={modality === 'in_person'} onClick={() => setModality('in_person')}>
                  🏠 Presencial
                </Chip>
              </div>
            </section>

            <section className={styles.field}>
              <label className={styles.packageToggle}>
                <input
                  type="checkbox"
                  checked={repeatWeekly}
                  onChange={(e) => setRepeatWeekly(e.target.checked)}
                />
                Repetir cada semana
              </label>
              {repeatWeekly && (
                <div className={styles.repeatRow}>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    className={styles.repeatInput}
                    value={repeatWeeks}
                    onChange={(e) => setRepeatWeeks(Number(e.target.value) || 1)}
                  />
                  <span>semanas</span>
                </div>
              )}
            </section>

            <section className={styles.field}>
              <label className={styles.label}>Notas</label>
              <textarea
                className={styles.textarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Opcional"
              />
            </section>
          </div>
        )}

        <Button fullWidth onClick={handleSave} disabled={!canSave}>
          {isSaving ? 'Guardando…' : 'Guardar sesión'}
        </Button>
      </div>
    </Sheet>
  )
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
