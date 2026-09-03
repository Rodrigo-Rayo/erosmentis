import { describe, expect, it } from 'vitest'
import { backupPayloadSchema, validateBackupReferences, type BackupPayload } from './schemas'

function makeSession(overrides: Partial<BackupPayload['tables']['sessions'][number]> = {}) {
  return {
    id: 'session-1',
    clientId: 'client-1',
    serviceTypeId: 'service-1',
    startAt: Date.now(),
    durationMin: 50,
    modality: 'online' as const,
    attendance: 'scheduled' as const,
    paymentStatus: 'pending' as const,
    priceCents: 6000,
    packageId: null,
    countsAgainstPackage: true,
    isBillableOverride: null,
    seriesId: null,
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    ...overrides,
  }
}

function makePayload(overrides: Partial<BackupPayload['tables']> = {}): BackupPayload {
  return {
    version: 1,
    exportedAt: Date.now(),
    tables: {
      clients: [],
      serviceTypes: [],
      sessions: [],
      packages: [],
      payments: [],
      expenses: [],
      ...overrides,
    },
  }
}

describe('validateBackupReferences', () => {
  it('reports no issues for a self-consistent backup', () => {
    const payload = makePayload({
      clients: [
        {
          id: 'client-1',
          kind: 'individual',
          displayName: 'Ana',
          searchName: 'ana',
          people: [{ name: 'Ana' }],
          defaultServiceTypeId: null,
          defaultModality: null,
          status: 'active',
          notes: '',
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        },
      ],
      serviceTypes: [
        {
          id: 'service-1',
          name: 'Individual',
          durationMin: 50,
          priceCents: 6000,
          isBillable: true,
          clientKind: 'any',
          colorToken: 'accent',
          sortOrder: 0,
          isArchived: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        },
      ],
      sessions: [makeSession()],
    })

    expect(validateBackupReferences(payload)).toEqual([])
  })

  it('flags a session that references a client not present in the backup', () => {
    const payload = makePayload({ sessions: [makeSession({ clientId: 'ghost-client' })] })

    const issues = validateBackupReferences(payload)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]).toContain('ghost-client')
  })
})

describe('backupPayloadSchema size bounds', () => {
  it('rejects a session notes string past the length cap', () => {
    const payload = makePayload({ sessions: [makeSession({ notes: 'x'.repeat(20_001) })] })
    expect(backupPayloadSchema.safeParse(payload).success).toBe(false)
  })
})
