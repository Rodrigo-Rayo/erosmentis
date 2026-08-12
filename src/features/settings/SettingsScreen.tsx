import { Link } from 'react-router-dom'
import { Chip } from '@/components/ui/Chip'
import { useTheme } from '@/hooks/useTheme'
import { useBackupReminder } from '@/hooks/useBackupReminder'
import styles from './SettingsScreen.module.css'

export function SettingsScreen() {
  const { theme, setTheme } = useTheme()
  const { needsBackup, daysSinceBackup } = useBackupReminder()

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Ajustes</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Apariencia</h2>
        <div className={styles.chipRow}>
          <Chip selected={theme === 'system'} tone="accent" onClick={() => setTheme('system')}>
            Automático
          </Chip>
          <Chip selected={theme === 'light'} tone="accent" onClick={() => setTheme('light')}>
            Claro
          </Chip>
          <Chip selected={theme === 'dark'} tone="accent" onClick={() => setTheme('dark')}>
            Oscuro
          </Chip>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Datos</h2>
        <p className={styles.note}>
          Todos tus datos se guardan solo en este dispositivo. Haz copias de seguridad
          regularmente para no perderlos si pierdes o cambias de móvil.
        </p>
        {needsBackup && (
          <p className={styles.nudge}>
            {daysSinceBackup === null
              ? 'Aún no has hecho ninguna copia de seguridad.'
              : `Han pasado ${daysSinceBackup} días desde tu última copia.`}
          </p>
        )}
        <Link to="/ajustes/backup" className={styles.backupLink}>
          Copia de seguridad y restaurar →
        </Link>
      </section>
    </div>
  )
}
