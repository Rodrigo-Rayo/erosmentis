import type { ServiceType, Session } from './types'

export function resolveSessionPrice(
  serviceType: Pick<ServiceType, 'priceCents'>,
  activePackagePerSessionValueCents?: number,
): number {
  if (activePackagePerSessionValueCents !== undefined) {
    return activePackagePerSessionValueCents
  }
  return serviceType.priceCents
}

export function isSessionBillable(session: Session): boolean {
  if (session.isBillableOverride !== null) {
    return session.isBillableOverride
  }
  if (session.paymentStatus === 'free') {
    return false
  }
  if (
    session.attendance === 'cancelled_by_client' ||
    session.attendance === 'cancelled_by_therapist'
  ) {
    return false
  }
  return true
}
