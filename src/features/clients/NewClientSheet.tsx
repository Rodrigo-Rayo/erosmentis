import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { createClient } from '@/db/repositories/clients.repo'
import type { ClientKind } from '@/domain/types'
import styles from './NewClientSheet.module.css'

export function NewClientSheet() {
  const navigate = useNavigate()
  const location = useLocation()
  const [kind, setKind] = useState<ClientKind>('individual')
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function handleClose() {
    const backgroundLocation = (location.state as { backgroundLocation?: unknown } | null)
      ?.backgroundLocation
    if (backgroundLocation) {
      navigate(-1)
    } else {
      navigate('/clientes', { replace: true })
    }
  }

  async function handleSave() {
    if (nameA.trim() === '') return
    setIsSaving(true)
    const people =
      kind === 'individual'
        ? [{ name: nameA.trim(), phone: phone.trim() || undefined }]
        : [{ name: nameA.trim() }, { name: nameB.trim() }]
    const client = await createClient({ kind, people })
    setIsSaving(false)
    navigate(`/clientes/${client.id}`, { replace: true })
  }

  const canSave = nameA.trim() !== '' && (kind === 'individual' || nameB.trim() !== '') && !isSaving

  return (
    <Sheet title="Nuevo cliente" onClose={handleClose}>
      <div className={styles.form}>
        <div className={styles.chipRow}>
          <Chip selected={kind === 'individual'} tone="accent" onClick={() => setKind('individual')}>
            Individual
          </Chip>
          <Chip selected={kind === 'couple'} tone="accent" onClick={() => setKind('couple')}>
            💑 Pareja
          </Chip>
        </div>

        <input
          className={styles.input}
          placeholder={kind === 'couple' ? 'Nombre de la primera persona' : 'Nombre'}
          value={nameA}
          onChange={(e) => setNameA(e.target.value)}
          autoFocus
        />

        {kind === 'couple' && (
          <input
            className={styles.input}
            placeholder="Nombre de la segunda persona"
            value={nameB}
            onChange={(e) => setNameB(e.target.value)}
          />
        )}

        {kind === 'individual' && (
          <input
            className={styles.input}
            placeholder="Teléfono (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
          />
        )}

        <Button fullWidth onClick={handleSave} disabled={!canSave}>
          {isSaving ? 'Guardando…' : 'Crear cliente'}
        </Button>
      </div>
    </Sheet>
  )
}
