import { z } from 'zod'

// Bounds a restored/merged backup file to sane sizes for a single-practitioner local app —
// without these, a corrupted or maliciously crafted .pab file could pass shape validation
// while still containing e.g. millions of records or multi-MB strings, hanging the tab or
// bloating IndexedDB on import.
const ID_MAX = 200
const SHORT_TEXT_MAX = 300
const NOTES_MAX = 20_000
const TABLE_MAX = 50_000

const personSchema = z.object({
  name: z.string().max(SHORT_TEXT_MAX),
  phone: z.string().max(SHORT_TEXT_MAX).optional(),
  email: z.string().max(SHORT_TEXT_MAX).optional(),
  birthDate: z.number().optional(),
})

export const clientSchema = z.object({
  id: z.string().max(ID_MAX),
  kind: z.enum(['individual', 'couple']),
  displayName: z.string().max(SHORT_TEXT_MAX),
  searchName: z.string().max(SHORT_TEXT_MAX),
  people: z.array(personSchema).max(10),
  defaultServiceTypeId: z.string().max(ID_MAX).nullable(),
  defaultModality: z.enum(['online', 'in_person']).nullable(),
  status: z.enum(['active', 'archived']),
  notes: z.string().max(NOTES_MAX),
  tags: z.array(z.string().max(SHORT_TEXT_MAX)).max(50),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const serviceTypeSchema = z.object({
  id: z.string().max(ID_MAX),
  name: z.string().max(SHORT_TEXT_MAX),
  durationMin: z.number(),
  priceCents: z.number(),
  isBillable: z.boolean(),
  clientKind: z.enum(['individual', 'couple', 'any']),
  colorToken: z.string().max(SHORT_TEXT_MAX),
  sortOrder: z.number(),
  isArchived: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const sessionSchema = z.object({
  id: z.string().max(ID_MAX),
  clientId: z.string().max(ID_MAX),
  serviceTypeId: z.string().max(ID_MAX),
  startAt: z.number(),
  durationMin: z.number(),
  modality: z.enum(['online', 'in_person']),
  attendance: z.enum([
    'scheduled',
    'attended',
    'cancelled_by_client',
    'cancelled_by_therapist',
    'no_show',
  ]),
  paymentStatus: z.enum(['pending', 'paid', 'free', 'package']),
  priceCents: z.number(),
  packageId: z.string().max(ID_MAX).nullable(),
  countsAgainstPackage: z.boolean(),
  isBillableOverride: z.boolean().nullable(),
  seriesId: z.string().max(ID_MAX).nullable(),
  notes: z.string().max(NOTES_MAX),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const packageSchema = z.object({
  id: z.string().max(ID_MAX),
  clientId: z.string().max(ID_MAX),
  serviceTypeId: z.string().max(ID_MAX).nullable(),
  label: z.string().max(SHORT_TEXT_MAX),
  totalSessions: z.number(),
  pricePaidCents: z.number(),
  perSessionValueCents: z.number(),
  purchasedAt: z.number(),
  expiresAt: z.number().nullable(),
  status: z.enum(['active', 'exhausted', 'expired', 'refunded', 'cancelled']),
  notes: z.string().max(NOTES_MAX),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const paymentSchema = z.object({
  id: z.string().max(ID_MAX),
  clientId: z.string().max(ID_MAX),
  kind: z.enum(['session', 'package']),
  sessionId: z.string().max(ID_MAX).nullable(),
  packageId: z.string().max(ID_MAX).nullable(),
  amountCents: z.number(),
  method: z.enum(['bizum', 'transfer', 'cash', 'card', 'other']),
  paidAt: z.number(),
  notes: z.string().max(NOTES_MAX),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const expenseSchema = z.object({
  id: z.string().max(ID_MAX),
  category: z.enum(['publicidad', 'alquiler', 'otro']),
  label: z.string().max(SHORT_TEXT_MAX),
  amountCents: z.number(),
  incurredAt: z.number(),
  notes: z.string().max(NOTES_MAX),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const backupPayloadSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number(),
  tables: z.object({
    clients: z.array(clientSchema).max(TABLE_MAX),
    serviceTypes: z.array(serviceTypeSchema).max(TABLE_MAX),
    sessions: z.array(sessionSchema).max(TABLE_MAX),
    packages: z.array(packageSchema).max(TABLE_MAX),
    payments: z.array(paymentSchema).max(TABLE_MAX),
    // Optional/defaulted: backups taken before expenses were added to the export must still
    // restore cleanly, just without any expenses to bring back.
    expenses: z.array(expenseSchema).max(TABLE_MAX).optional().default([]),
  }),
})

export type BackupPayload = z.infer<typeof backupPayloadSchema>

// 16-byte salt / 12-byte IV base64-encoded land at 24/16 chars; a generous ceiling still
// catches garbage without hand-tuning to the exact byte count. Ciphertext scales with however
// much data was backed up, so it gets a much larger but still-bounded cap (~64 MB decoded).
const BASE64_PATTERN = /^[A-Za-z0-9+/]+=*$/

export const backupEnvelopeSchema = z.object({
  version: z.literal(1),
  createdAt: z.number(),
  salt: z.string().max(64).regex(BASE64_PATTERN),
  iv: z.string().max(64).regex(BASE64_PATTERN),
  ciphertext: z.string().max(90_000_000).regex(BASE64_PATTERN),
})

export type BackupEnvelope = z.infer<typeof backupEnvelopeSchema>

/** Cross-table reference checks the shape schema above can't express on its own — every
 * clientId/serviceTypeId/sessionId/packageId a still-active record points at must exist in the
 * same backup, so a corrupted or hand-edited file can't quietly import orphaned sessions/
 * payments that would show up as confusing, unattributable data (or break assumptions
 * elsewhere, like a payment screen expecting its session to exist). Already soft-deleted
 * records are skipped: they're hidden everywhere in the app regardless of what they point at,
 * so a dangling reference on one (e.g. a deleted session whose client was later removed by some
 * other path) shouldn't block restoring an otherwise perfectly good backup. Returns a
 * human-readable list of problems; empty means the backup is internally consistent. */
export function validateBackupReferences(payload: BackupPayload): string[] {
  const issues: string[] = []
  const clientIds = new Set(payload.tables.clients.map((c) => c.id))
  const serviceTypeIds = new Set(payload.tables.serviceTypes.map((s) => s.id))
  const sessionIds = new Set(payload.tables.sessions.map((s) => s.id))
  const packageIds = new Set(payload.tables.packages.map((p) => p.id))

  for (const session of payload.tables.sessions) {
    if (session.deletedAt !== null) continue
    if (!clientIds.has(session.clientId)) {
      issues.push(`session ${session.id} references missing client ${session.clientId}`)
    }
    if (!serviceTypeIds.has(session.serviceTypeId)) {
      issues.push(`session ${session.id} references missing service type ${session.serviceTypeId}`)
    }
    if (session.packageId !== null && !packageIds.has(session.packageId)) {
      issues.push(`session ${session.id} references missing package ${session.packageId}`)
    }
  }

  for (const pkg of payload.tables.packages) {
    if (pkg.deletedAt !== null) continue
    if (!clientIds.has(pkg.clientId)) {
      issues.push(`package ${pkg.id} references missing client ${pkg.clientId}`)
    }
    if (pkg.serviceTypeId !== null && !serviceTypeIds.has(pkg.serviceTypeId)) {
      issues.push(`package ${pkg.id} references missing service type ${pkg.serviceTypeId}`)
    }
  }

  for (const payment of payload.tables.payments) {
    if (payment.deletedAt !== null) continue
    if (!clientIds.has(payment.clientId)) {
      issues.push(`payment ${payment.id} references missing client ${payment.clientId}`)
    }
    if (payment.sessionId !== null && !sessionIds.has(payment.sessionId)) {
      issues.push(`payment ${payment.id} references missing session ${payment.sessionId}`)
    }
    if (payment.packageId !== null && !packageIds.has(payment.packageId)) {
      issues.push(`payment ${payment.id} references missing package ${payment.packageId}`)
    }
  }

  return issues
}
