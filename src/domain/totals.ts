import { isSessionBillable } from './pricing'
import { sumCents } from './money'
import type { Payment, Session } from './types'

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

function activePayments(payments: readonly Payment[]): Payment[] {
  return payments.filter((p) => p.deletedAt === null)
}

export function calculateBilledCents(sessions: readonly Session[]): number {
  const billable = activeSessions(sessions).filter(isSessionBillable)
  return sumCents(billable.map((s) => s.priceCents))
}

export function calculateCollectedCents(payments: readonly Payment[]): number {
  return sumCents(activePayments(payments).map((p) => p.amountCents))
}

export function pendingSessions(sessions: readonly Session[]): Session[] {
  return activeSessions(sessions)
    .filter(isSessionBillable)
    .filter((s) => s.paymentStatus === 'pending')
}

export function calculatePendingCents(sessions: readonly Session[]): number {
  return sumCents(pendingSessions(sessions).map((s) => s.priceCents))
}

export function calculateMonthTotals(
  sessions: readonly Session[],
  payments: readonly Payment[],
): MonthTotals {
  const billable = activeSessions(sessions).filter(isSessionBillable)
  const pending = billable.filter((s) => s.paymentStatus === 'pending')

  return {
    billedCents: sumCents(billable.map((s) => s.priceCents)),
    collectedCents: calculateCollectedCents(payments),
    pendingCents: sumCents(pending.map((s) => s.priceCents)),
    billableSessionCount: billable.length,
    pendingSessionCount: pending.length,
  }
}
