import { describe, expect, it } from 'vitest'
import { isSessionBillable, resolveSessionPrice } from './pricing'
import { makeSession } from './testFixtures'

describe('resolveSessionPrice', () => {
  it('uses the service type list price when there is no active package', () => {
    expect(resolveSessionPrice({ priceCents: 6000 })).toBe(6000)
  })

  it('uses the package per-session value when the session is covered by a bono', () => {
    expect(resolveSessionPrice({ priceCents: 6000 }, 5500)).toBe(5500)
  })
})

describe('isSessionBillable', () => {
  it('is billable by default for an attended session', () => {
    expect(isSessionBillable(makeSession({ attendance: 'attended', paymentStatus: 'pending' }))).toBe(
      true,
    )
  })

  it('is not billable for a free session', () => {
    expect(isSessionBillable(makeSession({ paymentStatus: 'free' }))).toBe(false)
  })

  it('is not billable for a client cancellation by default', () => {
    expect(isSessionBillable(makeSession({ attendance: 'cancelled_by_client' }))).toBe(false)
  })

  it('is not billable for a therapist cancellation by default', () => {
    expect(isSessionBillable(makeSession({ attendance: 'cancelled_by_therapist' }))).toBe(false)
  })

  it('is billable for a no-show by default', () => {
    expect(isSessionBillable(makeSession({ attendance: 'no_show' }))).toBe(true)
  })

  it('respects an explicit override even for an otherwise free session', () => {
    expect(
      isSessionBillable(makeSession({ paymentStatus: 'free', isBillableOverride: true })),
    ).toBe(true)
  })

  it('respects an explicit override even for an otherwise billable session', () => {
    expect(
      isSessionBillable(makeSession({ attendance: 'attended', isBillableOverride: false })),
    ).toBe(false)
  })

  it('is billable for a session covered by a package', () => {
    expect(
      isSessionBillable(
        makeSession({ paymentStatus: 'package', packageId: 'pkg-1', attendance: 'attended' }),
      ),
    ).toBe(true)
  })
})
