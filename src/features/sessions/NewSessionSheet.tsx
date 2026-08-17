import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation, type Location } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import { ClientAutocomplete } from '@/features/clients/ClientAutocomplete'
import { MonitorIcon, HomeIcon } from '@/components/icons/SessionIcons'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/NavIcons'
import { listServiceTypes } from '@/db/repositories/serviceTypes.repo'
import { findConsumablePackage, getPackageBalance } from '@/db/repositories/packages.repo'
import { getClient } from '@/db/repositories/clients.repo'
import { getSettings } from '@/db/repositories/settings.repo'
import { downloadSessionReminder, downloadSessionsReminder } from './reminderExport'
import {
  createSession,
  createWeeklySeries,
  listSessionsForClient,
  listSessionsInRange,
  softDeleteSession,
} from '@/db/repositories/sessions.repo'
import { formatCents } from '@/domain/money'
import { getErrorMessage } from '@/domain/errors'
import { dayRange, formatDateTimeLabel, nextHalfHourBoundary, shiftDays } from '@/domain/dates'
import { getDayHourSlots } from '@/domain/schedule'
import type { Client, Modality } from '@/domain/types'
import styles from './NewSessionSheet.module.css'

interface NewSessionSheetProps {
  presetClientId?: string
  presetStartAt?: number
}

