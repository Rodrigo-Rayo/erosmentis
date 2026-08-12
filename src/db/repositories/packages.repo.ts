import { db } from '@/db/database'
import { calculatePackageBalance, canConsumePackageSlot, type PackageBalance } from '@/domain/packages'
import { splitEvenly } from '@/domain/money'
import type { Package, PaymentMethod } from '@/domain/types'

export interface CreatePackageInput {
  clientId: string
  serviceTypeId: string | null
  label: string
  totalSessions: number
  pricePaidCents: number
  expiresAt?: number | null
  notes?: string
  paymentMethod: PaymentMethod
  paidAt?: number
}

export async function createPackage(input: CreatePackageInput): Promise<Package> {
  const now = Date.now()
  const pkg: Package = {
    id: crypto.randomUUID(),
    clientId: input.clientId,
    serviceTypeId: input.serviceTypeId,
    label: input.label,
    totalSessions: input.totalSessions,
    pricePaidCents: input.pricePaidCents,
    perSessionValueCents: splitEvenly(input.pricePaidCents, input.totalSessions),
    purchasedAt: now,
    expiresAt: input.expiresAt ?? null,
    status: 'active',
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  await db.transaction('rw', db.packages, db.payments, async () => {
    await db.packages.add(pkg)
    await db.payments.add({
      id: crypto.randomUUID(),
      clientId: input.clientId,
      kind: 'package',
      sessionId: null,
      packageId: pkg.id,
      amountCents: input.pricePaidCents,
      method: input.paymentMethod,
      paidAt: input.paidAt ?? now,
      notes: '',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  })

  return pkg
}

/** Soft-deletes a package and its up-front payment together, so totals stay consistent. */
export async function deletePackage(id: string): Promise<void> {
  await db.transaction('rw', db.packages, db.payments, async () => {
    await db.packages.update(id, { deletedAt: Date.now() })
    const payments = await db.payments.where('packageId').equals(id).toArray()
    await Promise.all(
      payments
        .filter((p) => p.deletedAt === null)
        .map((p) => db.payments.update(p.id, { deletedAt: Date.now() })),
    )
  })
}

export async function restorePackage(id: string): Promise<void> {
  await db.transaction('rw', db.packages, db.payments, async () => {
    await db.packages.update(id, { deletedAt: null })
    const payments = await db.payments.where('packageId').equals(id).toArray()
    await Promise.all(payments.map((p) => db.payments.update(p.id, { deletedAt: null })))
  })
}

export async function getActivePackagesForClient(clientId: string): Promise<Package[]> {
  const packages = await db.packages.where('[clientId+status]').equals([clientId, 'active']).toArray()
  return packages.filter((p) => p.deletedAt === null)
}

export async function getPackageBalance(packageId: string): Promise<PackageBalance | null> {
  const pkg = await db.packages.get(packageId)
  if (!pkg) {
    return null
  }
  const sessions = await db.sessions.where('packageId').equals(packageId).toArray()
  return calculatePackageBalance(pkg, sessions)
}

export async function findConsumablePackage(
  clientId: string,
  serviceTypeId: string,
): Promise<Package | null> {
  const active = await getActivePackagesForClient(clientId)
  const matching = active.filter((p) => p.serviceTypeId === null || p.serviceTypeId === serviceTypeId)

  for (const pkg of matching) {
    const sessions = await db.sessions.where('packageId').equals(pkg.id).toArray()
    if (canConsumePackageSlot(pkg, sessions)) {
      return pkg
    }
  }
  return null
}
