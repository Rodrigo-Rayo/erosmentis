import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  archiveClient,
  listArchivedClients,
  searchClients,
  unarchiveClient,
} from '@/db/repositories/clients.repo'
import { listUpcomingSessions } from '@/db/repositories/sessions.repo'
import { formatDateTimeLabel } from '@/domain/dates'
import { getErrorMessage } from '@/domain/errors'
import { EmptyState } from '@/components/ui/EmptyState'
import { Chip } from '@/components/ui/Chip'
import { Sheet } from '@/components/ui/Sheet'
import { useToast } from '@/components/ui/Toast'
import { CoupleIcon, EditIcon } from '@/components/icons/SessionIcons'
import { ArchiveIcon } from '@/components/icons/NavIcons'
import { useLongPress } from '@/hooks/useLongPress'
import type { Client, Session } from '@/domain/types'
import styles from './ClientListScreen.module.css'

type SubTab = 'activos' | 'archivados'

interface ClientRowProps {
  client: Client
  nextSession: Session | undefined
  onLongPress: (client: Client) => void
}

/** A patient row that navigates on tap, but opens the action menu on press-and-hold instead —
 * same gesture WhatsApp uses for its chat list. */
function ClientRow({ client, nextSession, onLongPress }: ClientRowProps) {
  const navigate = useNavigate()
  const longPress = useLongPress(() => onLongPress(client))

  function handleClick() {
    if (longPress.wasLongPress()) return
    navigate(`/clientes/${client.id}`)
  }

  return (
    <div
      className={styles.item}
      role="link"
      tabIndex={0}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/clientes/${client.id}`)
        }
      }}
    >
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
    </div>
  )
}

export function ClientListScreen() {
  const toast = useToast()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [subTab, setSubTab] = useState<SubTab>('activos')
  const [menuClient, setMenuClient] = useState<Client | null>(null)
  const location = useLocation()
  const clients = useLiveQuery(() => searchClients(query), [query], [])
  const archivedClients = useLiveQuery(() => listArchivedClients(), [], [])
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

  async function handleRestore(clientId: string) {
    try {
      await unarchiveClient(clientId)
      toast.show('Paciente restaurado')
    } catch (error) {
      toast.show(getErrorMessage(error))
    }
  }

  function handleEditFromMenu() {
    if (!menuClient) return
    navigate(`/clientes/${menuClient.id}/editar`, { state: { backgroundLocation: location } })
    setMenuClient(null)
  }

  async function handleArchiveFromMenu() {
    if (!menuClient) return
    const client = menuClient
    setMenuClient(null)
    try {
      await archiveClient(client.id)
      toast.show(
        'Paciente archivado',
        {
          label: 'Deshacer',
          onClick: () =>
            unarchiveClient(client.id).catch((error: unknown) =>
              toast.show(getErrorMessage(error)),
            ),
        },
        { durationMs: 8000 },
      )
    } catch (error) {
      toast.show(getErrorMessage(error))
    }
  }

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

      <div className={styles.subTabToggle}>
        <Chip selected={subTab === 'activos'} tone="accent" onClick={() => setSubTab('activos')}>
          Activos
        </Chip>
        <Chip
          selected={subTab === 'archivados'}
          tone="accent"
          onClick={() => setSubTab('archivados')}
        >
          Archivados{archivedClients.length > 0 ? ` (${archivedClients.length})` : ''}
        </Chip>
      </div>

      {subTab === 'activos' ? (
        <>
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
              {clients.map((client) => (
                <li key={client.id}>
                  <ClientRow
                    client={client}
                    nextSession={nextSessionByClient.get(client.id)}
                    onLongPress={setMenuClient}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : archivedClients.length === 0 ? (
        <EmptyState emoji="🗂️" title="Sin pacientes archivados" />
      ) : (
        <ul className={styles.list}>
          {archivedClients.map((client) => (
            <li key={client.id} className={styles.archivedItem}>
              <Link to={`/clientes/${client.id}`} className={styles.archivedLink}>
                <span className={styles.avatar} aria-hidden="true">
                  {client.kind === 'couple' ? (
                    <CoupleIcon className={styles.avatarIcon} />
                  ) : (
                    client.displayName.charAt(0).toUpperCase()
                  )}
                </span>
                <span className={styles.name}>{client.displayName}</span>
              </Link>
              <button
                type="button"
                className={styles.restoreButton}
                onClick={() => handleRestore(client.id)}
              >
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}

      {menuClient && (
        <Sheet title={menuClient.displayName} onClose={() => setMenuClient(null)}>
          <div className={styles.menu}>
            <button type="button" className={styles.menuItem} onClick={handleEditFromMenu}>
              <EditIcon className={styles.menuIcon} aria-hidden="true" />
              Editar paciente
            </button>
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuItemDanger}`}
              onClick={handleArchiveFromMenu}
            >
              <ArchiveIcon className={styles.menuIcon} aria-hidden="true" />
              Archivar paciente
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
