import { describe, expect, it } from 'vitest'
import { calculatePackageBalance, canConsumePackageSlot, derivePackageStatus, isLowBalance } from './packages'
import { makePackage, makeSession } from './testFixtures'

describe('calculatePackageBalance', () => {
  it('starts fully available for a fresh package with no sessions', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 4 })
    const balance = calculatePackageBalance(pkg, [])
    expect(balance).toEqual({ used: 0, reserved: 0, forfeited: 0, remaining: 4, available: 4 })
  })

  it('counts attended sessions as used and reduces remaining', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 4 })
    const sessions = [
      makeSession({ packageId: 'pkg-1', attendance: 'attended' }),
      makeSession({ packageId: 'pkg-1', attendance: 'attended' }),
    ]
    const balance = calculatePackageBalance(pkg, sessions)
    expect(balance.used).toBe(2)
    expect(balance.remaining).toBe(2)
    expect(balance.available).toBe(2)
  })

  it('counts scheduled sessions as reserved without reducing remaining', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 4 })
    const sessions = [
      makeSession({ packageId: 'pkg-1', attendance: 'attended' }),
      makeSession({ packageId: 'pkg-1', attendance: 'scheduled' }),
    ]
    const balance = calculatePackageBalance(pkg, sessions)
    expect(balance.remaining).toBe(3)
    expect(balance.reserved).toBe(1)
    expect(balance.available).toBe(2)
  })

  it('does not burn a slot for a cancelled bono session', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 4 })
    const sessions = [
      makeSession({ packageId: 'pkg-1', attendance: 'cancelled_by_client', countsAgainstPackage: false }),
    ]
    const balance = calculatePackageBalance(pkg, sessions)
    expect(balance.remaining).toBe(4)
    expect(balance.available).toBe(4)
  })

  it('burns a slot for a no-show marked as counting against the package', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 4 })
    const sessions = [
      makeSession({ packageId: 'pkg-1', attendance: 'no_show', countsAgainstPackage: true }),
    ]
    const balance = calculatePackageBalance(pkg, sessions)
    expect(balance.forfeited).toBe(1)
    expect(balance.remaining).toBe(3)
  })

  it('does not burn a slot for a no-show explicitly excluded from the package', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 4 })
    const sessions = [
      makeSession({ packageId: 'pkg-1', attendance: 'no_show', countsAgainstPackage: false }),
    ]
    const balance = calculatePackageBalance(pkg, sessions)
    expect(balance.forfeited).toBe(0)
    expect(balance.remaining).toBe(4)
  })

  it('ignores soft-deleted sessions', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 4 })
    const sessions = [
      makeSession({ packageId: 'pkg-1', attendance: 'attended', deletedAt: Date.now() }),
    ]
    const balance = calculatePackageBalance(pkg, sessions)
    expect(balance.used).toBe(0)
    expect(balance.remaining).toBe(4)
  })

  it('ignores sessions belonging to a different package', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 4 })
    const sessions = [makeSession({ packageId: 'pkg-other', attendance: 'attended' })]
    const balance = calculatePackageBalance(pkg, sessions)
    expect(balance.used).toBe(0)
  })

  it('never goes negative when more sessions are logged than the package total', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 2 })
    const sessions = [
      makeSession({ packageId: 'pkg-1', attendance: 'attended' }),
      makeSession({ packageId: 'pkg-1', attendance: 'attended' }),
      makeSession({ packageId: 'pkg-1', attendance: 'attended' }),
    ]
    const balance = calculatePackageBalance(pkg, sessions)
    expect(balance.remaining).toBe(0)
    expect(balance.available).toBe(0)
  })
})

describe('derivePackageStatus', () => {
  it('is active when sessions remain and nothing has expired', () => {
    const balance = { used: 1, reserved: 0, forfeited: 0, remaining: 3, available: 3 }
    expect(derivePackageStatus({ status: 'active', expiresAt: null }, balance, Date.now())).toBe(
      'active',
    )
  })

  it('is exhausted once remaining reaches zero', () => {
    const balance = { used: 4, reserved: 0, forfeited: 0, remaining: 0, available: 0 }
    expect(derivePackageStatus({ status: 'active', expiresAt: null }, balance, Date.now())).toBe(
      'exhausted',
    )
  })

  it('is expired when past the expiry date with sessions still remaining', () => {
    const balance = { used: 1, reserved: 0, forfeited: 0, remaining: 3, available: 3 }
    const now = Date.UTC(2026, 5, 1)
    const expiresAt = Date.UTC(2026, 4, 1)
    expect(derivePackageStatus({ status: 'active', expiresAt }, balance, now)).toBe('expired')
  })

  it('keeps a manually refunded or cancelled status regardless of balance', () => {
    const balance = { used: 0, reserved: 0, forfeited: 0, remaining: 4, available: 4 }
    expect(derivePackageStatus({ status: 'refunded', expiresAt: null }, balance, Date.now())).toBe(
      'refunded',
    )
    expect(derivePackageStatus({ status: 'cancelled', expiresAt: null }, balance, Date.now())).toBe(
      'cancelled',
    )
  })
})

describe('isLowBalance', () => {
  it('flags when available is at or below the threshold but still positive', () => {
    expect(isLowBalance({ used: 3, reserved: 0, forfeited: 0, remaining: 1, available: 1 }, 1)).toBe(
      true,
    )
  })

  it('does not flag an exhausted package as a low-balance nudge', () => {
    expect(isLowBalance({ used: 4, reserved: 0, forfeited: 0, remaining: 0, available: 0 }, 1)).toBe(
      false,
    )
  })

  it('does not flag a healthy balance', () => {
    expect(isLowBalance({ used: 0, reserved: 0, forfeited: 0, remaining: 4, available: 4 }, 1)).toBe(
      false,
    )
  })
})

describe('canConsumePackageSlot', () => {
  it('allows consumption when a slot is available', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 4 })
    expect(canConsumePackageSlot(pkg, [])).toBe(true)
  })

  it('blocks consumption once the package is exhausted', () => {
    const pkg = makePackage({ id: 'pkg-1', totalSessions: 1 })
    const sessions = [makeSession({ packageId: 'pkg-1', attendance: 'attended' })]
    expect(canConsumePackageSlot(pkg, sessions)).toBe(false)
  })
})
