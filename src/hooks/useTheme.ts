import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, updateSettings } from '@/db/repositories/settings.repo'
import type { AppSettings } from '@/domain/types'

export function useTheme(): { theme: AppSettings['theme']; setTheme: (theme: AppSettings['theme']) => void } {
  const settings = useLiveQuery(() => getSettings(), [], null)
  const theme = settings?.theme ?? 'system'

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])

  function setTheme(next: AppSettings['theme']) {
    updateSettings({ theme: next })
  }

  return { theme, setTheme }
}
