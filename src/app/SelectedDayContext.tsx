import { createContext, useContext, useState, type ReactNode } from 'react'

interface SelectedDayContextValue {
  selectedDay: Date
  setSelectedDay: (day: Date) => void
}

const SelectedDayContext = createContext<SelectedDayContextValue | null>(null)

/** Shares the day currently selected on the Calendario/Día month grid with the rest of the
 * app — specifically the "+" FAB, so tapping it after picking a day in the calendar opens
 * "Nueva sesión" defaulted to that day instead of always defaulting to today. */
export function SelectedDayProvider({ children }: { children: ReactNode }) {
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date())
  return (
    <SelectedDayContext.Provider value={{ selectedDay, setSelectedDay }}>
      {children}
    </SelectedDayContext.Provider>
  )
}

export function useSelectedDay(): SelectedDayContextValue {
  const ctx = useContext(SelectedDayContext)
  if (!ctx) {
    throw new Error('useSelectedDay must be used within SelectedDayProvider')
  }
  return ctx
}
