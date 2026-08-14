import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useToast } from '@/components/ui/Toast'
import { CoupleIcon } from '@/components/icons/SessionIcons'
import {
  getClient,
  updateClient,
  archiveClient,
  unarchiveClient,
} from '@/db/repositories/clients.repo'
import { getErrorMessage } from '@/domain/errors'
import type { ClientKind } from '@/domain/types'
import styles from './NewClientSheet.module.css'

export function EditClientSheet() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const client = useLiveQuery(() => (id ? getClient(id) : undefined), [id])

  const [kind, setKind] = useState<ClientKind>('individual')
  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (client && !isInitialized) {
      setKind(client.kind)
      setNameA(client.people[0]?.name ?? '')
      setNameB(client.people[1]?.name ?? '')
      setPhone(client.people[0]?.phone ?? '')
      setIsInitialized(true)
    }
  }, [client, isInitialized])

  function handleClose() {
    const backgroundLocation = (location.state as { backgroundLocation?: unknown } | null)
      ?.backgroundLocation
    if (backgroundLocation) {
      navigate(-1)
    } else if (id) {
      navigate(`/clientes/${id}`, { replace: true })
    } else {
      navigate('/clientes', { replace: true })
    }
  }

  async function handleSave() {
    if (!id || nameA.trim() === '') return
    setIsSaving(true)
    try {
      const people =
        kind === 'individual'
          ? [{ name: nameA.trim(), phone: phone.trim() || undefined }]
          : [{ name: nameA.trim() }, { name: nameB.trim() }]
      await updateClient(id, { kind, people })
      toast.show('Paciente actualizado')
      handleClose()
    } catch (error) {
      toast.show(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleArchive() {
    if (!id) return
    try {
      await archiveClient(id)
      // Longer than the default toast, for a quick undo right after the tap — the patient can
      // still be found and restored any time afterward from Pacientes > Archivados.
      toast.show(
        'Paciente archivado',
        {
          label: 'Deshacer',
          onClick: () =>
            unarchiveClient(id).catch((error: unknown) => toast.show(getErrorMessage(error))),
        },
        { durationMs: 8000 },
      )
      navigate('/clientes', { replace: true })
    } catch (error) {
      toast.show(getErrorMessage(error))
    }
  }

  const canSave = nameA.trim() !== '' && (kind === 'individual' || nameB.trim() !== '') && !isSaving

  if (!client) {
    return (
      <Sheet title="Editar paciente" onClose={handleClose}>
        <p>Cargando…</p>
      </Sheet>
    )
  }

  return (
    <Sheet title="Editar paciente" onClose={handleClose}>
      <div className={styles.form}>
        <div className={styles.chipRow}>
          <Chip
            selected={kind === 'individual'}
            tone="accent"
            onClick={() => setKind('individual')}
          >
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
          onChange={(e) => setNameA(e.target.value)}
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
          {isSaving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button variant="danger" fullWidth onClick={handleArchive}>
          Archivar paciente
        </Button>
      </div>
    </Sheet>
  )
}
