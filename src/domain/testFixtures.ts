import type { Package, Payment, Session } from './types'

let counter = 0
function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}`
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: nextId('session'),
    clientId: 'client-1',
    serviceTypeId: 'service-individual',
    startAt: Date.UTC(2026, 7, 12, 17, 0, 0),
    durationMin: 50,
    modality: 'online',
    attendance: 'scheduled',
    paymentStatus: 'pending',
    priceCents: 6000,
    packageId: null,
    countsAgainstPackage: false,
    isBillableOverride: null,
    seriesId: null,
    notes: '',
    createdAt: Date.UTC(2026, 7, 1),
    updatedAt: Date.UTC(2026, 7, 1),
    deletedAt: null,
    ...overrides,
  }
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: nextId('payment'),
    clientId: 'client-1',
    kind: 'session',
    sessionId: null,
    packageId: null,
    amountCents: 6000,
    method: 'bizum',
    paidAt: Date.UTC(2026, 7, 12),
    notes: '',
    createdAt: Date.UTC(2026, 7, 12),
    updatedAt: Date.UTC(2026, 7, 12),
    deletedAt: null,
    ...overrides,
  }
}

export function makePackage(overrides: Partial<Package> = {}): Package {
  return {
    id: nextId('package'),
    clientId: 'client-1',
    serviceTypeId: 'service-individual',
    label: 'Bono 4 sesiones',
    totalSessions: 4,
    pricePaidCents: 22000,
    perSessionValueCents: 5500,
    purchasedAt: Date.UTC(2026, 7, 1),
    expiresAt: null,
    status: 'active',
    notes: '',
    createdAt: Date.UTC(2026, 7, 1),
    updatedAt: Date.UTC(2026, 7, 1),
    deletedAt: null,
    ...overrides,
  }
}
