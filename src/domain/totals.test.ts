import { describe, expect, it } from 'vitest'
import { calculateMonthTotals } from './totals'
import { makeSession } from './testFixtures'

describe('calculateMonthTotals', () => {
  it('reconciles a fixture month with a free consult, a bono session, a no-show and a pending session', () => {
    const sessions = [
      // Free initial consultation — must contribute EUR 0 to every revenue total.
      makeSession({
        id: 's-free',
        paymentStatus: 'free',
        priceCents: 0,
        attendance: 'attended',
      }),
      // Regular session, already paid.
      makeSession({
        id: 's-paid',
        paymentStatus: 'paid',
        priceCents: 6000,
        attendance: 'attended',
      }),
      // Regular session, still owed.
      makeSession({
        id: 's-pending',
        paymentStatus: 'pending',
        priceCents: 6000,
        attendance: 'attended',
      }),
      // Bono-covered session — billed (and counted as collected) at the discounted
      // per-session value, not list price.
      makeSession({
        id: 's-package',
        paymentStatus: 'package',
        priceCents: 5500,
        packageId: 'pkg-1',
        attendance: 'attended',
      }),
      // No-show — billable by default (slot was reserved), still unpaid.
      makeSession({
        id: 's-noshow',
        paymentStatus: 'pending',
        priceCents: 6000,
        attendance: 'no_show',
      }),
      // Client cancellation — not billable by default.
      makeSession({
        id: 's-cancelled',
        paymentStatus: 'pending',
        priceCents: 6000,
        attendance: 'cancelled_by_client',
      }),
      // Soft-deleted session must be excluded entirely.
      makeSession({
        id: 's-deleted',
        paymentStatus: 'pending',
        priceCents: 6000,
        attendance: 'attended',
        deletedAt: Date.now(),
      }),
    ]

    const totals = calculateMonthTotals(sessions)

    // Billed = paid (6000) + pending (6000) + package (5500) + no-show (6000) = 23500
    expect(totals.billedCents).toBe(23500)
    // Collected = paid (6000) + package (5500) = 11500
    expect(totals.collectedCents).toBe(11500)
    // Pending = pending (6000) + no-show (6000) = 12000
    expect(totals.pendingCents).toBe(12000)
    expect(totals.billableSessionCount).toBe(4)
    expect(totals.pendingSessionCount).toBe(2)
  })

  it('returns all zeros for an empty month', () => {
    const totals = calculateMonthTotals([])
    expect(totals).toEqual({
      billedCents: 0,
      collectedCents: 0,
      pendingCents: 0,
      billableSessionCount: 0,
      pendingSessionCount: 0,
    })
  })

  it('always reconciles: billed equals collected plus pending, regardless of when each session was paid', () => {
    // A session scheduled for next month but already marked paid today is the exact
    // scenario that used to make "Cobrado" show 0 while "Facturado" showed the price:
    // collected used to be computed from a separate Payment query filtered by paidAt,
    // which could fall in a different month than the session's own startAt.
    const nextMonthStart = Date.UTC(2026, 8, 5, 10, 0)
    const sessions = [
      makeSession({ id: 's-1', paymentStatus: 'paid', priceCents: 6000, startAt: nextMonthStart }),
      makeSession({ id: 's-2', paymentStatus: 'pending', priceCents: 6000, startAt: nextMonthStart }),
    ]

    const totals = calculateMonthTotals(sessions)

    expect(totals.billedCents).toBe(totals.collectedCents + totals.pendingCents)
    expect(totals.collectedCents).toBe(6000)
    expect(totals.pendingCents).toBe(6000)
  })
})
