import type { Session, WeeklyBusinessHours } from './types'

export type { BusinessHours } from './types'

// Keyed by Date#getDay(): 0=Sunday, 1=Monday, ... 6=Saturday.
// Monday-Thursday 19:00-21:00, Friday 16:00-20:00, Saturday closed, Sunday 9:00-20:00.
// Used both as the schedule.ts default (so existing tests and callers keep working without
// passing one explicitly) and as the AppSettings default for anyone who hasn't customized
// their hours yet from Ajustes.
export const DEFAULT_WEEKLY_BUSINESS_HOURS: WeeklyBusinessHours = {
  0: { startHour: 9, endHour: 20 },
  1: { startHour: 19, endHour: 21 },
  2: { startHour: 19, endHour: 21 },
  3: { startHour: 19, endHour: 21 },
  4: { startHour: 19, endHour: 21 },
  5: { startHour: 16, endHour: 20 },
  6: null,
}

export function getBusinessHoursForWeekday(
  weekday: number,
  businessHours: WeeklyBusinessHours = DEFAULT_WEEKLY_BUSINESS_HOURS,
) {
  return businessHours[weekday] ?? null
}

const SLOT_STEP_MIN = 30
const SESSION_DURATION_MIN = 60

/** Fixed, one-tap slot start times (in minutes from midnight) for a given calendar day, per the
 * practice's set schedule. Stepped every half hour — so a session can start on the hour or the
 * half hour, e.g. to leave a buffer after a previous appointment — but only where a full 1-hour
 * session still fits before closing time. These are a convenience shortcut, not a restriction —
 * any other time can still be entered manually. */
export function getFixedSlotStartMinutes(
  date: Date,
  businessHours: WeeklyBusinessHours = DEFAULT_WEEKLY_BUSINESS_HOURS,
): number[] {
  const hours = getBusinessHoursForWeekday(date.getDay(), businessHours)
  if (!hours) return []
  const startMin = hours.startHour * 60
  const endMin = hours.endHour * 60
  const result: number[] = []
  for (let m = startMin; m + SESSION_DURATION_MIN <= endMin; m += SLOT_STEP_MIN) {
    result.push(m)
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
  minute: number
  startAt: number
  occupied: boolean
}

/** Builds `date`'s fixed half-hour-stepped slots, each flagged as occupied — meaning a full
 * 1-hour session starting there would overlap an existing one — against the given sessions. */
export function getDayHourSlots(
  date: Date,
  sessions: readonly Session[],
  businessHours: WeeklyBusinessHours = DEFAULT_WEEKLY_BUSINESS_HOURS,
): DayHourSlot[] {
  return getFixedSlotStartMinutes(date, businessHours).map((totalMinutes) => {
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60
    const slotStart = new Date(date)
    slotStart.setHours(hour, minute, 0, 0)
    const startAt = slotStart.getTime()
    return { hour, minute, startAt, occupied: isSlotOccupied(sessions, startAt, SESSION_DURATION_MIN) }
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
export function getWeekFreeSlots(
  mondayOfWeek: Date,
  sessions: readonly Session[],
  businessHours: WeeklyBusinessHours = DEFAULT_WEEKLY_BUSINESS_HOURS,
): DayFreeSlots[] {
  const result: DayFreeSlots[] = []
  for (let i = 0; i < 7; i += 1) {
    const date = new Date(mondayOfWeek)
    date.setDate(date.getDate() + i)
    date.setHours(0, 0, 0, 0)
    const freeSlots = getDayHourSlots(date, sessions, businessHours).filter((s) => !s.occupied)
    if (freeSlots.length > 0) {
      result.push({ date, slots: freeSlots })
    }
  }
  return result
}
