import { describe, expect, it } from 'vitest'
import { getBackupReminderState } from './backupReminder'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 7, 13)

describe('getBackupReminderState', () => {
  it('is not overdue when there is no backup and no activity yet (fresh install)', () => {
    const state = getBackupReminderState({ lastBackupAt: null, backupReminderDays: 60 }, null, NOW)
    expect(state).toEqual({ isOverdue: false, daysSinceLastBackup: null })
  })

  it('is not overdue right after a backup', () => {
    const state = getBackupReminderState(
      { lastBackupAt: NOW - DAY_MS, backupReminderDays: 60 },
      null,
      NOW,
    )
    expect(state.isOverdue).toBe(false)
    expect(state.daysSinceLastBackup).toBe(1)
  })

  it('is overdue once backupReminderDays have passed since the last backup', () => {
    const state = getBackupReminderState(
      { lastBackupAt: NOW - 61 * DAY_MS, backupReminderDays: 60 },
      null,
      NOW,
    )
    expect(state.isOverdue).toBe(true)
    expect(state.daysSinceLastBackup).toBe(61)
  })

  it('falls back to the earliest client activity when no backup was ever taken', () => {
    const state = getBackupReminderState(
      { lastBackupAt: null, backupReminderDays: 60 },
      NOW - 65 * DAY_MS,
      NOW,
    )
    expect(state.isOverdue).toBe(true)
  })

  it('does not nag yet when usage started recently and no backup exists', () => {
    const state = getBackupReminderState(
      { lastBackupAt: null, backupReminderDays: 60 },
      NOW - 10 * DAY_MS,
      NOW,
    )
    expect(state.isOverdue).toBe(false)
  })
})
