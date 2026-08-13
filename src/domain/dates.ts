import {
  addDays,
  addWeeks,
  endOfMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

export const APP_TIMEZONE = 'Europe/Madrid'

export interface DateRange {
  start: number
  end: number
}

export function monthRange(monthStart: Date, timeZone = APP_TIMEZONE): DateRange {
  const zoned = toZonedTime(monthStart, timeZone)
  const start = startOfMonth(zoned)
  const end = endOfMonth(zoned)
  // Set the end-of-day time on the still-zoned Date before converting to a UTC instant —
  // doing it after fromZonedTime() would call setHours() using the host system's timezone
  // instead of `timeZone`, silently shifting the boundary by hours on any device not set to
  // Europe/Madrid.
  end.setHours(23, 59, 59, 999)
  return {
    start: fromZonedTime(start, timeZone).getTime(),
    end: fromZonedTime(end, timeZone).getTime(),
  }
}

export function dayRange(day: Date, timeZone = APP_TIMEZONE): DateRange {
  const zoned = toZonedTime(day, timeZone)
  const startOfDay = new Date(zoned)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(zoned)
  endOfDay.setHours(23, 59, 59, 999)
  return {
    start: fromZonedTime(startOfDay, timeZone).getTime(),
    end: fromZonedTime(endOfDay, timeZone).getTime(),
  }
}

export function weekRange(
  day: Date,
  weekStartsOn: 0 | 1 = 1,
  timeZone = APP_TIMEZONE,
): DateRange {
  const zoned = toZonedTime(day, timeZone)
  const start = startOfWeek(zoned, { weekStartsOn })
  const end = endOfWeek(zoned, { weekStartsOn })
  end.setHours(23, 59, 59, 999)
  return {
    start: fromZonedTime(start, timeZone).getTime(),
    end: fromZonedTime(end, timeZone).getTime(),
  }
}

export function isWithinRange(timestamp: number, range: DateRange): boolean {
  return timestamp >= range.start && timestamp <= range.end
}

export function nextHalfHourBoundary(from = new Date()): Date {
  const result = new Date(from)
  const minutes = result.getMinutes()
  const remainder = minutes % 30
  if (remainder === 0 && result.getSeconds() === 0) {
    result.setSeconds(0, 0)
    return result
  }
  result.setMinutes(minutes + (30 - remainder), 0, 0)
  return result
}

export function generateWeeklyOccurrences(startAt: number, count: number, intervalWeeks = 1): number[] {
  if (count <= 0) {
    return []
  }
  const occurrences: number[] = []
  let cursor = new Date(startAt)
  for (let i = 0; i < count; i += 1) {
    occurrences.push(cursor.getTime())
    cursor = addWeeks(cursor, intervalWeeks)
  }
  return occurrences
}

export function shiftDays(timestamp: number, days: number): number {
  return addDays(new Date(timestamp), days).getTime()
}

/** Capitalizes only the first character — Spanish Intl.DateTimeFormat output is lowercase
 * ("miércoles, 12 de agosto"), and CSS text-transform:capitalize would wrongly title-case
 * every word ("De Agosto"). */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
