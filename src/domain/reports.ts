import { calculateMonthTotals } from './totals'
import { isSessionBillable } from './pricing'
import { sumCents } from './money'
import type { Session, ServiceType, Expense, ExpenseCategory } from './types'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  publicidad: 'Publicidad',
  alquiler: 'Alquiler despacho',
  otro: 'Otro',
}

function activeExpenses(expenses: readonly Expense[]): Expense[] {
  return expenses.filter((e) => e.deletedAt === null)
}

export function calculateExpensesCents(expenses: readonly Expense[]): number {
  return sumCents(activeExpenses(expenses).map((e) => e.amountCents))
}

export interface ExpenseCategoryBreakdownItem {
  category: ExpenseCategory
  label: string
  amountCents: number
  expenseCount: number
}

/** Total spent and expense count per category, sorted by amount descending. */
export function calculateExpenseCategoryBreakdown(
  expenses: readonly Expense[],
): ExpenseCategoryBreakdownItem[] {
  const active = activeExpenses(expenses)
  const totals = new Map<ExpenseCategory, { amountCents: number; expenseCount: number }>()

  for (const expense of active) {
    const entry = totals.get(expense.category) ?? { amountCents: 0, expenseCount: 0 }
    entry.amountCents += expense.amountCents
    entry.expenseCount += 1
    totals.set(expense.category, entry)
  }

  return [...totals.entries()]
    .map(([category, entry]) => ({ category, label: EXPENSE_CATEGORY_LABELS[category], ...entry }))
    .sort((a, b) => b.amountCents - a.amountCents)
}

export interface ServiceTypeBreakdownItem {
  serviceTypeId: string
  name: string
  colorToken: string
  billedCents: number
  sessionCount: number
}

/** Billed total and session count per service type, sorted by billed amount descending —
 * reuses the same billable/deleted rules as calculateMonthTotals so the sum of these rows
 * always matches the overall "Facturado" figure for the same session set. */
export function calculateServiceTypeBreakdown(
  sessions: readonly Session[],
  serviceTypesById: ReadonlyMap<string, ServiceType>,
): ServiceTypeBreakdownItem[] {
  const billable = sessions.filter((s) => s.deletedAt === null && isSessionBillable(s))
  const totals = new Map<string, { billedCents: number; sessionCount: number }>()

  for (const session of billable) {
    const entry = totals.get(session.serviceTypeId) ?? { billedCents: 0, sessionCount: 0 }
    entry.billedCents += session.priceCents
    entry.sessionCount += 1
    totals.set(session.serviceTypeId, entry)
  }

  return [...totals.entries()]
    .map(([serviceTypeId, entry]) => ({
      serviceTypeId,
      name: serviceTypesById.get(serviceTypeId)?.name ?? 'Otro',
      colorToken: serviceTypesById.get(serviceTypeId)?.colorToken ?? 'accent',
      ...entry,
    }))
    .sort((a, b) => b.billedCents - a.billedCents)
}

export interface YearBreakdownItem {
  year: number
  billedCents: number
  collectedCents: number
}

/** One row per calendar year present in `sessions`, most recent first. */
export function calculateYearBreakdown(sessions: readonly Session[]): YearBreakdownItem[] {
  const byYear = new Map<number, Session[]>()
  for (const session of sessions) {
    const year = new Date(session.startAt).getFullYear()
    const bucket = byYear.get(year)
    if (bucket) {
      bucket.push(session)
    } else {
      byYear.set(year, [session])
    }
  }

  return [...byYear.entries()]
    .map(([year, yearSessions]) => {
      const totals = calculateMonthTotals(yearSessions)
      return { year, billedCents: totals.billedCents, collectedCents: totals.collectedCents }
    })
    .sort((a, b) => b.year - a.year)
}

/** Average billed price per billable session, in cents — 0 when there are none. */
export function calculateAverageSessionCents(billedCents: number, billableSessionCount: number): number {
  if (billableSessionCount === 0) return 0
  return Math.round(billedCents / billableSessionCount)
}
