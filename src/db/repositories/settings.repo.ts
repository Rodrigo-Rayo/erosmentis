import { db } from '@/db/database'
import { DEFAULT_WEEKLY_BUSINESS_HOURS } from '@/domain/schedule'
import type { AppSettings } from '@/domain/types'

const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  theme: 'system',
  locale: 'es-ES',
  currency: 'EUR',
  weekStartsOn: 1,
  defaultModality: 'online',
  lowBalanceThreshold: 1,
  lastBackupAt: null,
  // "cada dos meses" — reminds when it's been this many days since the last backup (or, if
  // none was ever taken, since the oldest client record — see domain/backupReminder.ts).
  backupReminderDays: 60,
  seedVersion: 0,
  onboardingCompletedAt: null,
  weeklyBusinessHours: DEFAULT_WEEKLY_BUSINESS_HOURS,
}

/** Read-only: safe to call from useLiveQuery. Never writes to the database. Merges defaults
 * under whatever is already stored so a settings row saved before a new AppSettings field was
 * introduced still gets a sane value for it, instead of `undefined` at runtime. */
export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('app')
  return existing ? { ...DEFAULT_SETTINGS, ...existing } : DEFAULT_SETTINGS
}

/** Writes the default settings row if missing. Call outside of any liveQuery context. */
export async function ensureSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('app')
  if (existing) {
    return existing
  }
  await db.settings.add(DEFAULT_SETTINGS)
  return DEFAULT_SETTINGS
}

export async function updateSettings(changes: Partial<Omit<AppSettings, 'id'>>): Promise<void> {
  await ensureSettings()
  await db.settings.update('app', changes)
}
