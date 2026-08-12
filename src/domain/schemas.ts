import { z } from 'zod'

const personSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  birthDate: z.number().optional(),
})

export const clientSchema = z.object({
  id: z.string(),
  kind: z.enum(['individual', 'couple']),
  displayName: z.string(),
  searchName: z.string(),
  people: z.array(personSchema),
  defaultServiceTypeId: z.string().nullable(),
  defaultModality: z.enum(['online', 'in_person']).nullable(),
  status: z.enum(['active', 'archived']),
  notes: z.string(),
  tags: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const serviceTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMin: z.number(),
  priceCents: z.number(),
  isBillable: z.boolean(),
  clientKind: z.enum(['individual', 'couple', 'any']),
  colorToken: z.string(),
  sortOrder: z.number(),
  isArchived: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const sessionSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  serviceTypeId: z.string(),
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
  packageId: z.string().nullable(),
  countsAgainstPackage: z.boolean(),
  isBillableOverride: z.boolean().nullable(),
  seriesId: z.string().nullable(),
  notes: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const packageSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  serviceTypeId: z.string().nullable(),
  label: z.string(),
  totalSessions: z.number(),
  pricePaidCents: z.number(),
  perSessionValueCents: z.number(),
  purchasedAt: z.number(),
  expiresAt: z.number().nullable(),
  status: z.enum(['active', 'exhausted', 'expired', 'refunded', 'cancelled']),
  notes: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const paymentSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  kind: z.enum(['session', 'package']),
  sessionId: z.string().nullable(),
  packageId: z.string().nullable(),
  amountCents: z.number(),
  method: z.enum(['bizum', 'transfer', 'cash', 'card', 'other']),
  paidAt: z.number(),
  notes: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const backupPayloadSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number(),
  tables: z.object({
    clients: z.array(clientSchema),
    serviceTypes: z.array(serviceTypeSchema),
    sessions: z.array(sessionSchema),
    packages: z.array(packageSchema),
    payments: z.array(paymentSchema),
  }),
})

export type BackupPayload = z.infer<typeof backupPayloadSchema>

export const backupEnvelopeSchema = z.object({
  version: z.literal(1),
  createdAt: z.number(),
  salt: z.string(),
  iv: z.string(),
  ciphertext: z.string(),
})

export type BackupEnvelope = z.infer<typeof backupEnvelopeSchema>
