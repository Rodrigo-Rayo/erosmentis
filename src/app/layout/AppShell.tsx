import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { QuickAddFab } from './QuickAddFab'
import styles from './AppShell.module.css'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>{children}</main>
      <QuickAddFab />
      <BottomNav />
    </div>
  )
}
