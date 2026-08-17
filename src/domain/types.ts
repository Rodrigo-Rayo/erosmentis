export type ClientKind = 'individual' | 'couple'

export interface Person {
  name: string
  phone?: string
  email?: string
  birthDate?: number
}

export interface Client {
  id: string
  kind: ClientKind
  displayName: string
  searchName: string
  people: Person[]
  defaultServiceTypeId: string | null
  defaultModality: Modality | null
  status: 'active' | 'archived'
  notes: string
  tags: string[]
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export type ServiceTypeClientKind = ClientKind | 'any'

export interface ServiceType {
  id: string
  name: string
  durationMin: number
  priceCents: number
  isBillable: boolean
  clientKind: ServiceTypeClientKind
  colorToken: string
  sortOrder: number
  isArchived: boolean
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export type Modality = 'online' | 'in_person'

export type Attendance =
  | 'scheduled'
  | 'attended'
  | 'cancelled_by_client'
  | 'cancelled_by_therapist'
  | 'no_show'

export type PaymentStatus = 'pending' | 'paid' | 'free' | 'package'

export interface Session {
  id: string
  clientId: string
  serviceTypeId: string
  startAt: number
  durationMin: number
  modality: Modality
  attendance: Attendance
  paymentStatus: PaymentStatus
  priceCents: number
  packageId: string | null
  countsAgainstPackage: boolean
  isBillableOverride: boolean | null
  seriesId: string | null
  notes: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export type PackageStatus = 'active' | 'exhausted' | 'expired' | 'refunded' | 'cancelled'

export interface Package {
  id: string
  clientId: string
  serviceTypeId: string | null
  label: string
  totalSessions: number
  pricePaidCents: number
  perSessionValueCents: number
  purchasedAt: number
  expiresAt: number | null
  status: PackageStatus
  notes: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export type PaymentMethod = 'bizum' | 'transfer' | 'cash' | 'card' | 'other'
export type PaymentKind = 'session' | 'package'

export interface Payment {
  id: string
  clientId: string
  kind: PaymentKind
  sessionId: string | null
  packageId: string | null
  amountCents: number
  method: PaymentMethod
  paidAt: number
  notes: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export type ExpenseCategory = 'publicidad' | 'alquiler' | 'otro'

export interface Expense {
  id: string
  category: ExpenseCategory
  /** Free-text label — required when category is 'otro', optional override otherwise. */
  label: string
  amountCents: number
  incurredAt: number
  notes: string
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}

export interface BusinessHours {
  startHour: number
  endHour: number
}

/** Keyed by Date#getDay(): 0=Sunday, 1=Monday, ... 6=Saturday. A `null` value means closed that day. */
export type WeeklyBusinessHours = Record<number, BusinessHours | null>

export interface AppSettings {
  id: 'app'
  theme: 'system' | 'light' | 'dark'
  locale: string
  currency: string
  weekStartsOn: 0 | 1
  defaultModality: Modality
  lowBalanceThreshold: number
  lastBackupAt: number | null
  backupReminderDays: number
  seedVersion: number
  onboardingCompletedAt: number | null
  weeklyBusinessHours: WeeklyBusinessHours
}
