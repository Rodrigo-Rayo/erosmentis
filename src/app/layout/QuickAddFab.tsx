import { useNavigate, useLocation } from 'react-router-dom'
import styles from './QuickAddFab.module.css'

export function QuickAddFab() {
  const navigate = useNavigate()
  const location = useLocation()

  function handleClick() {
    navigate('/sesion/nueva', { state: { backgroundLocation: location } })
  }

  return (
    <button type="button" className={styles.fab} onClick={handleClick} aria-label="Nueva sesión">
      +
    </button>
  )
}
