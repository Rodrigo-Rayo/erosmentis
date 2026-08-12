import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import { getClient } from '@/db/repositories/clients.repo'
import { listServiceTypes } from '@/db/repositories/serviceTypes.repo'
import { createPackage } from '@/db/repositories/packages.repo'
import { formatCents } from '@/domain/money'
import type { PaymentMethod } from '@/domain/types'
import styles from './NewPackageSheet.module.css'

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bizum', label: 'Bizum' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'cash', label: 'Efectivo' },
]

export function NewPackageSheet() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const client = useLiveQuery(() => (clientId ? getClient(clientId) : undefined), [clientId])
  const serviceTypes = useLiveQuery(() => listServiceTypes(), [], [])

  const [serviceTypeId, setServiceTypeId] = useState<string | null>(null)
  const [totalSessions, setTotalSessions] = useState(4)
  const [priceEuros, setPriceEuros] = useState<number | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [isSaving, setIsSaving] = useState(false)

  const selectedServiceType = useMemo(
    () => serviceTypes.find((s) => s.id === serviceTypeId) ?? null,
    [serviceTypes, serviceTypeId],
  )

  useEffect(() => {
    if (!serviceTypeId && serviceTypes.length > 0) {
      const billable = serviceTypes.find((s) => s.isBillable)
      if (billable) setServiceTypeId(billable.id)
    }
  }, [serviceTypes, serviceTypeId])

  const listPriceCents = selectedServiceType ? selectedServiceType.priceCents * totalSessions : 0
  const effectivePriceEuros = priceEuros ?? listPriceCents / 100

  function handleClose() {
    navigate(-1)
  }

  async function handleSave() {
    if (!client || totalSessions < 1) return
    setIsSaving(true)
    try {
      await createPackage({
        clientId: client.id,
        serviceTypeId: selectedServiceType?.id ?? null,
        label: `Bono ${totalSessions} sesiones`,
        totalSessions,
        pricePaidCents: Math.round(effectivePriceEuros * 100),
        paymentMethod: method,
      })
      toast.show('Bono creado')
      handleClose()
    } finally {
      setIsSaving(false)
    }
  }

  const savings = listPriceCents - Math.round(effectivePriceEuros * 100)

  return (
    <Sheet title="Nuevo bono" onClose={handleClose}>
      <div className={styles.form}>
        {client && <p className={styles.clientName}>{client.displayName}</p>}

        <section className={styles.field}>
          <label className={styles.label}>Tipo de sesión</label>
          <div className={styles.chipRow}>
            {serviceTypes
              .filter((s) => s.isBillable)
              .map((type) => (
                <Chip
                  key={type.id}
                  selected={type.id === serviceTypeId}
                  tone="accent"
                  onClick={() => {
                    setServiceTypeId(type.id)
                    setPriceEuros(null)
                  }}
                >
                  {type.name}
                </Chip>
              ))}
          </div>
        </section>

        <section className={styles.field}>
          <label className={styles.label}>Número de sesiones</label>
          <input
            type="number"
            min={2}
            max={20}
            className={styles.numberInput}
            value={totalSessions}
            onChange={(e) => {
              setTotalSessions(Number(e.target.value) || 1)
              setPriceEuros(null)
            }}
          />
        </section>

        <section className={styles.field}>
          <label className={styles.label}>Precio total del bono</label>
          <input
            type="number"
            inputMode="decimal"
            className={styles.numberInput}
            value={effectivePriceEuros}
            onChange={(e) => setPriceEuros(Number.parseFloat(e.target.value) || 0)}
          />
          <span className={styles.hint}>
            Precio de lista: {formatCents(listPriceCents)}
            {savings > 0 && ` · Ahorro: ${formatCents(savings)}`}
          </span>
        </section>

        <section className={styles.field}>
          <label className={styles.label}>Cómo ha pagado</label>
          <div className={styles.chipRow}>
            {METHODS.map((m) => (
              <Chip key={m.value} selected={method === m.value} tone="positive" onClick={() => setMethod(m.value)}>
                {m.label}
              </Chip>
            ))}
          </div>
        </section>

        <Button fullWidth onClick={handleSave} disabled={isSaving || !selectedServiceType}>
          {isSaving ? 'Guardando…' : `Crear bono de ${formatCents(Math.round(effectivePriceEuros * 100))}`}
        </Button>
      </div>
    </Sheet>
  )
}
