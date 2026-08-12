import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/database'
import { seedIfNeeded } from '@/db/seed'
import { createClient } from '@/db/repositories/clients.repo'
import { listServiceTypes } from '@/db/repositories/serviceTypes.repo'
import { createPackage, getPackageBalance } from '@/db/repositories/packages.repo'
import {
  createSession,
  createWeeklySeries,
  listSessionsForClient,
  markSessionPaid,
  updateSessionAttendance,
} from '@/db/repositories/sessions.repo'
import { listPaymentsForClient } from '@/db/repositories/payments.repo'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await seedIfNeeded()
})

async function getIndividualServiceType() {
  const types = await listServiceTypes()
  const individual = types.find((t) => t.name === 'Terapia individual')
  if (!individual) throw new Error('seed missing individual service type')
  return individual
}

describe('createSession + markSessionPaid', () => {
  it('creates a pending session at list price, then marks it paid in one transaction', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Ana García' }] })
    const serviceType = await getIndividualServiceType()

    const session = await createSession({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      startAt: Date.now(),
      modality: 'online',
    })

    expect(session.paymentStatus).toBe('pending')
    expect(session.priceCents).toBe(6000)

    await markSessionPaid({ sessionId: session.id, method: 'bizum' })

    const updated = await db.sessions.get(session.id)
    expect(updated?.paymentStatus).toBe('paid')

    const payments = await listPaymentsForClient(client.id)
    expect(payments).toHaveLength(1)
    expect(payments[0].amountCents).toBe(6000)
    expect(payments[0].sessionId).toBe(session.id)
  })
})

describe('package consumption end to end', () => {
  it('consumes a package slot and prices the session at the per-session value', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Marc Ruiz' }] })
    const serviceType = await getIndividualServiceType()

    const pkg = await createPackage({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      label: 'Bono 4 sesiones',
      totalSessions: 4,
      pricePaidCents: 22000,
      paymentMethod: 'transfer',
    })

    const session = await createSession({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      startAt: Date.now(),
      modality: 'online',
      usePackage: true,
    })

    expect(session.packageId).toBe(pkg.id)
    expect(session.paymentStatus).toBe('package')
    expect(session.priceCents).toBe(5500)

    await updateSessionAttendance(session.id, 'attended')

    const balance = await getPackageBalance(pkg.id)
    expect(balance).toEqual({ used: 1, reserved: 0, forfeited: 0, remaining: 3, available: 3 })
  })

  it('throws when trying to consume an exhausted package', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Sofía Díaz' }] })
    const serviceType = await getIndividualServiceType()

    const pkg = await createPackage({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      label: 'Bono 1 sesión',
      totalSessions: 1,
      pricePaidCents: 6000,
      paymentMethod: 'cash',
    })

    const first = await createSession({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      startAt: Date.now(),
      modality: 'online',
      usePackage: true,
    })
    expect(first.packageId).toBe(pkg.id)

    await expect(
      createSession({
        clientId: client.id,
        serviceTypeId: serviceType.id,
        startAt: Date.now() + 1000,
        modality: 'online',
        usePackage: true,
      }),
    ).rejects.toThrow(/no hay bono/i)
  })
})

describe('createWeeklySeries', () => {
  it('creates N sessions one week apart sharing the same seriesId', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Laura Vidal' }] })
    const serviceType = await getIndividualServiceType()
    const startAt = Date.UTC(2026, 7, 4, 17, 0, 0)

    const sessions = await createWeeklySeries(
      { clientId: client.id, serviceTypeId: serviceType.id, startAt, modality: 'online' },
      3,
    )

    expect(sessions).toHaveLength(3)
    const seriesIds = new Set(sessions.map((s) => s.seriesId))
    expect(seriesIds.size).toBe(1)
    expect(sessions[1].startAt - sessions[0].startAt).toBe(7 * 24 * 60 * 60 * 1000)

    const history = await listSessionsForClient(client.id)
    expect(history).toHaveLength(3)
  })
})
