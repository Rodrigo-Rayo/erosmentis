import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const TABS = [
  { to: '/', label: 'Hoy', icon: '☀️', end: true },
  { to: '/mes', label: 'Mes', icon: '📅', end: false },
  { to: '/clientes', label: 'Pacientes', icon: '👥', end: false },
  { to: '/ajustes', label: 'Ajustes', icon: '⚙️', end: false },
]

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Navegación principal">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          <span className={styles.icon} aria-hidden="true">
            {tab.icon}
          </span>
          <span className={styles.label}>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
