import { db } from '@/db/database'
import { buildSearchName, matchesSearch } from '@/domain/search'
import type { Client, ClientKind, Modality, Person } from '@/domain/types'

export interface CreateClientInput {
  kind: ClientKind
  people: Person[]
  defaultServiceTypeId?: string | null
  defaultModality?: Modality | null
  notes?: string
}

function deriveDisplayName(kind: ClientKind, people: Person[]): string {
  if (kind === 'individual') {
    return people[0]?.name ?? ''
  }
  const [first, second] = people
  if (first && second) {
    return `${first.name} y ${second.name}`
  }
  return first?.name ?? ''
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const now = Date.now()
  const displayName = deriveDisplayName(input.kind, input.people)
  const client: Client = {
    id: crypto.randomUUID(),
    kind: input.kind,
    displayName,
    searchName: buildSearchName(input.people.map((p) => p.name)),
    people: input.people,
    defaultServiceTypeId: input.defaultServiceTypeId ?? null,
    defaultModality: input.defaultModality ?? null,
    status: 'active',
    notes: input.notes ?? '',
    tags: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.clients.add(client)
  return client
}

export async function updateClient(
  id: string,
  changes: Partial<
    Pick<
      Client,
      'people' | 'kind' | 'defaultServiceTypeId' | 'defaultModality' | 'status' | 'notes'
    >
  >,
): Promise<void> {
  const patch: Partial<Client> = { ...changes }
  if (changes.people || changes.kind) {
    const existing = await db.clients.get(id)
    if (!existing) {
      throw new Error(`Client ${id} not found`)
    }
    const kind = changes.kind ?? existing.kind
    const people = changes.people ?? existing.people
    patch.displayName = deriveDisplayName(kind, people)
    patch.searchName = buildSearchName(people.map((p) => p.name))
  }
  await db.clients.update(id, patch)
}

export async function getClient(id: string): Promise<Client | undefined> {
  return db.clients.get(id)
}

export async function listActiveClients(): Promise<Client[]> {
  const clients = await db.clients.where('status').equals('active').toArray()
  return clients
    .filter((c) => c.deletedAt === null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'))
}

export interface ClientSearchResult extends Client {
  isRecent: boolean
}

export async function searchClients(
  query: string,
  recentClientIds: string[] = [],
): Promise<Client[]> {
  const all = await listActiveClients()
  const matches = all.filter((c) => matchesSearch(c.searchName, query))
  if (query.trim() === '') {
    const recentSet = new Set(recentClientIds)
    return [
      ...matches.filter((c) => recentSet.has(c.id)),
      ...matches.filter((c) => !recentSet.has(c.id)),
    ]
  }
  return matches
}

/** Archived (soft-hidden) clients, alphabetical — backs the "Archivados" tab so a client
 * archived by mistake, or one who resumes therapy later, can be found and restored. */
export async function listArchivedClients(): Promise<Client[]> {
  const clients = await db.clients.where('status').equals('archived').toArray()
  return clients
    .filter((c) => c.deletedAt === null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'))
}

export async function archiveClient(id: string): Promise<void> {
  await db.clients.update(id, { status: 'archived' })
}

export async function unarchiveClient(id: string): Promise<void> {
  await db.clients.update(id, { status: 'active' })
}

export async function softDeleteClient(id: string): Promise<void> {
  await db.clients.update(id, { deletedAt: Date.now() })
}

/** Earliest `createdAt` across every client ever added (including archived/deleted) — used as
 * a stand-in for "when real usage began" by the backup reminder when no backup has been taken
 * yet, so a fresh install with no data isn't nagged. */
export async function getEarliestClientCreatedAt(): Promise<number | null> {
  const clients = await db.clients.toArray()
  if (clients.length === 0) return null
  return Math.min(...clients.map((c) => c.createdAt))
}
