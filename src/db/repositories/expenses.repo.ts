import { db } from '@/db/database'
import type { Expense, ExpenseCategory } from '@/domain/types'

export interface CreateExpenseInput {
  category: ExpenseCategory
  label?: string
  amountCents: number
  incurredAt: number
  notes?: string
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const now = Date.now()
  const expense: Expense = {
    id: crypto.randomUUID(),
    category: input.category,
    label: input.label?.trim() ?? '',
    amountCents: input.amountCents,
    incurredAt: input.incurredAt,
    notes: input.notes ?? '',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
  await db.expenses.add(expense)
  return expense
}

/** All active expenses across all time, oldest first — backs the "histórico" report period. */
export async function listAllExpenses(): Promise<Expense[]> {
  const expenses = await db.expenses.toArray()
  return expenses.filter((e) => e.deletedAt === null).sort((a, b) => a.incurredAt - b.incurredAt)
}

export async function softDeleteExpense(id: string): Promise<void> {
  await db.expenses.update(id, { deletedAt: Date.now() })
}
