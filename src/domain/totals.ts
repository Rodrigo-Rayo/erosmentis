import { isSessionBillable } from './pricing'
import { sumCents } from './money'
import type { Session } from './types'

export interface MonthTotals {
  billedCents: number
  collectedCents: number
  pendingCents: number
  billableSessionCount: number
  pendingSessionCount: number
}

function activeSessions(sessions: readonly Session[]): Session[] {
  return sessions.filter((s) => s.deletedAt === null)
}

export function calculateBilledCents(sessions: readonly Session[]): number {
  const billable = activeSessions(sessions).filter(isSessionBillable)
  return sumCents(billable.map((s) => s.priceCents))
}

export function pendingSessions(sessions: readonly Session[]): Session[] {
  return activeSessions(sessions)
    .filter(isSessionBillable)
    .filter((s) => s.paymentStatus === 'pending')
}

export function calculatePendingCents(sessions: readonly Session[]): number {
  return sumCents(pendingSessions(sessions).map((s) => s.priceCents))
}

/**
 * Billed, collected and pending are all derived from each session's own paymentStatus
 * within the requested set of sessions (e.g. one month's sessions by startAt). This is a
 * deliberate choice over summing separate Payment records by paidAt: a session scheduled
 * next month but paid today would otherwise show up in next month's "Facturado" while its
 * payment landed in this month's "Cobrado" — billed and collected would never reconcile in
 * either month. Keeping everything keyed off the session guarantees
 * billedCents === collectedCents + pendingCents for the same input every time.
 */
export function calculateMonthTotals(sessions: readonly Session[]): MonthTotals {
  const billable = activeSessions(sessions).filter(isSessionBillable)
  const pending = billable.filter((s) => s.paymentStatus === 'pending')
  const collected = billable.filter((s) => s.paymentStatus !== 'pending')

  return {
    billedCents: sumCents(billable.map((s) => s.priceCents)),
    collectedCents: sumCents(collected.map((s) => s.priceCents)),
    pendingCents: sumCents(pending.map((s) => s.priceCents)),
    billableSessionCount: billable.length,
    pendingSessionCount: pending.length,
  }
}
