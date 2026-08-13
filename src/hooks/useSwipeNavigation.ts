import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

const SWIPE_THRESHOLD_PX = 48
// Requires the gesture to be meaningfully more horizontal than vertical, so a normal
// vertical scroll over the same area never gets misread as a swipe.
const HORIZONTAL_DOMINANCE_RATIO = 1.3

export interface SwipeHandlers {
  onPointerDown: (e: ReactPointerEvent) => void
  onPointerUp: (e: ReactPointerEvent) => void
  onPointerCancel: (e: ReactPointerEvent) => void
}

/** Swipe-left triggers `onSwipeLeft` (conventionally "forward" — next week/month), swipe-right
 * triggers `onSwipeRight` ("back"). Pair the returned handlers with `style={{ touchAction: 'pan-y' }}`
 * on the target element so native vertical scrolling keeps working underneath the gesture. */
export function useSwipeNavigation(onSwipeLeft: () => void, onSwipeRight: () => void): SwipeHandlers {
  const start = useRef<{ x: number; y: number } | null>(null)

  function onPointerDown(e: ReactPointerEvent) {
    start.current = { x: e.clientX, y: e.clientY }
  }

  function finish(e: ReactPointerEvent) {
    const origin = start.current
    start.current = null
    if (!origin) return
    const dx = e.clientX - origin.x
    const dy = e.clientY - origin.y
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_DOMINANCE_RATIO) return
    if (dx < 0) {
      onSwipeLeft()
    } else {
      onSwipeRight()
    }
  }

  return {
    onPointerDown,
    onPointerUp: finish,
    onPointerCancel: () => {
      start.current = null
    },
  }
}
