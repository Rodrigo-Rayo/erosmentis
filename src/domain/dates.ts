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
  return {
    start: fromZonedTime(start, timeZone).getTime(),
    end: fromZonedTime(end, timeZone).setHours(23, 59, 59, 999),
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
  return {
    start: fromZonedTime(start, timeZone).getTime(),
    end: fromZonedTime(end, timeZone).setHours(23, 59, 59, 999),
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

export function generateWeeklyOccurrences(startAt: number, count: number): number[] {
  if (count <= 0) {
    return []
  }
  const occurrences: number[] = []
  let cursor = new Date(startAt)
  for (let i = 0; i < count; i += 1) {
    occurrences.push(cursor.getTime())
    cursor = addWeeks(cursor, 1)
  }
  return occurrences
}

export function shiftDays(timestamp: number, days: number): number {
  return addDays(new Date(timestamp), days).getTime()
}
