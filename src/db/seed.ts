import { db } from '@/db/database'
import { ensureSettings, updateSettings } from '@/db/repositories/settings.repo'
import type { ServiceType } from '@/domain/types'

const SEED_VERSION = 1

function serviceType(
  overrides: Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
): ServiceType {
  const now = Date.now()
  return {
    ...overrides,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

const DEFAULT_SERVICE_TYPES: Array<Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> = [
  {
    name: 'Consulta inicial gratuita',
    durationMin: 15,
    priceCents: 0,
    isBillable: false,
    clientKind: 'any',
    colorToken: 'couple-a',
    sortOrder: 0,
    isArchived: false,
  },
  {
    name: 'Terapia individual',
    durationMin: 50,
    priceCents: 6000,
    isBillable: true,
    clientKind: 'individual',
    colorToken: 'accent',
    sortOrder: 1,
    isArchived: false,
  },
  {
    name: 'Asesoramiento sexológico',
    durationMin: 50,
    priceCents: 6000,
    isBillable: true,
    clientKind: 'individual',
    colorToken: 'positive',
    sortOrder: 2,
    isArchived: false,
  },
  {
    name: 'Terapia de pareja',
    durationMin: 60,
    priceCents: 8000,
    isBillable: true,
    clientKind: 'couple',
    colorToken: 'couple-b',
    sortOrder: 3,
    isArchived: false,
  },
]

export async function seedIfNeeded(): Promise<void> {
  const settings = await ensureSettings()
  if (settings.seedVersion >= SEED_VERSION) {
    return
  }

  const existingCount = await db.serviceTypes.count()
  if (existingCount === 0) {
    const seeded = DEFAULT_SERVICE_TYPES.map(serviceType)
    await db.serviceTypes.bulkAdd(seeded)
  }

  await updateSettings({ seedVersion: SEED_VERSION })
}
