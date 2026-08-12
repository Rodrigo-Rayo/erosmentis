import { useEffect, useState } from 'react'

const DEFAULT_DELAY_MS = 1500

/**
 * `useLiveQuery` returns `undefined` both while a query is still loading and when it
 * genuinely found nothing (e.g. a stale link to a deleted session/client) — the two look
 * identical, so a screen keyed off a missing id used to show "Cargando…" forever. This
 * flips to `true` once `value` has stayed undefined for longer than a real DB round trip
 * should ever take, so the UI can show a "not found" state instead of spinning forever.
 */
export function useNotFoundAfterDelay(value: unknown, delayMs = DEFAULT_DELAY_MS): boolean {
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (value !== undefined) {
      setNotFound(false)
      return
    }
    const timer = setTimeout(() => setNotFound(true), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return notFound
}
