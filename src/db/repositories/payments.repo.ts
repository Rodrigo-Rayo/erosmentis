import { db } from '@/db/database'
import type { Payment, PaymentMethod } from '@/domain/types'

export interface RecordSessionPaymentInput {
  clientId: string
  sessionId: string
  amountCents: number
  method: PaymentMethod
  paidAt?: number
  notes?: string
}

export async function recordSessionPayment(input: RecordSessionPaymentInput): Promise<Payment> {
  const now = Date.now()
  const payment: Payment = {
    id: crypto.randomUUID(),
    clientId: input.clientId,
    kind: 'session',
    sessionId: input.sessionId,
    packageId: null,
    amountCents: input.amountCents,
    method: input.method,
    paidAt: input.paidAt ?? now,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.payments.add(payment)
  return payment
}

export async function listPaymentsForClient(clientId: string): Promise<Payment[]> {
  const payments = await db.payments.where('clientId').equals(clientId).toArray()
  return payments.filter((p) => p.deletedAt === null).sort((a, b) => b.paidAt - a.paidAt)
}

export async function listPaymentsInRange(start: number, end: number): Promise<Payment[]> {
  const payments = await db.payments.where('paidAt').between(start, end, true, true).toArray()
  return payments.filter((p) => p.deletedAt === null)
}

export async function softDeletePayment(id: string): Promise<void> {
  await db.payments.update(id, { deletedAt: Date.now() })
}
