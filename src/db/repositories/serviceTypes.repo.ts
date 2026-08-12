import { db } from '@/db/database'
import type { ServiceType } from '@/domain/types'

export async function listServiceTypes(includeArchived = false): Promise<ServiceType[]> {
  const all = await db.serviceTypes.orderBy('sortOrder').toArray()
  const active = all.filter((s) => s.deletedAt === null)
  return includeArchived ? active : active.filter((s) => !s.isArchived)
}

export async function getServiceType(id: string): Promise<ServiceType | undefined> {
  return db.serviceTypes.get(id)
}

export async function createServiceType(
  input: Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
): Promise<ServiceType> {
  const now = Date.now()
  const serviceType: ServiceType = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.serviceTypes.add(serviceType)
  return serviceType
}

export async function updateServiceType(
  id: string,
  changes: Partial<Pick<ServiceType, 'name' | 'durationMin' | 'priceCents' | 'isBillable' | 'colorToken' | 'sortOrder' | 'isArchived'>>,
): Promise<void> {
  await db.serviceTypes.update(id, changes)
}
