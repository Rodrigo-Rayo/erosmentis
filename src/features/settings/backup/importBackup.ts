import { db } from '@/db/database'
import { backupEnvelopeSchema, backupPayloadSchema, type BackupPayload } from '@/domain/schemas'
import { decryptText } from './crypto'

export class InvalidBackupFileError extends Error {
  constructor() {
    super('El archivo no es un backup válido de Erosmentis')
    this.name = 'InvalidBackupFileError'
  }
}

export interface RestorePreview {
  exportedAt: number
  counts: {
    clients: number
    sessions: number
    packages: number
    payments: number
  }
}

export async function decryptBackupFile(file: File, password: string): Promise<BackupPayload> {
  const text = await file.text()
  let rawEnvelope: unknown
  try {
    rawEnvelope = JSON.parse(text)
  } catch {
    throw new InvalidBackupFileError()
  }

  const envelope = backupEnvelopeSchema.safeParse(rawEnvelope)
  if (!envelope.success) {
    throw new InvalidBackupFileError()
  }

  const plaintext = await decryptText(envelope.data, password)

  let rawPayload: unknown
  try {
    rawPayload = JSON.parse(plaintext)
  } catch {
    throw new InvalidBackupFileError()
  }

  const payload = backupPayloadSchema.safeParse(rawPayload)
  if (!payload.success) {
    throw new InvalidBackupFileError()
  }
  return payload.data
}

export function previewBackup(payload: BackupPayload): RestorePreview {
  return {
    exportedAt: payload.exportedAt,
    counts: {
      clients: payload.tables.clients.length,
      sessions: payload.tables.sessions.length,
      packages: payload.tables.packages.length,
      payments: payload.tables.payments.length,
    },
  }
}

async function snapshotCurrentData(): Promise<BackupPayload['tables']> {
  const [clients, serviceTypes, sessions, packages, payments] = await Promise.all([
    db.clients.toArray(),
    db.serviceTypes.toArray(),
    db.sessions.toArray(),
    db.packages.toArray(),
    db.payments.toArray(),
  ])
  return { clients, serviceTypes, sessions, packages, payments }
}

async function replaceAllTables(tables: BackupPayload['tables']): Promise<void> {
  await db.transaction(
    'rw',
    db.clients,
    db.serviceTypes,
    db.sessions,
    db.packages,
    db.payments,
    async () => {
      await Promise.all([
        db.clients.clear(),
        db.serviceTypes.clear(),
        db.sessions.clear(),
        db.packages.clear(),
        db.payments.clear(),
      ])
      await Promise.all([
        db.clients.bulkAdd(tables.clients),
        db.serviceTypes.bulkAdd(tables.serviceTypes),
        db.sessions.bulkAdd(tables.sessions),
        db.packages.bulkAdd(tables.packages),
        db.payments.bulkAdd(tables.payments),
      ])
    },
  )
}

/** Replaces all local data with the backup's data. Returns an undo function that restores the pre-import snapshot. */
export async function restoreReplace(payload: BackupPayload): Promise<() => Promise<void>> {
  const snapshot = await snapshotCurrentData()
  await replaceAllTables(payload.tables)
  return () => replaceAllTables(snapshot)
}

interface Identified {
  id: string
  updatedAt: number
}

// Dexie's EntityTable generics don't resolve cleanly when passed around as a parameter across
// five differently-shaped tables, so this merges via plain get/put callbacks instead.
async function mergeRecords<T extends Identified>(
  getExisting: (id: string) => Promise<T | undefined>,
  put: (record: T) => Promise<unknown>,
  incoming: readonly T[],
): Promise<void> {
  for (const record of incoming) {
    // Sequential on purpose: keeps this a plain last-write-wins merge without racing the same id.
    const existing = await getExisting(record.id)
    if (!existing || existing.updatedAt < record.updatedAt) {
      await put(record)
    }
  }
}

/**
 * Merges a backup into the local database (last-write-wins per record by `updatedAt`).
 * Snapshots the pre-merge state first and returns an undo function, the same safety net
 * `restoreReplace` already has — merge can still overwrite newer local records with older
 * ones from the file (e.g. clock skew between devices), so it needs the same way back.
 */
export async function restoreMerge(payload: BackupPayload): Promise<() => Promise<void>> {
  const snapshot = await snapshotCurrentData()
  await db.transaction(
    'rw',
    db.clients,
    db.serviceTypes,
    db.sessions,
    db.packages,
    db.payments,
    async () => {
      await mergeRecords(
        (id) => db.clients.get(id),
        (r) => db.clients.put(r),
        payload.tables.clients,
      )
      await mergeRecords(
        (id) => db.serviceTypes.get(id),
        (r) => db.serviceTypes.put(r),
        payload.tables.serviceTypes,
      )
      await mergeRecords(
        (id) => db.sessions.get(id),
        (r) => db.sessions.put(r),
        payload.tables.sessions,
      )
      await mergeRecords(
        (id) => db.packages.get(id),
        (r) => db.packages.put(r),
        payload.tables.packages,
      )
      await mergeRecords(
        (id) => db.payments.get(id),
        (r) => db.payments.put(r),
        payload.tables.payments,
      )
    },
  )
  return () => replaceAllTables(snapshot)
}
