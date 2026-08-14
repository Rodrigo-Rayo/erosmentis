import { useRef, type PointerEvent } from 'react'

const LONG_PRESS_DELAY_MS = 500
// Cancels the long-press if the finger drifts more than this — distinguishes a hold from the
// start of a scroll/swipe gesture.
const MOVE_CANCEL_THRESHOLD_PX = 10

/** WhatsApp-style press-and-hold: fires `onLongPress` after holding still for
 * LONG_PRESS_DELAY_MS. Exposes `wasLongPress()` so the caller's own click handler can skip
 * its normal action (e.g. navigating) when the same gesture already triggered the long-press. */
export function useLongPress(onLongPress: () => void, delay = LONG_PRESS_DELAY_MS) {
  const timerRef = useRef<number | null>(null)
  const firedRef = useRef(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)

  function clear() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function onPointerDown(e: PointerEvent) {
    firedRef.current = false
    startRef.current = { x: e.clientX, y: e.clientY }
    clear()
    timerRef.current = window.setTimeout(() => {
      firedRef.current = true
      onLongPress()
    }, delay)
  }

  function onPointerMove(e: PointerEvent) {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD_PX) {
      clear()
    }
  }

  function onPointerUp() {
    clear()
  }

  function onPointerCancel() {
    clear()
  }

  /** Call from the element's onClick — returns true (and resets) if this click follows a
   * long-press that already fired, so the caller can skip its normal click behavior. */
  function wasLongPress() {
    const was = firedRef.current
    firedRef.current = false
    return was
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, wasLongPress }
}
