import type { AppSettings } from './types'

const DAY_MS = 24 * 60 * 60 * 1000

export interface BackupReminderState {
  isOverdue: boolean
  daysSinceLastBackup: number | null
}

/**
 * Uses `lastBackupAt` if a backup has ever been taken. Otherwise falls back to
 * `earliestActivityAt` (the oldest client record) as a stand-in for "when real usage began",
 * so a fresh install with no data yet is never nagged — but genuine usage that never got backed
 * up eventually is.
 */
export function getBackupReminderState(
  settings: Pick<AppSettings, 'lastBackupAt' | 'backupReminderDays'>,
  earliestActivityAt: number | null,
  now = Date.now(),
): BackupReminderState {
  const anchor = settings.lastBackupAt ?? earliestActivityAt
  if (anchor === null) {
    return { isOverdue: false, daysSinceLastBackup: null }
  }
  const daysSinceLastBackup = Math.floor((now - anchor) / DAY_MS)
  return { isOverdue: daysSinceLastBackup >= settings.backupReminderDays, daysSinceLastBackup }
}
