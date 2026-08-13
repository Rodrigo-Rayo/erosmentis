import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import { createExpense } from '@/db/repositories/expenses.repo'
import { getErrorMessage } from '@/domain/errors'
import { eurosToCents } from '@/domain/money'
import { EXPENSE_CATEGORY_LABELS } from '@/domain/reports'
import type { ExpenseCategory } from '@/domain/types'
import styles from './ExpenseSheet.module.css'

const CATEGORIES: ExpenseCategory[] = ['publicidad', 'alquiler', 'otro']

function toDateInputValue(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

interface ExpenseSheetProps {
  onClose: () => void
  onSaved: () => void
}

export function ExpenseSheet({ onClose, onSaved }: ExpenseSheetProps) {
  const toast = useToast()
  const [category, setCategory] = useState<ExpenseCategory>('publicidad')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => toDateInputValue(Date.now()))
  const [isSaving, setIsSaving] = useState(false)

  const amountCents = eurosToCents(Number(amount.replace(',', '.')) || 0)
  const canSave =
    amountCents > 0 && date !== '' && (category !== 'otro' || label.trim() !== '') && !isSaving

  async function handleSave() {
    if (!canSave) return
    setIsSaving(true)
    try {
      const incurredAt = new Date(date)
      incurredAt.setHours(12, 0, 0, 0)
      await createExpense({
        category,
        label: label.trim(),
        amountCents,
        incurredAt: incurredAt.getTime(),
      })
      toast.show('Gasto añadido')
      onSaved()
    } catch (error) {
      toast.show(getErrorMessage(error))
      setIsSaving(false)
    }
  }

  return (
    <Sheet title="Nuevo gasto" onClose={onClose}>
      <div className={styles.form}>
        <div className={styles.chipRow}>
          {CATEGORIES.map((value) => (
            <Chip key={value} selected={category === value} tone="accent" onClick={() => setCategory(value)}>
              {EXPENSE_CATEGORY_LABELS[value]}
            </Chip>
          ))}
        </div>

        <input
          className={styles.input}
          placeholder={category === 'otro' ? 'Concepto (obligatorio)' : 'Concepto (opcional)'}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
        />

        <div className={styles.row}>
          <label className={styles.field}>
            <span>Importe</span>
            <input
              className={styles.input}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0,00 €"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Fecha</span>
            <input
              className={styles.input}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>

        <Button fullWidth onClick={handleSave} disabled={!canSave}>
          {isSaving ? 'Guardando…' : 'Añadir gasto'}
        </Button>
      </div>
    </Sheet>
  )
}
