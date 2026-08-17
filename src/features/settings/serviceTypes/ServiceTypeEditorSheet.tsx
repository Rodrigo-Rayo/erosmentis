import { useEffect, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import {
  createServiceType,
  deleteServiceType,
  restoreServiceType,
  updateServiceType,
} from '@/db/repositories/serviceTypes.repo'
import { getErrorMessage } from '@/domain/errors'
import { centsToEuros, eurosToCents } from '@/domain/money'
import type { ServiceType, ServiceTypeClientKind } from '@/domain/types'
import styles from './ServiceTypeEditorSheet.module.css'

const COLOR_TOKENS = ['accent', 'positive', 'pending', 'negative', 'couple-a', 'couple-b']

interface ServiceTypeEditorSheetProps {
  /** null creates a new service type; otherwise edits this one. */
  serviceType: ServiceType | null
  nextSortOrder: number
  onClose: () => void
}

export function ServiceTypeEditorSheet({
  serviceType,
  nextSortOrder,
  onClose,
}: ServiceTypeEditorSheetProps) {
  const toast = useToast()
  const isEditing = serviceType !== null

  const [name, setName] = useState(serviceType?.name ?? '')
  const [durationMin, setDurationMin] = useState(String(serviceType?.durationMin ?? 50))
  const [priceEuros, setPriceEuros] = useState(
    serviceType ? String(centsToEuros(serviceType.priceCents)) : '',
  )
  const [isBillable, setIsBillable] = useState(serviceType?.isBillable ?? true)
  const [clientKind, setClientKind] = useState<ServiceTypeClientKind>(
    serviceType?.clientKind ?? 'any',
  )
  const [colorToken, setColorToken] = useState(serviceType?.colorToken ?? COLOR_TOKENS[0])
  const [isSaving, setIsSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  // Re-sync local form state if the caller swaps which service type is being edited without
  // unmounting this sheet (e.g. tapping a different row while it's still open).
  useEffect(() => {
    setName(serviceType?.name ?? '')
    setDurationMin(String(serviceType?.durationMin ?? 50))
    setPriceEuros(serviceType ? String(centsToEuros(serviceType.priceCents)) : '')
    setIsBillable(serviceType?.isBillable ?? true)
    setClientKind(serviceType?.clientKind ?? 'any')
    setColorToken(serviceType?.colorToken ?? COLOR_TOKENS[0])
    setConfirmingDelete(false)
  }, [serviceType])

  const parsedDuration = Math.max(5, Number.parseInt(durationMin, 10) || 0)
  const parsedPriceCents = Math.max(0, eurosToCents(Number.parseFloat(priceEuros) || 0))

  async function handleSave() {
    if (name.trim() === '') return
    setIsSaving(true)
    try {
      if (isEditing) {
        await updateServiceType(serviceType.id, {
          name: name.trim(),
          durationMin: parsedDuration,
          priceCents: parsedPriceCents,
          isBillable,
          colorToken,
        })
        toast.show('Tipo de sesión actualizado')
      } else {
        await createServiceType({
          name: name.trim(),
          durationMin: parsedDuration,
          priceCents: parsedPriceCents,
          isBillable,
          clientKind,
          colorToken,
          sortOrder: nextSortOrder,
          isArchived: false,
        })
        toast.show('Tipo de sesión creado')
      }
      onClose()
    } catch (error) {
      toast.show(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleArchive() {
    if (!isEditing) return
    try {
      await updateServiceType(serviceType.id, { isArchived: !serviceType.isArchived })
      toast.show(serviceType.isArchived ? 'Tipo de sesión reactivado' : 'Tipo de sesión archivado')
      onClose()
    } catch (error) {
      toast.show(getErrorMessage(error))
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    try {
      await deleteServiceType(serviceType.id)
      toast.show(
        'Tipo de sesión eliminado',
        {
          label: 'Deshacer',
          onClick: () =>
            restoreServiceType(serviceType.id).catch((error: unknown) =>
              toast.show(getErrorMessage(error)),
            ),
        },
        { durationMs: 8000 },
      )
      onClose()
    } catch (error) {
      toast.show(getErrorMessage(error))
    }
  }

  const canSave = name.trim() !== '' && parsedDuration > 0 && !isSaving

  return (
    <Sheet title={isEditing ? 'Editar tipo de sesión' : 'Nuevo tipo de sesión'} onClose={onClose}>
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="service-type-name">
            Nombre
          </label>
          <input
            id="service-type-name"
            className={styles.input}
            placeholder="Ej. Terapia individual"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="service-type-duration">
              Duración (min)
            </label>
            <input
              id="service-type-duration"
              className={styles.input}
              type="number"
              min={5}
              step={5}
              inputMode="numeric"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="service-type-price">
              Precio (€)
            </label>
            <input
              id="service-type-price"
              className={styles.input}
              type="number"
              min={0}
              step={1}
              inputMode="decimal"
              value={priceEuros}
              onChange={(e) => setPriceEuros(e.target.value)}
            />
          </div>
        </div>

        {!isEditing && (
          <div className={styles.field}>
            <span className={styles.label}>Para</span>
            <div className={styles.row}>
              <Chip
                selected={clientKind === 'individual'}
                tone="accent"
                onClick={() => setClientKind('individual')}
              >
                Individual
              </Chip>
              <Chip
                selected={clientKind === 'couple'}
                tone="accent"
                onClick={() => setClientKind('couple')}
              >
                Pareja
              </Chip>
              <Chip selected={clientKind === 'any'} tone="accent" onClick={() => setClientKind('any')}>
                Cualquiera
              </Chip>
            </div>
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.label}>Color</span>
          <div className={styles.colorRow}>
            {COLOR_TOKENS.map((token) => (
              <button
                key={token}
                type="button"
                aria-label={token}
                className={`${styles.colorSwatch} ${colorToken === token ? styles.colorSwatchSelected : ''}`}
                style={{ background: `var(--color-${token})` }}
                onClick={() => setColorToken(token)}
              />
            ))}
          </div>
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={isBillable}
            onChange={(e) => setIsBillable(e.target.checked)}
          />
          Cuenta como facturable
        </label>

        <Button fullWidth onClick={handleSave} disabled={!canSave}>
          {isSaving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear tipo de sesión'}
        </Button>

        {isEditing && !confirmingDelete && (
          <Button variant="secondary" fullWidth onClick={handleToggleArchive}>
            {serviceType.isArchived ? 'Reactivar' : 'Archivar'}
          </Button>
        )}

        {isEditing && !confirmingDelete && (
          <Button variant="danger" fullWidth onClick={() => setConfirmingDelete(true)}>
            Eliminar
          </Button>
        )}

        {isEditing && confirmingDelete && (
          <div className={styles.deleteWarning}>
            <p className={styles.deleteWarningText}>
              Se eliminará "{serviceType.name}". Las sesiones ya guardadas con este tipo
              mantienen su nombre, precio y duración — esto no las afecta. Tendrás unos segundos
              para deshacerlo después.
            </p>
            <Button variant="danger" fullWidth onClick={handleDelete}>
              Eliminar para siempre
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setConfirmingDelete(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
