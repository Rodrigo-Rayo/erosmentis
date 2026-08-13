import { calculateMonthTotals } from './totals'
import { isSessionBillable } from './pricing'
import type { Session, ServiceType } from './types'

export interface ServiceTypeBreakdownItem {
  serviceTypeId: string
  name: string
  colorToken: string
  billedCents: number
  sessionCount: number
}

/** Billed total and session count per service type, sorted by billed amount descending —
 * reuses the same billable/deleted rules as calculateMonthTotals so the sum of these rows
 * always matches the overall "Facturado" figure for the same session set. */
export function calculateServiceTypeBreakdown(
  sessions: readonly Session[],
  serviceTypesById: ReadonlyMap<string, ServiceType>,
): ServiceTypeBreakdownItem[] {
  const billable = sessions.filter((s) => s.deletedAt === null && isSessionBillable(s))
  const totals = new Map<string, { billedCents: number; sessionCount: number }>()

  for (const session of billable) {
    const entry = totals.get(session.serviceTypeId) ?? { billedCents: 0, sessionCount: 0 }
    entry.billedCents += session.priceCents
    entry.sessionCount += 1
    totals.set(session.serviceTypeId, entry)
  }

  return [...totals.entries()]
    .map(([serviceTypeId, entry]) => ({
      serviceTypeId,
      name: serviceTypesById.get(serviceTypeId)?.name ?? 'Otro',
      colorToken: serviceTypesById.get(serviceTypeId)?.colorToken ?? 'accent',
      ...entry,
    }))
    .sort((a, b) => b.billedCents - a.billedCents)
}

export interface YearBreakdownItem {
  year: number
  billedCents: number
  collectedCents: number
}

/** One row per calendar year present in `sessions`, most recent first. */
export function calculateYearBreakdown(sessions: readonly Session[]): YearBreakdownItem[] {
  const byYear = new Map<number, Session[]>()
  for (const session of sessions) {
    const year = new Date(session.startAt).getFullYear()
    const bucket = byYear.get(year)
    if (bucket) {
      bucket.push(session)
    } else {
      byYear.set(year, [session])
    }
  }

  return [...byYear.entries()]
    .map(([year, yearSessions]) => {
      const totals = calculateMonthTotals(yearSessions)
      return { year, billedCents: totals.billedCents, collectedCents: totals.collectedCents }
    })
    .sort((a, b) => b.year - a.year)
}

/** Average billed price per billable session, in cents — 0 when there are none. */
export function calculateAverageSessionCents(billedCents: number, billableSessionCount: number): number {
  if (billableSessionCount === 0) return 0
  return Math.round(billedCents / billableSessionCount)
}
