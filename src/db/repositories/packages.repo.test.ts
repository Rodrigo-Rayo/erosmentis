import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/database'
import { seedIfNeeded } from '@/db/seed'
import { createClient } from '@/db/repositories/clients.repo'
import { listServiceTypes } from '@/db/repositories/serviceTypes.repo'
import {
  createPackage,
  deletePackage,
  getActivePackagesForClient,
  restorePackage,
} from '@/db/repositories/packages.repo'
import { createSession, updateSessionAttendance } from '@/db/repositories/sessions.repo'
import { listPaymentsForClient } from '@/db/repositories/payments.repo'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await seedIfNeeded()
})

describe('deletePackage / restorePackage', () => {
  it('removes the package and its up-front payment from active views, and undo brings both back', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Nuria Soler' }] })
    const serviceType = (await listServiceTypes())[0]

    const pkg = await createPackage({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      label: 'Bono 4 sesiones',
      totalSessions: 4,
      pricePaidCents: 22000,
      paymentMethod: 'transfer',
    })

    expect(await getActivePackagesForClient(client.id)).toHaveLength(1)
    expect(await listPaymentsForClient(client.id)).toHaveLength(1)

    const paymentIds = await deletePackage(pkg.id)

    expect(await getActivePackagesForClient(client.id)).toHaveLength(0)
    expect(await listPaymentsForClient(client.id)).toHaveLength(0)

    await restorePackage(pkg.id, paymentIds)

    expect(await getActivePackagesForClient(client.id)).toHaveLength(1)
    const payments = await listPaymentsForClient(client.id)
    expect(payments).toHaveLength(1)
    expect(payments[0].amountCents).toBe(22000)
  })
})

describe('getActivePackagesForClient', () => {
  it('stops listing a package as active once every session in it has been attended, so a new one can be bought', async () => {
    const client = await createClient({ kind: 'individual', people: [{ name: 'Iker Vidal' }] })
    const serviceType = (await listServiceTypes())[0]

    const pkg = await createPackage({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      label: 'Bono 1 sesión',
      totalSessions: 1,
      pricePaidCents: 6000,
      paymentMethod: 'cash',
    })

    expect(await getActivePackagesForClient(client.id)).toHaveLength(1)

    const session = await createSession({
      clientId: client.id,
      serviceTypeId: serviceType.id,
      startAt: Date.now(),
      modality: 'online',
      usePackage: true,
    })
    expect(session.packageId).toBe(pkg.id)

    await updateSessionAttendance(session.id, 'attended')

    expect(await getActivePackagesForClient(client.id)).toHaveLength(0)
  })
})
