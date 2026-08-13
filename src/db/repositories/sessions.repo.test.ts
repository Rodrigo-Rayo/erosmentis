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
  listFutureSeriesSessions,
  listSessionsForClient,
  markSessionPaid,
  restoreSessions,
  softDeleteFutureSeriesSessions,
  updateFutureSeriesSessions,
  updateSessionAttendance,
  updateSessionDetails,
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

describe('createSession with a manual price override', () => {
  it('keeps the price the user typed instead of the service type default', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Iván Costa' }] })
    const serviceType = await getIndividualServiceType()

    const session = await createSession({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      startAt: Date.now(),
      modality: 'online',
      priceCents: 4500,
    })

    expect(session.priceCents).toBe(4500)
    const stored = await db.sessions.get(session.id)
    expect(stored?.priceCents).toBe(4500)
  })

  it('ignores a manual price override when consuming a package, using the per-session value instead', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Elena Ferrer' }] })
    const serviceType = await getIndividualServiceType()
    await createPackage({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      label: 'Bono 4 sesiones',
      totalSessions: 4,
      pricePaidCents: 22000,
      paymentMethod: 'cash',
    })

    const session = await createSession({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      startAt: Date.now(),
      modality: 'online',
      usePackage: true,
      priceCents: 9999,
    })

    expect(session.priceCents).toBe(5500)
    expect(session.paymentStatus).toBe('package')
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

describe('bulk series operations', () => {
  async function createFourWeekSeries() {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Serie Semanal' }] })
    const serviceType = await getIndividualServiceType()
    const startAt = Date.UTC(2026, 7, 3, 19, 0) // a Monday, 19:00
    const sessions = await createWeeklySeries(
      { clientId: client.id, serviceTypeId: serviceType.id, startAt, modality: 'online' },
      4,
    )
    return { client, serviceType, sessions }
  }

  describe('listFutureSeriesSessions', () => {
    it('returns sessions from fromStartAt onward, excluding an explicitly given id', async () => {
      const { sessions } = await createFourWeekSeries()
      const [first, second, third, fourth] = sessions

      const fromSecond = await listFutureSeriesSessions(first.seriesId!, second.startAt)
      expect(fromSecond.map((s) => s.id)).toEqual([second.id, third.id, fourth.id])

      const excludingFirst = await listFutureSeriesSessions(first.seriesId!, first.startAt, first.id)
      expect(excludingFirst.map((s) => s.id)).toEqual([second.id, third.id, fourth.id])
    })
  })

  describe('updateFutureSeriesSessions', () => {
    it('shifts the time-of-day and updates modality/notes on future occurrences, keeping each on its own date', async () => {
      const { sessions } = await createFourWeekSeries()
      const [first, second, third, fourth] = sessions

      const thirtyMinutesMs = 30 * 60_000
      const updatedCount = await updateFutureSeriesSessions(
        first.seriesId!,
        first.startAt,
        { timeShiftMs: thirtyMinutesMs, modality: 'in_person', notes: 'Cambio de horario' },
        first.id,
      )

      expect(updatedCount).toBe(3)

      const updatedSecond = await db.sessions.get(second.id)
      expect(updatedSecond?.startAt).toBe(second.startAt + thirtyMinutesMs)
      expect(updatedSecond?.modality).toBe('in_person')
      expect(updatedSecond?.notes).toBe('Cambio de horario')

      const updatedThird = await db.sessions.get(third.id)
      expect(updatedThird?.startAt).toBe(third.startAt + thirtyMinutesMs)

      const updatedFourth = await db.sessions.get(fourth.id)
      expect(updatedFourth?.startAt).toBe(fourth.startAt + thirtyMinutesMs)

      // The excluded session itself must be untouched by the bulk call.
      const untouchedFirst = await db.sessions.get(first.id)
      expect(untouchedFirst?.startAt).toBe(first.startAt)
      expect(untouchedFirst?.modality).toBe('online')
    })
  })

  describe('softDeleteFutureSeriesSessions + restoreSessions', () => {
    it('soft-deletes this and every future occurrence together, and restores them as a batch', async () => {
      const { sessions } = await createFourWeekSeries()
      const [first, second, third, fourth] = sessions

      const deletedIds = await softDeleteFutureSeriesSessions(first.seriesId!, second.startAt)
      expect(deletedIds.sort()).toEqual([second.id, third.id, fourth.id].sort())

      const stillActive = await listSessionsForClient(first.clientId)
      expect(stillActive.map((s) => s.id)).toEqual([first.id])

      await restoreSessions(deletedIds)
      const restored = await listSessionsForClient(first.clientId)
      expect(restored).toHaveLength(4)
    })
  })
})

describe('updateSessionDetails', () => {
  it('corrects a mistaken date, price, modality and notes without deleting the session', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Rocío Peña' }] })
    const serviceType = await getIndividualServiceType()
    const otherServiceType = (await listServiceTypes()).find((t) => t.id !== serviceType.id)!

    const session = await createSession({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      startAt: Date.UTC(2026, 7, 12, 17, 0),
      modality: 'online',
    })

    const newStartAt = Date.UTC(2026, 7, 13, 18, 30)
    await updateSessionDetails(session.id, {
      serviceTypeId: otherServiceType.id,
      startAt: newStartAt,
      modality: 'in_person',
      priceCents: 7000,
      notes: 'Cambio de última hora',
    })

    const updated = await db.sessions.get(session.id)
    expect(updated?.serviceTypeId).toBe(otherServiceType.id)
    expect(updated?.startAt).toBe(newStartAt)
    expect(updated?.modality).toBe('in_person')
    expect(updated?.priceCents).toBe(7000)
    expect(updated?.notes).toBe('Cambio de última hora')
    expect(updated?.deletedAt).toBeNull()
  })

  it('allows editing date, modality and notes on a bono-covered session', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Nuria Soler' }] })
    const serviceType = await getIndividualServiceType()
    await createPackage({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      label: 'Bono 4 sesiones',
      totalSessions: 4,
      pricePaidCents: 22000,
      paymentMethod: 'bizum',
    })
    const session = await createSession({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      startAt: Date.UTC(2026, 7, 12, 17, 0),
      modality: 'online',
      usePackage: true,
    })

    const newStartAt = Date.UTC(2026, 7, 13, 18, 0)
    await updateSessionDetails(session.id, { startAt: newStartAt, modality: 'in_person', notes: 'Reagendada' })

    const updated = await db.sessions.get(session.id)
    expect(updated?.startAt).toBe(newStartAt)
    expect(updated?.modality).toBe('in_person')
    expect(updated?.notes).toBe('Reagendada')
    // Price/package linkage must stay exactly as the package priced it.
    expect(updated?.priceCents).toBe(5500)
    expect(updated?.paymentStatus).toBe('package')
  })

  it('rejects editing price or service type on a bono-covered session', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Nuria Soler' }] })
    const serviceType = await getIndividualServiceType()
    const otherServiceType = (await listServiceTypes()).find((t) => t.id !== serviceType.id)!
    await createPackage({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      label: 'Bono 4 sesiones',
      totalSessions: 4,
      pricePaidCents: 22000,
      paymentMethod: 'bizum',
    })
    const session = await createSession({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      startAt: Date.now(),
      modality: 'online',
      usePackage: true,
    })

    await expect(updateSessionDetails(session.id, { priceCents: 9999 })).rejects.toThrow(/bono/i)
    await expect(
      updateSessionDetails(session.id, { serviceTypeId: otherServiceType.id }),
    ).rejects.toThrow(/bono/i)

    // Neither rejected call should have partially applied.
    const untouched = await db.sessions.get(session.id)
    expect(untouched?.priceCents).toBe(5500)
    expect(untouched?.serviceTypeId).toBe(serviceType.id)
  })
})
