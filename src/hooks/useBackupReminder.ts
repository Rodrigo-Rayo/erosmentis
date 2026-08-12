import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '@/db/repositories/settings.repo'

const DAY_MS = 24 * 60 * 60 * 1000

export function useBackupReminder(): { needsBackup: boolean; daysSinceBackup: number | null } {
  const settings = useLiveQuery(() => getSettings(), [], null)

  if (!settings) {
    return { needsBackup: false, daysSinceBackup: null }
  }

  const daysSinceBackup = settings.lastBackupAt
    ? Math.floor((Date.now() - settings.lastBackupAt) / DAY_MS)
    : null

  const needsBackup = daysSinceBackup === null || daysSinceBackup >= settings.backupReminderDays

  return { needsBackup, daysSinceBackup }
}
