import { db } from '@/db/database'
import {
  calculatePackageBalance,
  canConsumePackageSlot,
  derivePackageStatus,
  type PackageBalance,
} from '@/domain/packages'
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

/** Soft-deletes a package and its up-front payment together, so totals stay consistent. Returns
 * the ids of the payments this call actually deleted, so a later undo restores exactly those —
 * not a payment that had already been deleted independently before this package was deleted. */
export async function deletePackage(id: string): Promise<string[]> {
  return db.transaction('rw', db.packages, db.payments, async () => {
    await db.packages.update(id, { deletedAt: Date.now() })
    const payments = await db.payments.where('packageId').equals(id).toArray()
    const active = payments.filter((p) => p.deletedAt === null)
    await Promise.all(active.map((p) => db.payments.update(p.id, { deletedAt: Date.now() })))
    return active.map((p) => p.id)
  })
}

/** Undo for deletePackage — `paymentIds` should be exactly what that call returned. */
export async function restorePackage(id: string, paymentIds: readonly string[] = []): Promise<void> {
  await db.transaction('rw', db.packages, db.payments, async () => {
    await db.packages.update(id, { deletedAt: null })
    await Promise.all(paymentIds.map((paymentId) => db.payments.update(paymentId, { deletedAt: null })))
  })
}

/** A package's `status` field is only authoritative for the manual states ('refunded',
 * 'cancelled') — 'active'/'exhausted'/'expired' are derived live from its sessions here, so a
 * package that's been fully consumed stops blocking "+ Añadir bono" for that client without
 * needing every session mutation to remember to write back a new stored status. */
export async function getActivePackagesForClient(clientId: string): Promise<Package[]> {
  const packages = await db.packages.where('clientId').equals(clientId).toArray()
  const now = Date.now()
  const active: Package[] = []
  for (const pkg of packages) {
    if (pkg.deletedAt !== null) continue
    const sessions = await db.sessions.where('packageId').equals(pkg.id).toArray()
    const balance = calculatePackageBalance(pkg, sessions)
    if (derivePackageStatus(pkg, balance, now) === 'active') {
      active.push(pkg)
    }
  }
  return active
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
