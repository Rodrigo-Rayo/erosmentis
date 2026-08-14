import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import { CoupleIcon } from '@/components/icons/SessionIcons'
import { createClient, findClientByDisplayName } from '@/db/repositories/clients.repo'
import { getErrorMessage } from '@/domain/errors'
import type { Client, ClientKind } from '@/domain/types'
import styles from './NewClientSheet.module.css'

export function NewClientSheet() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [kind, setKind] = useState<ClientKind>('individual')
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [duplicate, setDuplicate] = useState<Client | null>(null)

  function handleClose() {
    const backgroundLocation = (location.state as { backgroundLocation?: unknown } | null)
      ?.backgroundLocation
    if (backgroundLocation) {
      navigate(-1)
    } else {
      navigate('/clientes', { replace: true })
    }
  }

  async function handleSave(skipDuplicateCheck = false) {
    if (nameA.trim() === '') return
    setIsSaving(true)
    try {
      const displayName =
        kind === 'individual' ? nameA.trim() : `${nameA.trim()} y ${nameB.trim()}`
      if (!skipDuplicateCheck) {
        const match = await findClientByDisplayName(displayName)
        if (match) {
          setDuplicate(match)
          setIsSaving(false)
          return
        }
      }
      const people =
        kind === 'individual'
          ? [{ name: nameA.trim(), phone: phone.trim() || undefined }]
          : [{ name: nameA.trim() }, { name: nameB.trim() }]
      const client = await createClient({ kind, people })
      navigate(`/clientes/${client.id}`, { replace: true })
    } catch (error) {
      toast.show(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = nameA.trim() !== '' && (kind === 'individual' || nameB.trim() !== '') && !isSaving

  return (
    <Sheet title="Nuevo paciente" onClose={handleClose}>
      <div className={styles.form}>
        <div className={styles.chipRow}>
          <Chip selected={kind === 'individual'} tone="accent" onClick={() => setKind('individual')}>
            Individual
          </Chip>
          <Chip selected={kind === 'couple'} tone="accent" onClick={() => setKind('couple')}>
            <CoupleIcon className={styles.chipIcon} aria-hidden="true" />
            <span>Pareja</span>
          </Chip>
        </div>

        <input
          className={styles.input}
          placeholder={kind === 'couple' ? 'Nombre de la primera persona' : 'Nombre'}
          value={nameA}
          onChange={(e) => {
            setNameA(e.target.value)
            setDuplicate(null)
          }}
          autoFocus
        />

        {kind === 'couple' && (
          <input
            className={styles.input}
            placeholder="Nombre de la segunda persona"
            value={nameB}
            onChange={(e) => {
              setNameB(e.target.value)
              setDuplicate(null)
            }}
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

        {duplicate ? (
          <div className={styles.duplicateWarning}>
            <p className={styles.duplicateWarningText}>
              Ya existe un paciente llamado "{duplicate.displayName}". ¿Querés crear otro con el
              mismo nombre?
            </p>
            <Button fullWidth onClick={() => handleSave(true)} disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Crear de todas formas'}
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setDuplicate(null)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button fullWidth onClick={() => handleSave()} disabled={!canSave}>
            {isSaving ? 'Guardando…' : 'Crear paciente'}
          </Button>
        )}
      </div>
    </Sheet>
  )
}
