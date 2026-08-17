import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listServiceTypes } from '@/db/repositories/serviceTypes.repo'
import { formatCents } from '@/domain/money'
import { ChevronLeftIcon } from '@/components/icons/NavIcons'
import type { ServiceType } from '@/domain/types'
import { ServiceTypeEditorSheet } from './ServiceTypeEditorSheet'
import styles from './ServiceTypesScreen.module.css'

export function ServiceTypesScreen() {
  const serviceTypes = useLiveQuery(() => listServiceTypes(true), [], [])
  const [editing, setEditing] = useState<ServiceType | 'new' | null>(null)

  const active = serviceTypes.filter((s) => !s.isArchived)
  const archived = serviceTypes.filter((s) => s.isArchived)
  const nextSortOrder = serviceTypes.length

  function renderRow(serviceType: ServiceType) {
    return (
      <button
        key={serviceType.id}
        type="button"
        className={`${styles.row} ${serviceType.isArchived ? styles.rowArchived : ''}`}
        onClick={() => setEditing(serviceType)}
      >
        <span className={styles.dot} style={{ background: `var(--color-${serviceType.colorToken})` }} />
        <span className={styles.rowBody}>
          <span className={styles.rowName}>{serviceType.name}</span>
          <span className={styles.rowMeta}>
            {serviceType.durationMin} min · {formatCents(serviceType.priceCents)}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className={styles.wrapper}>
      <Link to="/ajustes" className={styles.back}>
        <ChevronLeftIcon className={styles.backIcon} aria-hidden="true" />
        <span>Ajustes</span>
      </Link>
      <h1 className={styles.title}>Tipos de sesión</h1>
      <p className={styles.intro}>
        Duración y precio por defecto de cada tipo de sesión. Cambiarlos aquí solo afecta a las
        sesiones nuevas — las ya guardadas mantienen su precio y duración originales.
      </p>

      <section className={styles.list}>
        <div className={styles.list}>{active.map(renderRow)}</div>
        <button type="button" className={styles.addButton} onClick={() => setEditing('new')}>
          + Nuevo tipo de sesión
        </button>
      </section>

      {archived.length > 0 && (
        <section className={styles.list}>
          <h2 className={styles.sectionTitle}>Archivados</h2>
          <div className={styles.list}>{archived.map(renderRow)}</div>
        </section>
      )}

      {editing && (
        <ServiceTypeEditorSheet
          serviceType={editing === 'new' ? null : editing}
          nextSortOrder={nextSortOrder}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
