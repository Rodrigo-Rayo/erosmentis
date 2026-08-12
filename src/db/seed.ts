import { db } from '@/db/database'
import { ensureSettings, updateSettings } from '@/db/repositories/settings.repo'
import type { ServiceType } from '@/domain/types'

const SEED_VERSION = 2

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

// Ordered by how often she actually picks them — individual therapy first, the
// free intro call last since it's the rarest option in day-to-day use.
const DEFAULT_SERVICE_TYPES: Array<Omit<ServiceType, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> = [
  {
    name: 'Terapia individual',
    durationMin: 50,
    priceCents: 6000,
    isBillable: true,
    clientKind: 'individual',
    colorToken: 'accent',
    sortOrder: 0,
    isArchived: false,
  },
  {
    name: 'Asesoramiento sexológico',
    durationMin: 50,
    priceCents: 6000,
    isBillable: true,
    clientKind: 'individual',
    colorToken: 'positive',
    sortOrder: 1,
    isArchived: false,
  },
  {
    name: 'Terapia de pareja',
    durationMin: 60,
    priceCents: 8000,
    isBillable: true,
    clientKind: 'couple',
    colorToken: 'couple-b',
    sortOrder: 2,
    isArchived: false,
  },
  {
    name: 'Consulta inicial gratuita',
    durationMin: 15,
    priceCents: 0,
    isBillable: false,
    clientKind: 'any',
    colorToken: 'couple-a',
    sortOrder: 3,
    isArchived: false,
  },
]

/** Fixes the display order on a database seeded before v2, without touching prices or ids. */
async function reorderExistingServiceTypes(): Promise<void> {
  const existing = await db.serviceTypes.toArray()
  await Promise.all(
    existing.map((current) => {
      const wanted = DEFAULT_SERVICE_TYPES.find((d) => d.name === current.name)
      if (wanted && wanted.sortOrder !== current.sortOrder) {
        return db.serviceTypes.update(current.id, { sortOrder: wanted.sortOrder })
      }
      return Promise.resolve()
    }),
  )
}

export async function seedIfNeeded(): Promise<void> {
  const settings = await ensureSettings()
  if (settings.seedVersion >= SEED_VERSION) {
    return
  }

  const existingCount = await db.serviceTypes.count()
  if (existingCount === 0) {
    const seeded = DEFAULT_SERVICE_TYPES.map(serviceType)
    await db.serviceTypes.bulkAdd(seeded)
  } else {
    await reorderExistingServiceTypes()
  }

  await updateSettings({ seedVersion: SEED_VERSION })
}
