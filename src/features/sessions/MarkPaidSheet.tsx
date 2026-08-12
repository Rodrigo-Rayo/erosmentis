import { Sheet } from '@/components/ui/Sheet'
import { Chip } from '@/components/ui/Chip'
import { formatCents } from '@/domain/money'
import type { PaymentMethod, Session } from '@/domain/types'
import styles from './MarkPaidSheet.module.css'

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bizum', label: 'Bizum' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash', label: 'Efectivo' },
]

interface MarkPaidSheetProps {
  session: Session
  onConfirm: (method: PaymentMethod) => void
  onClose: () => void
}

export function MarkPaidSheet({ session, onConfirm, onClose }: MarkPaidSheetProps) {
  return (
    <Sheet title="Marcar como cobrada" onClose={onClose}>
      <div className={styles.wrapper}>
        <p className={styles.amount}>{formatCents(session.priceCents)}</p>
        <p className={styles.hint}>¿Cómo ha pagado?</p>
        <div className={styles.methods}>
          {METHODS.map((method) => (
            <Chip key={method.value} tone="positive" onClick={() => onConfirm(method.value)}>
              {method.label}
            </Chip>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
