import styles from './ErrorBoundary.module.css'

interface ErrorScreenProps {
  title: string
  description: string
}

export function ErrorScreen({ title, description }: ErrorScreenProps) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.emoji} aria-hidden="true">
        🌱
      </span>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <button type="button" className={styles.button} onClick={() => window.location.reload()}>
        Recargar
      </button>
    </div>
  )
}
