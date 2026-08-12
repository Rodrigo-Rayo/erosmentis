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

    await deletePackage(pkg.id)

    expect(await getActivePackagesForClient(client.id)).toHaveLength(0)
    expect(await listPaymentsForClient(client.id)).toHaveLength(0)

    await restorePackage(pkg.id)

    expect(await getActivePackagesForClient(client.id)).toHaveLength(1)
    const payments = await listPaymentsForClient(client.id)
    expect(payments).toHaveLength(1)
    expect(payments[0].amountCents).toBe(22000)
  })
})
