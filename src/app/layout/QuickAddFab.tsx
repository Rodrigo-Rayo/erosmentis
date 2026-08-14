import { useNavigate, useLocation } from 'react-router-dom'
import { useSelectedDay } from '@/app/SelectedDayContext'
import { nextHalfHourBoundaryOnDay } from '@/domain/dates'
import styles from './QuickAddFab.module.css'

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function QuickAddFab() {
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedDay } = useSelectedDay()

  function handleClick() {
    const today = new Date()
    // Only override the default when a different day was picked on the calendar — for today
    // this stays exactly the previous behavior (defaults to "now", rounded up).
    const presetStartAt = isSameDay(selectedDay, today)
      ? undefined
      : nextHalfHourBoundaryOnDay(selectedDay, today).getTime()
    navigate('/sesion/nueva', { state: { backgroundLocation: location, presetStartAt } })
  }

  return (
    <button type="button" className={styles.fab} onClick={handleClick} aria-label="Nueva sesión">
      +
    </button>
  )
}
