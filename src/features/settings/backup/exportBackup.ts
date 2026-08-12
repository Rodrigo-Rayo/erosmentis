import { db } from '@/db/database'
import { updateSettings } from '@/db/repositories/settings.repo'
import type { BackupEnvelope, BackupPayload } from '@/domain/schemas'
import { encryptText } from './crypto'

const BACKUP_FORMAT_VERSION = 1

async function collectPayload(): Promise<BackupPayload> {
  const [clients, serviceTypes, sessions, packages, payments] = await Promise.all([
    db.clients.toArray(),
    db.serviceTypes.toArray(),
    db.sessions.toArray(),
    db.packages.toArray(),
    db.payments.toArray(),
  ])
  return {
    version: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    tables: { clients, serviceTypes, sessions, packages, payments },
  }
}

export async function exportBackup(password: string): Promise<void> {
  const payload = await collectPayload()
  const encrypted = await encryptText(JSON.stringify(payload), password)
  const envelope: BackupEnvelope = {
    version: BACKUP_FORMAT_VERSION,
    createdAt: Date.now(),
    ...encrypted,
  }

  const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStamp = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `erosmentis-${dateStamp}.pab`
  link.click()
  URL.revokeObjectURL(url)

  await updateSettings({ lastBackupAt: Date.now() })
}
