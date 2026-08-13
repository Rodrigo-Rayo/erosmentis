import type { Session } from './types'

export interface BusinessHours {
  startHour: number
  endHour: number
}

// Keyed by Date#getDay(): 0=Sunday, 1=Monday, ... 6=Saturday.
// Monday-Thursday 19:00-21:00, Friday 16:00-20:00, Saturday closed, Sunday 9:00-20:00.
const WEEKLY_BUSINESS_HOURS: Record<number, BusinessHours | null> = {
  0: { startHour: 9, endHour: 20 },
  1: { startHour: 19, endHour: 21 },
  2: { startHour: 19, endHour: 21 },
  3: { startHour: 19, endHour: 21 },
  4: { startHour: 19, endHour: 21 },
  5: { startHour: 16, endHour: 20 },
  6: null,
}

export function getBusinessHoursForWeekday(weekday: number): BusinessHours | null {
  return WEEKLY_BUSINESS_HOURS[weekday] ?? null
}

/** Fixed, one-tap 1-hour slot start-hours for a given calendar day, per the practice's set schedule.
 * These are a convenience shortcut, not a restriction — any other time can still be entered manually. */
export function getFixedHoursForDay(date: Date): number[] {
  const hours = getBusinessHoursForWeekday(date.getDay())
  if (!hours) return []
  const result: number[] = []
  for (let h = hours.startHour; h < hours.endHour; h += 1) {
    result.push(h)
  }
  return result
}

export function isSlotOccupied(
  sessions: readonly Session[],
  slotStart: number,
  slotDurationMin = 60,
): boolean {
  const slotEnd = slotStart + slotDurationMin * 60_000
  return sessions.some(
    (s) =>
      s.deletedAt === null &&
      s.startAt < slotEnd &&
      s.startAt + s.durationMin * 60_000 > slotStart,
  )
}

export interface DayHourSlot {
  hour: number
  startAt: number
  occupied: boolean
}

/** Builds `date`'s fixed hourly slots, each flagged as occupied against the given sessions. */
export function getDayHourSlots(date: Date, sessions: readonly Session[]): DayHourSlot[] {
  return getFixedHoursForDay(date).map((hour) => {
    const slotStart = new Date(date)
    slotStart.setHours(hour, 0, 0, 0)
    const startAt = slotStart.getTime()
    return { hour, startAt, occupied: isSlotOccupied(sessions, startAt) }
  })
}

export interface DayFreeSlots {
  date: Date
  slots: DayHourSlot[]
}

/** Monday of the ISO week containing `date`. */
export function startOfWeekMonday(date: Date): Date {
  const result = new Date(date)
  const day = result.getDay()
  const daysSinceMonday = (day + 6) % 7
  result.setDate(result.getDate() - daysSinceMonday)
  result.setHours(0, 0, 0, 0)
  return result
}

/** For each day of the Mon-Sun week starting at `mondayOfWeek`, the fixed hourly slots still free. */
export function getWeekFreeSlots(mondayOfWeek: Date, sessions: readonly Session[]): DayFreeSlots[] {
  const result: DayFreeSlots[] = []
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(mondayOfWeek)
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0)
    const freeSlots = getDayHourSlots(date, sessions).filter((s) => !s.occupied)
    if (freeSlots.length > 0) {
      result.push({ date, slots: freeSlots })
    }
  }
  return result
}
