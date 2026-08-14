import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CloseIcon } from '@/components/icons/NavIcons'
import styles from './Sheet.module.css'

interface SheetProps {
  title: string
  children: ReactNode
  onClose?: () => void
}

export function Sheet({ title, children, onClose }: SheetProps) {
  const navigate = useNavigate()

  function handleClose() {
    if (onClose) {
      onClose()
      return
    }
    navigate(-1)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />
      <motion.div
        key="sheet"
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 120) {
            handleClose()
          }
        }}
      >
        <div className={styles.grabber} />
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Cerrar"
          >
            <CloseIcon className={styles.closeIcon} />
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </motion.div>
    </AnimatePresence>
  )
}
