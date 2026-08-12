import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { getSettings } from '@/db/repositories/settings.repo'
import { exportBackup } from './exportBackup'
import {
  decryptBackupFile,
  previewBackup,
  restoreMerge,
  restoreReplace,
  type RestorePreview,
} from './importBackup'
import type { BackupPayload } from '@/domain/schemas'
import styles from './BackupScreen.module.css'

type ExportStep = 'idle' | 'password' | 'confirm'

export function BackupScreen() {
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const settings = useLiveQuery(() => getSettings(), [], null)

  const [exportStep, setExportStep] = useState<ExportStep>('idle')
  const [exportPassword, setExportPassword] = useState('')
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPassword, setImportPassword] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [pendingPayload, setPendingPayload] = useState<BackupPayload | null>(null)
  const [preview, setPreview] = useState<RestorePreview | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const passwordsMatch = exportPassword.length >= 4 && exportPassword === exportPasswordConfirm

  async function handleExport() {
    setIsExporting(true)
    try {
      await exportBackup(exportPassword)
      toast.show('Copia de seguridad descargada')
      setExportStep('idle')
      setExportPassword('')
      setExportPasswordConfirm('')
    } finally {
      setIsExporting(false)
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImportFile(file)
    setPendingPayload(null)
    setPreview(null)
    setImportError(null)
  }

  async function handleDecrypt() {
    if (!importFile) return
    setIsImporting(true)
    setImportError(null)
    try {
      const payload = await decryptBackupFile(importFile, importPassword)
      setPendingPayload(payload)
      setPreview(previewBackup(payload))
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No se pudo leer el archivo')
    } finally {
      setIsImporting(false)
    }
  }

  async function handleRestore(mode: 'replace' | 'merge') {
    if (!pendingPayload) return
    setIsImporting(true)
    try {
      if (mode === 'replace') {
        const undo = await restoreReplace(pendingPayload)
        toast.show('Datos restaurados', { label: 'Deshacer', onClick: undo })
      } else {
        await restoreMerge(pendingPayload)
        toast.show('Datos combinados con los existentes')
      }
      setPendingPayload(null)
      setPreview(null)
      setImportFile(null)
      setImportPassword('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setIsImporting(false)
    }
  }

  const lastBackupLabel = settings?.lastBackupAt
    ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(
        settings.lastBackupAt,
      )
    : 'Nunca'

  return (
    <div className={styles.wrapper}>
      <Link to="/ajustes" className={styles.back}>
        ‹ Ajustes
      </Link>
      <h1 className={styles.title}>Copia de seguridad</h1>
      <p className={styles.intro}>
        Todos tus datos viven solo en este móvil. Si lo pierdes o lo cambias sin haber hecho una
        copia, los datos desaparecen con él.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Exportar</h2>
        <p className={styles.note}>Última copia: {lastBackupLabel}</p>

        {exportStep === 'idle' && (
          <Button fullWidth onClick={() => setExportStep('password')}>
            Crear copia de seguridad
          </Button>
        )}

        {exportStep === 'password' && (
          <div className={styles.form}>
            <input
              type="password"
              className={styles.input}
              placeholder="Contraseña (mínimo 4 caracteres)"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
            />
            <input
              type="password"
              className={styles.input}
              placeholder="Repite la contraseña"
              value={exportPasswordConfirm}
              onChange={(e) => setExportPasswordConfirm(e.target.value)}
            />
            <p className={styles.warning}>
              ⚠️ Si olvidas esta contraseña, nadie podrá recuperar el archivo. Guárdala en un
              lugar seguro.
            </p>
            <Button fullWidth onClick={handleExport} disabled={!passwordsMatch || isExporting}>
              {isExporting ? 'Cifrando…' : 'Descargar copia cifrada'}
            </Button>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Restaurar</h2>
        <p className={styles.note}>Sube un archivo .pab exportado antes desde esta app.</p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pab,application/json"
          onChange={handleFileSelected}
          className={styles.fileInput}
        />

        {importFile && !preview && (
          <div className={styles.form}>
            <input
              type="password"
              className={styles.input}
              placeholder="Contraseña de la copia"
              value={importPassword}
              onChange={(e) => setImportPassword(e.target.value)}
            />
            {importError && <p className={styles.error}>{importError}</p>}
            <Button fullWidth onClick={handleDecrypt} disabled={isImporting || importPassword === ''}>
              {isImporting ? 'Comprobando…' : 'Leer copia'}
            </Button>
          </div>
        )}

        {preview && (
          <div className={styles.previewCard}>
            <p className={styles.previewDate}>
              Copia del{' '}
              {new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(
                preview.exportedAt,
              )}
            </p>
            <ul className={styles.previewList}>
              <li>{preview.counts.clients} clientes</li>
              <li>{preview.counts.sessions} sesiones</li>
              <li>{preview.counts.packages} bonos</li>
              <li>{preview.counts.payments} pagos</li>
            </ul>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => handleRestore('merge')}
              disabled={isImporting}
            >
              Combinar con mis datos actuales
            </Button>
            <Button
              fullWidth
              variant="danger"
              onClick={() => handleRestore('replace')}
              disabled={isImporting}
            >
              Reemplazar todos mis datos
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
