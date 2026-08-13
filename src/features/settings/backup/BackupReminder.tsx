import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useToast } from '@/components/ui/Toast'
import { getSettings } from '@/db/repositories/settings.repo'
import { getEarliestClientCreatedAt } from '@/db/repositories/clients.repo'
import { getBackupReminderState } from '@/domain/backupReminder'

// Module-level, not per-instance: guards against showing the nag more than once per page load
// even though this component could in principle remount (it doesn't today, but the guard is
// cheap insurance against it firing twice back-to-back).
let reminderShownThisPageLoad = false

/** Renders nothing — mounted once at the app root purely to fire a one-time toast when the
 * backup reminder (src/domain/backupReminder.ts) says it's overdue. */
export function BackupReminder() {
  const toast = useToast()
  const navigate = useNavigate()
  const settings = useLiveQuery(() => getSettings(), [], null)
  const earliestActivityAt = useLiveQuery(() => getEarliestClientCreatedAt(), [], null)
  const hasShown = useRef(false)

  useEffect(() => {
    if (hasShown.current || reminderShownThisPageLoad || !settings) return

    const { isOverdue } = getBackupReminderState(settings, earliestActivityAt)
    if (!isOverdue) return

    hasShown.current = true
    reminderShownThisPageLoad = true
    toast.show(
      'Llevas más de dos meses sin copia de seguridad',
      {
        label: 'Hacer copia',
        onClick: () => {
          navigate('/ajustes/backup')
        },
      },
      { tone: 'warning', durationMs: 6000 },
    )
  }, [settings, earliestActivityAt, toast, navigate])

  return null
}
