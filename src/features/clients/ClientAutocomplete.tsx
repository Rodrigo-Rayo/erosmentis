import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { createClient, searchClients } from '@/db/repositories/clients.repo'
import { listSessionsInRange } from '@/db/repositories/sessions.repo'
import { useToast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/domain/errors'
import type { Client } from '@/domain/types'
import styles from './ClientAutocomplete.module.css'

interface ClientAutocompleteProps {
  value: Client | null
  onSelect: (client: Client) => void
  autoFocus?: boolean
}

async function getRecentClientIds(): Promise<string[]> {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
  const sessions = await listSessionsInRange(ninetyDaysAgo, Date.now())
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const session of [...sessions].sort((a, b) => b.startAt - a.startAt)) {
    if (!seen.has(session.clientId)) {
      seen.add(session.clientId)
      ordered.push(session.clientId)
    }
  }
  return ordered
}

export function ClientAutocomplete({ value, onSelect, autoFocus = false }: ClientAutocompleteProps) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  // Open by default so recent patients are visible immediately — this only controls the
  // results list, not keyboard focus, which still waits for an explicit tap on the input.
  const [isOpen, setIsOpen] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const recentIds = useLiveQuery(getRecentClientIds, [], [])
  const results = useLiveQuery(
    () => searchClients(query, recentIds),
    [query, recentIds],
    [] as Client[],
  )

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  async function handleCreate() {
    const trimmed = query.trim()
    if (trimmed === '') return
    try {
      const client = await createClient({ kind: 'individual', people: [{ name: trimmed }] })
      onSelect(client)
      setIsOpen(false)
      setQuery('')
    } catch (error) {
      toast.show(getErrorMessage(error))
    }
  }

  if (value && !isOpen) {
    return (
      <button
        type="button"
        className={styles.selected}
        onClick={() => {
          setIsOpen(true)
          setQuery('')
        }}
      >
        <span className={styles.avatar} aria-hidden="true">
          {value.kind === 'couple' ? '💑' : value.displayName.charAt(0).toUpperCase()}
        </span>
        <span className={styles.selectedName}>{value.displayName}</span>
        <span className={styles.change}>Cambiar</span>
      </button>
    )
  }

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder="Buscar o crear paciente…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        inputMode="search"
        autoComplete="off"
      />
      {isOpen && (
        <ul className={styles.results}>
          {results.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                className={styles.resultItem}
                onClick={() => {
                  onSelect(client)
                  setIsOpen(false)
                  setQuery('')
                }}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {client.kind === 'couple' ? '💑' : client.displayName.charAt(0).toUpperCase()}
                </span>
                {client.displayName}
              </button>
            </li>
          ))}
          {query.trim() !== '' && (
            <li>
              <button type="button" className={styles.createItem} onClick={handleCreate}>
                + Crear paciente: "{query.trim()}"
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