export function NewSessionSheet({ presetClientId, presetStartAt }: NewSessionSheetProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [client, setClient] = useState<Client | null>(null)
  const [serviceTypeId, setServiceTypeId] = useState<string>('')
  const [startAt, setStartAt] = useState<Date>(() =>
    presetStartAt !== undefined ? new Date(presetStartAt) : nextHalfHourBoundary(),
  )
  const [modality, setModality] = useState<Modality>('online')
  const [usePackage, setUsePackage] = useState(false)
  const [customPriceCents, setCustomPriceCents] = useState<number | null>(null)
  const [showMore, setShowMore] = useState(false)
  const [notes, setNotes] = useState('')
  const [addReminder, setAddReminder] = useState(true)
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [repeatIntervalWeeks, setRepeatIntervalWeeks] = useState(1)
  const [repeatWeeksInput, setRepeatWeeksInput] = useState('4')
  const repeatWeeks = Math.min(26, Math.max(1, Number.parseInt(repeatWeeksInput, 10) || 1))
  const [isSaving, setIsSaving] = useState(false)

  const serviceTypes = useLiveQuery(() => listServiceTypes(), [], [])

  const selectedDayRange = useMemo(() => dayRange(startAt), [startAt])
  const daySessions = useLiveQuery(
    () => listSessionsInRange(selectedDayRange.start, selectedDayRange.end),
    [selectedDayRange.start, selectedDayRange.end],
    [],
  )
  const settings = useLiveQuery(() => getSettings(), [], null)
  const hourSlots = useMemo(
    () => getDayHourSlots(startAt, daySessions, settings?.weeklyBusinessHours),
    [startAt, daySessions, settings?.weeklyBusinessHours],
  )

  function selectHourSlot(hour: number, minute: number) {
    setStartAt((prev) => {
      const next = new Date(prev)
      next.setHours(hour, minute, 0, 0)
      return next
    })
  }

  const consumablePackage = useLiveQuery(
    () =>
      client && serviceTypeId
        ? findConsumablePackage(client.id, serviceTypeId)
        : Promise.resolve(null),
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
    getClient(presetClientId)
      .then((c) => c && setClient(c))
      .catch((error: unknown) => toast.show(getErrorMessage(error)))
    // toast.show is a stable useCallback reference; omitting `toast` avoids re-running
    // this effect every time the toast stack itself changes.
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

  function addReminderSafely(action: () => void) {
    if (!addReminder) return
    try {
      action()
    } catch {
      toast.show('Sesión guardada, pero no se pudo generar el recordatorio de calendario')
    }
  }

  async function handleSave() {
    if (!client || !serviceTypeId) return
    setIsSaving(true)
    try {
      if (repeatWeekly) {
        const { sessions, skippedStartAts } = await createWeeklySeries(
          {
            clientId: client.id,
            serviceTypeId,
            startAt: startAt.getTime(),
            modality,
            notes,
            usePackage,
            priceCents: customPriceCents ?? undefined,
          },
          repeatWeeks,
          repeatIntervalWeeks,
        )
        addReminderSafely(() =>
          downloadSessionsReminder(sessions, client, selectedServiceType ?? undefined),
        )
        const skippedMessage =
          skippedStartAts.length > 0
            ? `, ${skippedStartAts.length} omitida${skippedStartAts.length > 1 ? 's' : ''} por coincidir con otra sesión`
            : ''
        toast.show(
          `${sessions.length} sesiones creadas${skippedMessage}`,
          {
            label: 'Deshacer',
            onClick: () =>
              Promise.all(sessions.map((s) => softDeleteSession(s.id))).then(() => undefined),
          },
          skippedStartAts.length > 0 ? { tone: 'warning', durationMs: 5000 } : undefined,
        )
      } else {
        const session = await createSession({
          clientId: client.id,
          serviceTypeId,
          startAt: startAt.getTime(),
          modality,
          notes,
          usePackage,
          priceCents: customPriceCents ?? undefined,
        })
        addReminderSafely(() =>
          downloadSessionReminder(session, client, selectedServiceType ?? undefined),
        )
        toast.show('Sesión guardada', {
          label: 'Deshacer',
          onClick: () => softDeleteSession(session.id).then(() => undefined),
        })
      }
      handleClose()
    } catch (error) {
      toast.show(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = client !== null && serviceTypeId !== '' && !isSaving

  return (
    <Sheet title="Nueva sesión" onClose={handleClose}>
      <div className={styles.form}>
        <section className={styles.field}>
          <label className={styles.label}>Paciente</label>
          <ClientAutocomplete value={client} onSelect={setClient} />
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
            <Chip onClick={() => setStartAt(new Date(shiftDays(startAt.getTime(), -1)))}>
              <ChevronLeftIcon className={styles.chipIcon} aria-hidden="true" />
              <span>día</span>
            </Chip>
            <button
              type="button"
              className={styles.dateButton}
              onClick={() => {
                const input = document.getElementById(
                  'session-datetime-input',
                ) as HTMLInputElement | null
                input?.showPicker?.() ?? input?.focus()
              }}
            >
              {formatDateTimeLabel(startAt)}
            </button>
            <Chip onClick={() => setStartAt(new Date(shiftDays(startAt.getTime(), 1)))}>
              <span>día</span>
              <ChevronRightIcon className={styles.chipIcon} aria-hidden="true" />
            </Chip>
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

          {hourSlots.length > 0 ? (
            <div className={styles.slotGrid}>
              {hourSlots.map((slot) => {
                const isSelected =
                  !slot.occupied &&
                  startAt.getHours() === slot.hour &&
                  startAt.getMinutes() === slot.minute
                return (
                  <button
                    key={`${slot.hour}:${slot.minute}`}
                    type="button"
                    disabled={slot.occupied}
                    className={[
                      styles.slotButton,
                      isSelected ? styles.slotSelected : '',
                      slot.occupied ? styles.slotOccupied : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => selectHourSlot(slot.hour, slot.minute)}
                  >
                    {String(slot.hour).padStart(2, '0')}:{String(slot.minute).padStart(2, '0')}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className={styles.slotHint}>
              Este día no tiene horario fijo — elige la hora manualmente arriba.
            </p>
          )}
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
                min={0}
                inputMode="decimal"
                className={styles.priceInput}
                value={(effectivePriceCents / 100).toString()}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value)
                  setCustomPriceCents(
                    Number.isNaN(value) ? 0 : Math.max(0, Math.round(value * 100)),
                  )
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
                <Chip
                  selected={modality === 'online'}
                  tone="accent"
                  onClick={() => setModality('online')}
                >
                  <MonitorIcon className={styles.chipIcon} aria-hidden="true" />
                  <span>Online</span>
                </Chip>
                <Chip
                  selected={modality === 'in_person'}
                  tone="accent"
                  onClick={() => setModality('in_person')}
                >
                  <HomeIcon className={styles.chipIcon} aria-hidden="true" />
                  <span>Presencial</span>
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
                Repetir sesión
              </label>
              {repeatWeekly && (
                <>
                  <div className={styles.chipRow}>
                    <Chip
                      selected={repeatIntervalWeeks === 1}
                      tone="accent"
                      onClick={() => setRepeatIntervalWeeks(1)}
                    >
                      Cada semana
                    </Chip>
                    <Chip
                      selected={repeatIntervalWeeks === 2}
                      tone="accent"
                      onClick={() => setRepeatIntervalWeeks(2)}
                    >
                      Cada 2 semanas
                    </Chip>
                    <Chip
                      selected={repeatIntervalWeeks === 3}
                      tone="accent"
                      onClick={() => setRepeatIntervalWeeks(3)}
                    >
                      Cada 3 semanas
                    </Chip>
                    <Chip
                      selected={repeatIntervalWeeks === 4}
                      tone="accent"
                      onClick={() => setRepeatIntervalWeeks(4)}
                    >
                      Cada mes
                    </Chip>
                  </div>
                  <div className={styles.repeatRow}>
                    <input
                      type="number"
                      min={1}
                      max={26}
                      className={styles.repeatInput}
                      value={repeatWeeksInput}
                      onChange={(e) => setRepeatWeeksInput(e.target.value)}
                      onBlur={() => setRepeatWeeksInput(String(repeatWeeks))}
                    />
                    <span>veces</span>
                  </div>
                </>
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

        <label className={styles.packageToggle}>
          <input
            type="checkbox"
            checked={addReminder}
            onChange={(e) => setAddReminder(e.target.checked)}
          />
          <CalendarIcon className={styles.chipIcon} aria-hidden="true" />
          <span>Recordarme por calendario (24h y 1h antes)</span>
        </label>

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
