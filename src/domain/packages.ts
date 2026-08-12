import type { Package, PackageStatus, Session } from './types'

export interface PackageBalance {
  used: number
  reserved: number
  forfeited: number
  remaining: number
  available: number
}

export function calculatePackageBalance(
  pkg: Pick<Package, 'id' | 'totalSessions'>,
  sessions: readonly Session[],
): PackageBalance {
  const pkgSessions = sessions.filter((s) => s.packageId === pkg.id && s.deletedAt === null)

  const used = pkgSessions.filter((s) => s.attendance === 'attended').length
  const reserved = pkgSessions.filter((s) => s.attendance === 'scheduled').length
  const forfeited = pkgSessions.filter(
    (s) => s.attendance === 'no_show' && s.countsAgainstPackage,
  ).length

  const remaining = Math.max(0, pkg.totalSessions - used - forfeited)
  const available = Math.max(0, remaining - reserved)

  return { used, reserved, forfeited, remaining, available }
}

export function derivePackageStatus(
  pkg: Pick<Package, 'status' | 'expiresAt'>,
  balance: PackageBalance,
  now: number,
): PackageStatus {
  if (pkg.status === 'refunded' || pkg.status === 'cancelled') {
    return pkg.status
  }
  if (pkg.expiresAt !== null && now > pkg.expiresAt && balance.remaining > 0) {
    return 'expired'
  }
  if (balance.remaining <= 0) {
    return 'exhausted'
  }
  return 'active'
}

export function isLowBalance(balance: PackageBalance, threshold: number): boolean {
  return balance.available > 0 && balance.available <= threshold
}

export function canConsumePackageSlot(
  pkg: Pick<Package, 'id' | 'totalSessions'>,
  sessions: readonly Session[],
): boolean {
  const balance = calculatePackageBalance(pkg, sessions)
  return balance.available > 0
}
