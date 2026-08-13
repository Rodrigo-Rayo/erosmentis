import { NavLink } from 'react-router-dom'
import { CalendarIcon, PeopleIcon, SlidersIcon, SunIcon } from '@/components/icons/NavIcons'
import styles from './BottomNav.module.css'

const TABS = [
  { to: '/', label: 'Día', Icon: SunIcon, end: true },
  { to: '/mes', label: 'Mes', Icon: CalendarIcon, end: false },
  { to: '/clientes', label: 'Pacientes', Icon: PeopleIcon, end: false },
  { to: '/ajustes', label: 'Ajustes', Icon: SlidersIcon, end: false },
]

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Navegación principal">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          <Icon className={styles.icon} aria-hidden="true" />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
