import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { searchClients } from '@/db/repositories/clients.repo'
import { EmptyState } from '@/components/ui/EmptyState'
import styles from './ClientListScreen.module.css'

export function ClientListScreen() {
  const [query, setQuery] = useState('')
  const location = useLocation()
  const clients = useLiveQuery(() => searchClients(query), [query], [])

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Clientes</h1>
        <Link
          to="/clientes/nuevo"
          state={{ backgroundLocation: location }}
          className={styles.newButton}
        >
          + Nuevo
        </Link>
      </header>

      <input
        className={styles.search}
        type="search"
        placeholder="Buscar cliente…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        inputMode="search"
      />

      {clients.length === 0 ? (
        <EmptyState
          emoji="👋"
          title="Aún no hay clientes"
          description="Créalos aquí o desde 'Nueva sesión'."
        />
      ) : (
        <ul className={styles.list}>
          {clients.map((client) => (
            <li key={client.id}>
              <Link to={`/clientes/${client.id}`} className={styles.item}>
                <span className={styles.avatar} aria-hidden="true">
                  {client.kind === 'couple' ? '💑' : client.displayName.charAt(0).toUpperCase()}
                </span>
                <span className={styles.name}>{client.displayName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
