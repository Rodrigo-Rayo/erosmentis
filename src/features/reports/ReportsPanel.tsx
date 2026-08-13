import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { listAllSessions } from '@/db/repositories/sessions.repo'
import { calculateMonthTotals } from '@/domain/totals'
import {
  calculateAverageSessionCents,
  calculateServiceTypeBreakdown,
  calculateYearBreakdown,
} from '@/domain/reports'
import { formatCents } from '@/domain/money'
import { capitalize } from '@/domain/dates'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import styles from './ReportsPanel.module.css'

type Period = 'historic' | 'year' | 'custom'

function toDateInputValue(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function ReportsPanel() {
  const [period, setPeriod] = useState<Period>('historic')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const allSessions = useLiveQuery(() => listAllSessions(), [], [])
  const serviceTypes = useLiveQuery(() => db.serviceTypes.toArray(), [], [])
  const serviceTypesById = useMemo(() => new Map(serviceTypes.map((s) => [s.id, s])), [serviceTypes])

  const earliestStartAt = allSessions[0]?.startAt ?? Date.now()

  // Seed the custom range with the full historic span the first time the user switches to it,
  // so the two date inputs never start out empty.
  useEffect(() => {
    if (period === 'custom' && customFrom === '' && customTo === '') {
      setCustomFrom(toDateInputValue(earliestStartAt))
      setCustomTo(toDateInputValue(Date.now()))
    }
  }, [period, customFrom, customTo, earliestStartAt])

  const range = useMemo(() => {
    if (period === 'year') {
      const year = new Date().getFullYear()
      return { start: new Date(year, 0, 1).getTime(), end: new Date(year, 11, 31, 23, 59, 59, 999).getTime() }
    }
    if (period === 'custom' && customFrom && customTo) {
      const end = new Date(customTo)
      end.setHours(23, 59, 59, 999)
      return { start: new Date(customFrom).getTime(), end: end.getTime() }
    }
    return null
  }, [period, customFrom, customTo])

  // "Histórico" is every record ever entered — no upper bound at "now", since already-scheduled
  // future sessions are legitimately billed/pending too, same as everywhere else in the app.
  const periodSessions = useMemo(
    () => (range ? allSessions.filter((s) => s.startAt >= range.start && s.startAt <= range.end) : allSessions),
    [allSessions, range],
  )

  const totals = calculateMonthTotals(periodSessions)
  const averageCents = calculateAverageSessionCents(totals.billedCents, totals.billableSessionCount)
  const serviceBreakdown = calculateServiceTypeBreakdown(periodSessions, serviceTypesById)
  const yearBreakdown = period === 'historic' ? calculateYearBreakdown(periodSessions) : []

  if (allSessions.length === 0) {
    return (
      <EmptyState
        emoji="📊"
        title="Sin datos todavía"
        description="Cuando registres sesiones, aquí verás el resumen de ingresos."
      />
    )
  }

  const periodLabel =
    period === 'historic'
      ? `Desde ${capitalize(
          new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(earliestStartAt),
        )}`
      : period === 'year'
        ? `Año ${new Date().getFullYear()}`
        : 'Rango personalizado'

  return (
    <div className={styles.wrapper}>
      <div className={styles.periodToggle}>
        <Chip selected={period === 'historic'} tone="accent" onClick={() => setPeriod('historic')}>
          Histórico
        </Chip>
        <Chip selected={period === 'year'} tone="accent" onClick={() => setPeriod('year')}>
          Este año
        </Chip>
        <Chip selected={period === 'custom'} tone="accent" onClick={() => setPeriod('custom')}>
          Personalizado
        </Chip>
      </div>

      {period === 'custom' && (
        <div className={styles.customRange}>
          <label className={styles.dateField}>
            <span>Desde</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </label>
          <label className={styles.dateField}>
            <span>Hasta</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </label>
        </div>
      )}

      <p className={styles.periodLabel}>{periodLabel}</p>

      <section className={styles.totals}>
        <div className={styles.totalItem}>
          <span className={styles.totalLabel}>Facturado</span>
          <span className={styles.totalValue}>{formatCents(totals.billedCents)}</span>
        </div>
        <div className={styles.totalItem}>
          <span className={styles.totalLabel}>Cobrado</span>
          <span className={styles.totalValue}>{formatCents(totals.collectedCents)}</span>
        </div>
        <div className={styles.totalItem}>
          <span className={styles.totalLabel}>Pendiente</span>
          <span className={styles.totalValuePending}>{formatCents(totals.pendingCents)}</span>
        </div>
      </section>

      <section className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{totals.billableSessionCount}</span>
          <span className={styles.statLabel}>Sesiones facturadas</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{formatCents(averageCents)}</span>
          <span className={styles.statLabel}>Precio medio</span>
        </div>
      </section>

      {serviceBreakdown.length > 0 && (
        <section className={styles.breakdownSection}>
          <h2 className={styles.sectionTitle}>Por tipo de sesión</h2>
          <div className={styles.breakdownList}>
            {serviceBreakdown.map((item) => (
              <div key={item.serviceTypeId} className={styles.breakdownRow}>
                <span
                  className={styles.breakdownDot}
                  style={{ background: `var(--color-${item.colorToken})` }}
                />
                <span className={styles.breakdownName}>{item.name}</span>
                <span className={styles.breakdownCount}>{item.sessionCount}</span>
                <span className={styles.breakdownAmount}>{formatCents(item.billedCents)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {yearBreakdown.length > 1 && (
        <section className={styles.breakdownSection}>
          <h2 className={styles.sectionTitle}>Por año</h2>
          <div className={styles.breakdownList}>
            {yearBreakdown.map((item) => (
              <div key={item.year} className={styles.yearRow}>
                <span className={styles.yearLabel}>{item.year}</span>
                <span className={styles.yearAmount}>{formatCents(item.billedCents)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
