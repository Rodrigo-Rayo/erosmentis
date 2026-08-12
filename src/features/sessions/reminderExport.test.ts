import { describe, expect, it } from 'vitest'
import { buildSessionReminderIcs } from './reminderExport'
import { makeSession } from '@/domain/testFixtures'
import type { Client, ServiceType } from '@/domain/types'

const client: Client = {
  id: 'client-1',
  kind: 'individual',
  displayName: 'Marc Ruiz',
  searchName: 'marc ruiz',
  people: [{ name: 'Marc Ruiz' }],
  defaultServiceTypeId: null,
  defaultModality: null,
  status: 'active',
  notes: '',
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
}

const serviceType: ServiceType = {
  id: 'service-1',
  name: 'Terapia individual',
  durationMin: 50,
  priceCents: 6000,
  isBillable: true,
  clientKind: 'individual',
  colorToken: 'accent',
  sortOrder: 0,
  isArchived: false,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
}

describe('buildSessionReminderIcs', () => {
  it('includes a 24-hour and a 1-hour VALARM before the session', () => {
    const session = makeSession({ startAt: Date.UTC(2026, 7, 12, 17, 0, 0), durationMin: 50 })
    const ics = buildSessionReminderIcs(session, client, serviceType)

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('TRIGGER:-P1D')
    expect(ics).toContain('TRIGGER:-PT1H')
    expect(ics).toContain('DTSTART:20260812T170000Z')
    expect(ics).toContain('DTEND:20260812T175000Z')
    expect(ics).toContain('SUMMARY:Sesión con Marc Ruiz — Erosmentis')
  })

  it('falls back gracefully when client or service type is missing', () => {
    const session = makeSession()
    const ics = buildSessionReminderIcs(session, undefined, undefined)
    expect(ics).toContain('SUMMARY:Sesión con paciente — Erosmentis')
  })
})
