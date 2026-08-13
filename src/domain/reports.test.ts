import { describe, expect, it } from 'vitest'
import {
  calculateAverageSessionCents,
  calculateServiceTypeBreakdown,
  calculateYearBreakdown,
} from './reports'
import type { ServiceType, Session } from './types'

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: crypto.randomUUID(),
    clientId: 'client-1',
    serviceTypeId: 'individual',
    startAt: Date.UTC(2026, 0, 15),
    durationMin: 50,
    modality: 'online',
    attendance: 'scheduled',
    paymentStatus: 'pending',
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

function makeServiceType(id: string, name: string, colorToken: string): ServiceType {
  return {
    id,
    name,
    durationMin: 50,
    priceCents: 6000,
    isBillable: true,
    clientKind: 'any',
    colorToken,
    sortOrder: 0,
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
  }
}

describe('calculateServiceTypeBreakdown', () => {
  const serviceTypesById = new Map([
    ['individual', makeServiceType('individual', 'Terapia individual', 'accent')],
    ['pareja', makeServiceType('pareja', 'Terapia de pareja', 'couple-a')],
  ])

  it('sums billed amount and session count per service type, sorted by amount descending', () => {
    const sessions = [
      makeSession({ serviceTypeId: 'individual', priceCents: 6000 }),
      makeSession({ serviceTypeId: 'individual', priceCents: 6000 }),
      makeSession({ serviceTypeId: 'pareja', priceCents: 8000 }),
    ]

    const breakdown = calculateServiceTypeBreakdown(sessions, serviceTypesById)

    expect(breakdown).toEqual([
      { serviceTypeId: 'individual', name: 'Terapia individual', colorToken: 'accent', billedCents: 12000, sessionCount: 2 },
      { serviceTypeId: 'pareja', name: 'Terapia de pareja', colorToken: 'couple-a', billedCents: 8000, sessionCount: 1 },
    ])
  })

  it('excludes cancelled and soft-deleted sessions from the breakdown', () => {
    const sessions = [
      makeSession({ serviceTypeId: 'individual', priceCents: 6000 }),
      makeSession({ serviceTypeId: 'individual', priceCents: 6000, attendance: 'cancelled_by_client' }),
      makeSession({ serviceTypeId: 'individual', priceCents: 6000, deletedAt: Date.now() }),
    ]

    const breakdown = calculateServiceTypeBreakdown(sessions, serviceTypesById)

    expect(breakdown).toEqual([
      { serviceTypeId: 'individual', name: 'Terapia individual', colorToken: 'accent', billedCents: 6000, sessionCount: 1 },
    ])
  })
})

describe('calculateYearBreakdown', () => {
  it('groups by calendar year, most recent first, using the same billed/collected rules as calculateMonthTotals', () => {
    const sessions = [
      makeSession({ startAt: Date.UTC(2024, 5, 1), priceCents: 6000, paymentStatus: 'paid' }),
      makeSession({ startAt: Date.UTC(2025, 2, 1), priceCents: 8000, paymentStatus: 'pending' }),
      makeSession({ startAt: Date.UTC(2025, 8, 1), priceCents: 6000, paymentStatus: 'paid' }),
    ]

    const breakdown = calculateYearBreakdown(sessions)

    expect(breakdown).toEqual([
      { year: 2025, billedCents: 14000, collectedCents: 6000 },
      { year: 2024, billedCents: 6000, collectedCents: 6000 },
    ])
  })
})

describe('calculateAverageSessionCents', () => {
  it('divides billed by billable session count, rounding to the nearest cent', () => {
    expect(calculateAverageSessionCents(20000, 3)).toBe(6667)
  })

  it('returns 0 when there are no billable sessions, instead of dividing by zero', () => {
    expect(calculateAverageSessionCents(0, 0)).toBe(0)
  })
})
