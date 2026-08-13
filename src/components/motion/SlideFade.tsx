import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface SlideFadeProps {
  /** Change this to trigger a transition — typically an offset/index that increases going
   * "forward" (next month/week) and decreases going "back", so the slide direction matches. */
  itemKey: number
  children: ReactNode
  className?: string
}

/** Cross-fades and slides its children horizontally whenever `itemKey` changes, sliding left
 * for an increasing key and right for a decreasing one — the same feel as the calendar's month
 * transition, reused wherever a similar forward/back paging happens (month lists, week views). */
export function SlideFade({ itemKey, children, className }: SlideFadeProps) {
  const prevKeyRef = useRef(itemKey)
  const direction = itemKey === prevKeyRef.current ? 0 : itemKey > prevKeyRef.current ? 1 : -1

  useEffect(() => {
    prevKeyRef.current = itemKey
  }, [itemKey])

  return (
    <div style={{ overflow: 'hidden' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={itemKey}
          className={className}
          initial={{ opacity: 0, x: direction * 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -28 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
