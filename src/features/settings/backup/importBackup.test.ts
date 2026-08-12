import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '@/db/database'
import { seedIfNeeded } from '@/db/seed'
import { createClient } from '@/db/repositories/clients.repo'
import { listServiceTypes } from '@/db/repositories/serviceTypes.repo'
import { createSession } from '@/db/repositories/sessions.repo'
import { createPackage } from '@/db/repositories/packages.repo'
import { exportBackup } from './exportBackup'
import { decryptBackupFile, previewBackup, restoreMerge, restoreReplace } from './importBackup'
import { WrongPasswordError } from './crypto'
import { InvalidBackupFileError } from './importBackup'

beforeEach(async () => {
  await db.delete()
  await db.open()
  await seedIfNeeded()
})

async function seedSomeData() {
  const client = await createClient({ kind: 'individual', people: [{ name: 'Ana García' }] })
  const serviceType = (await listServiceTypes())[0]
  await createSession({
    clientId: client.id,
    serviceTypeId: serviceType.id,
    startAt: Date.now(),
    modality: 'online',
  })
  await createPackage({
    clientId: client.id,
    serviceTypeId: serviceType.id,
    label: 'Bono 4 sesiones',
    totalSessions: 4,
    pricePaidCents: 22000,
    paymentMethod: 'bizum',
  })
  return client
}

// Capture the Blob that exportBackup() would normally trigger as a download,
// so tests can feed it straight into decryptBackupFile without touching the DOM download path.
function captureExportedFile(): { getFile: () => File } {
  let capturedBlob: Blob | null = null
  const originalCreateObjectURL = URL.createObjectURL
  URL.createObjectURL = (blob: Blob) => {
    capturedBlob = blob
    return 'blob:mock'
  }
  URL.revokeObjectURL = () => {}
  const originalCreateElement = document.createElement.bind(document)
  document.createElement = ((tag: string) => {
    const el = originalCreateElement(tag)
    if (tag === 'a') {
      Object.defineProperty(el, 'click', { value: () => {} })
    }
    return el
  }) as typeof document.createElement

  return {
    getFile: () => {
      if (!capturedBlob) throw new Error('No export was captured')
      URL.createObjectURL = originalCreateObjectURL
      document.createElement = originalCreateElement
      return new File([capturedBlob], 'backup.pab', { type: 'application/json' })
    },
  }
}

describe('export -> restore round trip', () => {
  it('restores byte-identical business data after a replace restore on a wiped database', async () => {
    await seedSomeData()
    const originalSessions = await db.sessions.toArray()
    const originalClients = await db.clients.toArray()
    const originalPackages = await db.packages.toArray()

    const capture = captureExportedFile()
    await exportBackup('correct-password')
    const file = capture.getFile()

    // Wipe everything, simulating a lost/reset device.
    await db.clients.clear()
    await db.sessions.clear()
    await db.packages.clear()
    await db.payments.clear()

    const payload = await decryptBackupFile(file, 'correct-password')
    const preview = previewBackup(payload)
    expect(preview.counts.clients).toBe(1)
    expect(preview.counts.sessions).toBe(1)
    expect(preview.counts.packages).toBe(1)

    await restoreReplace(payload)

    const restoredClients = await db.clients.toArray()
    const restoredSessions = await db.sessions.toArray()
    const restoredPackages = await db.packages.toArray()

    expect(restoredClients).toEqual(originalClients)
    expect(restoredSessions).toEqual(originalSessions)
    expect(restoredPackages).toEqual(originalPackages)
  })

  it('fails clearly with the wrong password', async () => {
    await seedSomeData()
    const capture = captureExportedFile()
    await exportBackup('correct-password')
    const file = capture.getFile()

    await expect(decryptBackupFile(file, 'wrong-password')).rejects.toThrow(WrongPasswordError)
  })

  it('rejects a file that is not a valid backup envelope', async () => {
    const bogusFile = new File([JSON.stringify({ not: 'a backup' })], 'bogus.pab', {
      type: 'application/json',
    })
    await expect(decryptBackupFile(bogusFile, 'any-password')).rejects.toThrow(
      InvalidBackupFileError,
    )
  })

  it('undo restores the pre-import snapshot after a replace', async () => {
    await seedSomeData()
    const capture = captureExportedFile()
    await exportBackup('pw')
    const file = capture.getFile()
    const payload = await decryptBackupFile(file, 'pw')

    // Simulate a second device's newer data already on this phone before the restore.
    await db.clients.clear()
    const newerClient = await createClient({ kind: 'individual', people: [{ name: 'Otro Cliente' }] })

    const undo = await restoreReplace(payload)
    const afterRestore = await db.clients.toArray()
    expect(afterRestore.some((c) => c.id === newerClient.id)).toBe(false)

    await undo()
    const afterUndo = await db.clients.toArray()
    expect(afterUndo.some((c) => c.id === newerClient.id)).toBe(true)
  })

  it('merge keeps the newer record when ids collide, by updatedAt', async () => {
    const client = await seedSomeData()
    const capture = captureExportedFile()
    await exportBackup('pw')
    const file = capture.getFile()
    const payload = await decryptBackupFile(file, 'pw')

    // Locally the client gets renamed *after* the backup was taken.
    await new Promise((resolve) => setTimeout(resolve, 5))
    await db.clients.update(client.id, {
      displayName: 'Ana García (actualizada)',
      updatedAt: Date.now(),
    })

    await restoreMerge(payload)

    const merged = await db.clients.get(client.id)
    expect(merged?.displayName).toBe('Ana García (actualizada)')
  })

  it('undo restores the pre-merge snapshot, same safety net as replace', async () => {
    const backedUpClient = await seedSomeData()
    const capture = captureExportedFile()
    await exportBackup('pw')
    const file = capture.getFile()
    const payload = await decryptBackupFile(file, 'pw')

    // Wipe, then create a different local client before merging the old backup back in —
    // the merge should add the backed-up client alongside it.
    await db.clients.clear()
    const localOnlyClient = await createClient({ kind: 'individual', people: [{ name: 'Solo local' }] })

    const undo = await restoreMerge(payload)
    const afterMerge = await db.clients.toArray()
    expect(afterMerge.map((c) => c.id).sort()).toEqual(
      [localOnlyClient.id, backedUpClient.id].sort(),
    )

    await undo()
    const afterUndo = await db.clients.toArray()
    expect(afterUndo.map((c) => c.id)).toEqual([localOnlyClient.id])
  })
})
