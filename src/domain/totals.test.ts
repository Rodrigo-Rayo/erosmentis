import { describe, expect, it } from 'vitest'
import { calculateMonthTotals } from './totals'
import { makePayment, makeSession } from './testFixtures'

describe('calculateMonthTotals', () => {
  it('reconciles a fixture month with a free consult, a bono session, a no-show and a pending payment', () => {
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
      // Bono-covered session — billed at the discounted per-session value, not list price.
      makeSession({
        id: 's-package',
        paymentStatus: 'package',
        priceCents: 5500,
        packageId: 'pkg-1',
        attendance: 'attended',
      }),
      // No-show — billable by default (slot was reserved).
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

    const payments = [
      makePayment({ id: 'p-1', sessionId: 's-paid', amountCents: 6000 }),
      // Package purchase payment, collected up front.
      makePayment({ id: 'p-2', kind: 'package', packageId: 'pkg-1', amountCents: 22000 }),
    ]

    const totals = calculateMonthTotals(sessions, payments)

    // Billed = paid (6000) + pending (6000) + package (5500) + no-show (6000) = 23500
    expect(totals.billedCents).toBe(23500)
    // Collected = session payment (6000) + package purchase payment (22000) = 28000
    expect(totals.collectedCents).toBe(28000)
    // Pending = the one still-owed regular session = 6000 (no-show is pending status too)
    expect(totals.pendingCents).toBe(12000)
    expect(totals.billableSessionCount).toBe(4)
    expect(totals.pendingSessionCount).toBe(2)
  })

  it('returns all zeros for an empty month', () => {
    const totals = calculateMonthTotals([], [])
    expect(totals).toEqual({
      billedCents: 0,
      collectedCents: 0,
      pendingCents: 0,
      billableSessionCount: 0,
      pendingSessionCount: 0,
    })
  })

  it('excludes refunded/negative payments correctly by summing them as negative', () => {
    const payments = [
      makePayment({ id: 'p-1', amountCents: 6000 }),
      makePayment({ id: 'p-2', amountCents: -6000 }),
    ]
    const totals = calculateMonthTotals([], payments)
    expect(totals.collectedCents).toBe(0)
  })
})
