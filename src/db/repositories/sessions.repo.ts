import Dexie from 'dexie'
import { db } from '@/db/database'
import { resolveSessionPrice } from '@/domain/pricing'
import { generateWeeklyOccurrences } from '@/domain/dates'
import { findConsumablePackage } from '@/db/repositories/packages.repo'
import { getServiceType } from '@/db/repositories/serviceTypes.repo'
import type { Modality, PaymentMethod, PaymentStatus, Session } from '@/domain/types'

export interface CreateSessionInput {
  clientId: string
  serviceTypeId: string
  startAt: number
  durationMin?: number
  modality: Modality
  notes?: string
  usePackage?: boolean
  paymentStatusOverride?: PaymentStatus
  seriesId?: string | null
}

export async function createSession(input: CreateSessionInput): Promise<Session> {
  const serviceType = await getServiceType(input.serviceTypeId)
  if (!serviceType) {
    throw new Error(`Service type ${input.serviceTypeId} not found`)
  }

  let packageId: string | null = null
  let priceCents = resolveSessionPrice(serviceType)
  let paymentStatus: PaymentStatus =
    input.paymentStatusOverride ?? (serviceType.isBillable ? 'pending' : 'free')

  if (input.usePackage && !input.paymentStatusOverride) {
    const pkg = await findConsumablePackage(input.clientId, input.serviceTypeId)
    if (!pkg) {
      throw new Error('No hay bono con sesiones disponibles para este paciente y servicio')
    }
    packageId = pkg.id
    priceCents = resolveSessionPrice(serviceType, pkg.perSessionValueCents)
    paymentStatus = 'package'
  }

  const now = Date.now()
  const session: Session = {
    id: crypto.randomUUID(),
    clientId: input.clientId,
    serviceTypeId: input.serviceTypeId,
    startAt: input.startAt,
    durationMin: input.durationMin ?? serviceType.durationMin,
    modality: input.modality,
    attendance: 'scheduled',
    paymentStatus,
    priceCents,
    packageId,
    countsAgainstPackage: true,
    isBillableOverride: null,
    seriesId: input.seriesId ?? null,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.sessions.add(session)
  return session
}

export async function createWeeklySeries(
  input: Omit<CreateSessionInput, 'seriesId'>,
  occurrenceCount: number,
): Promise<Session[]> {
  const seriesId = crypto.randomUUID()
  const startTimes = generateWeeklyOccurrences(input.startAt, occurrenceCount)
  const sessions: Session[] = []
  for (const startAt of startTimes) {
    // Sequential on purpose: each occurrence may consume the same package slot.
    const session = await createSession({ ...input, startAt, seriesId })
    sessions.push(session)
  }
  return sessions
}

export async function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id)
}

export async function listSessionsInRange(start: number, end: number): Promise<Session[]> {
  const sessions = await db.sessions.where('startAt').between(start, end, true, true).toArray()
  return sessions.filter((s) => s.deletedAt === null).sort((a, b) => a.startAt - b.startAt)
}

export async function listSessionsForClient(clientId: string): Promise<Session[]> {
  const sessions = await db.sessions
    .where('[clientId+startAt]')
    .between([clientId, Dexie.minKey], [clientId, Dexie.maxKey])
    .toArray()
  return sessions.filter((s) => s.deletedAt === null).sort((a, b) => b.startAt - a.startAt)
}

export async function listSessionsForPackage(packageId: string): Promise<Session[]> {
  const sessions = await db.sessions.where('packageId').equals(packageId).toArray()
  return sessions.filter((s) => s.deletedAt === null)
}

export interface MarkPaidInput {
  sessionId: string
  method: PaymentMethod
  amountCents?: number
  paidAt?: number
}

export async function markSessionPaid(input: MarkPaidInput): Promise<void> {
  await db.transaction('rw', db.sessions, db.payments, async () => {
    const session = await db.sessions.get(input.sessionId)
    if (!session) {
      throw new Error(`Session ${input.sessionId} not found`)
    }
    const now = Date.now()
    await db.payments.add({
      id: crypto.randomUUID(),
      clientId: session.clientId,
      kind: 'session',
      sessionId: session.id,
      packageId: null,
      amountCents: input.amountCents ?? session.priceCents,
      method: input.method,
      paidAt: input.paidAt ?? now,
      notes: '',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    await db.sessions.update(input.sessionId, { paymentStatus: 'paid' })
  })
}

export interface UpdateAttendanceOptions {
  countsAgainstPackage?: boolean
  isBillableOverride?: boolean | null
}

export async function updateSessionAttendance(
  sessionId: string,
  attendance: Session['attendance'],
  options: UpdateAttendanceOptions = {},
): Promise<void> {
  const patch: Partial<Session> = { attendance }
  if (options.countsAgainstPackage !== undefined) {
    patch.countsAgainstPackage = options.countsAgainstPackage
  }
  if (options.isBillableOverride !== undefined) {
    patch.isBillableOverride = options.isBillableOverride
  }
  await db.sessions.update(sessionId, patch)
}

export async function updateSessionNotes(sessionId: string, notes: string): Promise<void> {
  await db.sessions.update(sessionId, { notes })
}

export async function softDeleteSession(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, { deletedAt: Date.now() })
}

export async function restoreSession(sessionId: string): Promise<void> {
  await db.sessions.update(sessionId, { deletedAt: null })
}
