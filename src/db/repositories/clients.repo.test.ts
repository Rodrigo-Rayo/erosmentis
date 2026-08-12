import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/database'
import { seedIfNeeded } from '@/db/seed'
import {
  archiveClient,
  createClient,
  getClient,
  listActiveClients,
  searchClients,
  softDeleteClient,
  unarchiveClient,
  updateClient,
} from './clients.repo'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await seedIfNeeded()
})

describe('createClient', () => {
  it('derives displayName and searchName for an individual', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Ana García' }] })
    expect(client.displayName).toBe('Ana García')
    expect(client.searchName).toBe('ana garcia')
  })

  it('derives a "X y Y" displayName for a couple, in the order the people were given', async () => {
    const client = await createClient({
      kind: 'couple',
      people: [{ name: 'Ana García' }, { name: 'José Ángel' }],
    })
    expect(client.displayName).toBe('Ana García y José Ángel')
    expect(client.searchName).toBe('ana garcia jose angel')
  })
})

describe('updateClient', () => {
  it('recomputes displayName/searchName when people change', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Ana García' }] })
    await updateClient(client.id, { people: [{ name: 'Ana Martínez' }] })
    const updated = await getClient(client.id)
    expect(updated?.displayName).toBe('Ana Martínez')
    expect(updated?.searchName).toBe('ana martinez')
  })

  it('recomputes displayName/searchName when only kind changes from individual to couple', async () => {
    // Regression guard: updateClient must recompute on a kind-only change too, not just
    // when `people` is also passed — otherwise converting a client to "couple" would leave
    // a stale single-person displayName/searchName forever.
    const client = await createClient({ kind: 'individual', people: [{ name: 'Ana García' }] })
    await updateClient(client.id, {
      kind: 'couple',
      people: [{ name: 'Ana García' }, { name: 'Luis Pérez' }],
    })
    const updated = await getClient(client.id)
    expect(updated?.kind).toBe('couple')
    expect(updated?.displayName).toBe('Ana García y Luis Pérez')
  })

  it('leaves displayName/searchName untouched when neither people nor kind change', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Ana García' }] })
    await updateClient(client.id, { notes: 'Prefiere sesiones por la tarde' })
    const updated = await getClient(client.id)
    expect(updated?.displayName).toBe('Ana García')
    expect(updated?.notes).toBe('Prefiere sesiones por la tarde')
  })

  it('throws for a non-existent client id when changing people', async () => {
    await expect(
      updateClient('missing-id', { people: [{ name: 'Nadie' }] }),
    ).rejects.toThrow('missing-id')
  })
})

describe('listActiveClients / archiveClient / unarchiveClient / softDeleteClient', () => {
  it('excludes archived and soft-deleted clients from the active list', async () => {
    const active = await createClient({ kind: 'individual', people: [{ name: 'Activo' }] })
    const archived = await createClient({ kind: 'individual', people: [{ name: 'Archivado' }] })
    const deleted = await createClient({ kind: 'individual', people: [{ name: 'Borrado' }] })

    await archiveClient(archived.id)
    await softDeleteClient(deleted.id)

    const listed = await listActiveClients()
    expect(listed.map((c) => c.id)).toEqual([active.id])
  })

  it('unarchiveClient brings a client back into the active list', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Vuelve' }] })
    await archiveClient(client.id)
    expect(await listActiveClients()).toHaveLength(0)

    await unarchiveClient(client.id)
    const listed = await listActiveClients()
    expect(listed.map((c) => c.id)).toEqual([client.id])
  })
})

describe('searchClients', () => {
  it('matches by substring, accent-insensitively', async () => {
    await createClient({ kind: 'individual', people: [{ name: 'María Núñez' }] })
    await createClient({ kind: 'individual', people: [{ name: 'Pedro López' }] })

    const results = await searchClients('nunez')
    expect(results).toHaveLength(1)
    expect(results[0].displayName).toBe('María Núñez')
  })

  it('with an empty query, orders recent client ids before the rest', async () => {
    const a = await createClient({ kind: 'individual', people: [{ name: 'Ana' }] })
    const b = await createClient({ kind: 'individual', people: [{ name: 'Bruno' }] })
    const c = await createClient({ kind: 'individual', people: [{ name: 'Carla' }] })

    const results = await searchClients('', [c.id])
    expect(results.map((r) => r.id)).toEqual([c.id, a.id, b.id])
  })

  it('with a real query, ignores the recent-first ordering and just matches', async () => {
    const a = await createClient({ kind: 'individual', people: [{ name: 'Ana García' }] })
    await createClient({ kind: 'individual', people: [{ name: 'Bruno Ruiz' }] })

    const results = await searchClients('ana', [])
    expect(results.map((r) => r.id)).toEqual([a.id])
  })
})
