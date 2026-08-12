import { Chip } from '@/components/ui/Chip'
import { useTheme } from '@/hooks/useTheme'
import styles from './SettingsScreen.module.css'

export function SettingsScreen() {
  const { theme, setTheme } = useTheme()

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
          Todos tus datos se guardan solo en este dispositivo. La copia de seguridad cifrada
          llegará en una próxima actualización — de momento, evita desinstalar la app o borrar
          los datos del navegador.
        </p>
      </section>
    </div>
  )
}
