import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getSettings, updateSettings } from '@/db/repositories/settings.repo'
import { getErrorMessage } from '@/domain/errors'
import { ChevronLeftIcon } from '@/components/icons/NavIcons'
import type { WeeklyBusinessHours } from '@/domain/types'
import styles from './WorkingHoursScreen.module.css'

// Displayed Monday-first regardless of Date#getDay()'s Sunday-first numbering, to match how
// the rest of the app (startOfWeekMonday, the Disponibilidad week view) presents the week.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour)

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function WorkingHoursScreen() {
  const toast = useToast()
  const settings = useLiveQuery(() => getSettings(), [], null)

  const [hours, setHours] = useState<WeeklyBusinessHours | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (settings && hours === null) {
      setHours(settings.weeklyBusinessHours)
    }
  }, [settings, hours])

  function setDayClosed(weekday: number, closed: boolean) {
    setHours((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [weekday]: closed ? null : { startHour: 9, endHour: 20 },
      }
    })
  }

  function setDayStart(weekday: number, startHour: number) {
    setHours((prev) => {
      if (!prev) return prev
      const current = prev[weekday]
      if (!current) return prev
      return {
        ...prev,
        [weekday]: { startHour, endHour: Math.max(startHour + 1, current.endHour) },
      }
    })
  }

  function setDayEnd(weekday: number, endHour: number) {
    setHours((prev) => {
      if (!prev) return prev
      const current = prev[weekday]
      if (!current) return prev
      return {
        ...prev,
        [weekday]: { startHour: Math.min(current.startHour, endHour - 1), endHour },
      }
    })
  }

  async function handleSave() {
    if (!hours) return
    setIsSaving(true)
    try {
      await updateSettings({ weeklyBusinessHours: hours })
      toast.show('Horario actualizado')
    } catch (error) {
      toast.show(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <Link to="/ajustes" className={styles.back}>
        <ChevronLeftIcon className={styles.backIcon} aria-hidden="true" />
        <span>Ajustes</span>
      </Link>
      <h1 className={styles.title}>Horario de trabajo</h1>
      <p className={styles.intro}>
        Estas franjas solo se usan para sugerir huecos libres en Día y Disponibilidad — nunca
        impiden agendar una sesión a otra hora escribiéndola a mano.
      </p>

      {hours && (
        <>
          <div className={styles.list}>
            {WEEKDAY_ORDER.map((weekday) => {
              const dayHours = hours[weekday]
              const isClosed = dayHours === null || dayHours === undefined
              return (
                <div key={weekday} className={styles.dayRow}>
                  <div className={styles.dayTopLine}>
                    <span className={styles.dayLabel}>{WEEKDAY_LABELS[weekday]}</span>
                    <label className={styles.toggleRow}>
                      <input
                        type="checkbox"
                        checked={isClosed}
                        onChange={(e) => setDayClosed(weekday, e.target.checked)}
                      />
                      Cerrado
                    </label>
                  </div>
                  {!isClosed && (
                    <div className={styles.hoursFields}>
                      <select
                        className={styles.select}
                        value={dayHours.startHour}
                        onChange={(e) => setDayStart(weekday, Number(e.target.value))}
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>
                            {formatHour(hour)}
                          </option>
                        ))}
                      </select>
                      <span>–</span>
                      <select
                        className={styles.select}
                        value={dayHours.endHour}
                        onChange={(e) => setDayEnd(weekday, Number(e.target.value))}
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>
                            {formatHour(hour)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Button fullWidth onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar horario'}
          </Button>
        </>
      )}
    </div>
  )
}
