import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './UpdatePrompt.module.css'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) {
    return null
  }

  return (
    <div className={styles.banner}>
      <span>Nueva versión disponible</span>
      <button type="button" className={styles.button} onClick={() => updateServiceWorker(true)}>
        Actualizar
      </button>
    </div>
  )
}
