import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { searchClients } from '@/db/repositories/clients.repo'
import { listUpcomingSessions } from '@/db/repositories/sessions.repo'
import { formatDateTimeLabel } from '@/domain/dates'
import { EmptyState } from '@/components/ui/EmptyState'
import { CoupleIcon } from '@/components/icons/SessionIcons'
import type { Session } from '@/domain/types'
import styles from './ClientListScreen.module.css'

export function ClientListScreen() {
  const [query, setQuery] = useState('')
  const location = useLocation()
  const clients = useLiveQuery(() => searchClients(query), [query], [])
  const upcomingSessions = useLiveQuery(() => listUpcomingSessions(Date.now()), [], [])

  const nextSessionByClient = useMemo(() => {
    const map = new Map<string, Session>()
    for (const session of upcomingSessions) {
      if (!map.has(session.clientId)) {
        map.set(session.clientId, session)
      }
    }
    return map
  }, [upcomingSessions])

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pacientes</h1>
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
        placeholder="Buscar paciente…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        inputMode="search"
      />

      {clients.length === 0 ? (
        <EmptyState
          emoji="👋"
          title="Aún no hay pacientes"
          description="Créalos aquí o desde 'Nueva sesión'."
        />
      ) : (
        <ul className={styles.list}>
          {clients.map((client) => {
            const nextSession = nextSessionByClient.get(client.id)
            return (
              <li key={client.id}>
                <Link to={`/clientes/${client.id}`} className={styles.item}>
                  <span className={styles.avatar} aria-hidden="true">
                    {client.kind === 'couple' ? (
                      <CoupleIcon className={styles.avatarIcon} />
                    ) : (
                      client.displayName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className={styles.itemText}>
                    <span className={styles.name}>{client.displayName}</span>
                    {nextSession && (
                      <span className={styles.nextSession}>
                        Próxima: {formatDateTimeLabel(new Date(nextSession.startAt))}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
