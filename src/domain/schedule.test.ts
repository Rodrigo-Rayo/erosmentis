import { describe, expect, it } from 'vitest'
import {
  getBusinessHoursForWeekday,
  getFixedHoursForDay,
  getDayHourSlots,
  getWeekFreeSlots,
  isSlotOccupied,
  startOfWeekMonday,
} from './schedule'
import type { Session } from './types'

function makeSession(startAt: number, durationMin = 60, deletedAt: number | null = null): Session {
  return {
    id: crypto.randomUUID(),
    clientId: 'client-1',
    serviceTypeId: 'service-1',
    startAt,
    durationMin,
    modality: 'online',
    attendance: 'scheduled',
    paymentStatus: 'pending',
    priceCents: 6000,
    packageId: null,
    countsAgainstPackage: true,
    isBillableOverride: null,
    seriesId: null,
    notes: '',
    createdAt: startAt,
    updatedAt: startAt,
    deletedAt,
  }
}

describe('getBusinessHoursForWeekday', () => {
  it('matches the practice schedule Mon-Thu 19-21, Fri 16-20, Sat closed, Sun 9-20', () => {
    expect(getBusinessHoursForWeekday(1)).toEqual({ startHour: 19, endHour: 21 }) // Monday
    expect(getBusinessHoursForWeekday(4)).toEqual({ startHour: 19, endHour: 21 }) // Thursday
    expect(getBusinessHoursForWeekday(5)).toEqual({ startHour: 16, endHour: 20 }) // Friday
    expect(getBusinessHoursForWeekday(6)).toBeNull() // Saturday
    expect(getBusinessHoursForWeekday(0)).toEqual({ startHour: 9, endHour: 20 }) // Sunday
  })
})

describe('getFixedHoursForDay', () => {
  it('returns one slot per hour, last slot ending exactly at closing time', () => {
    const monday = new Date(2026, 7, 17) // a Monday
    expect(getFixedHoursForDay(monday)).toEqual([19, 20])

    const friday = new Date(2026, 7, 21)
    expect(getFixedHoursForDay(friday)).toEqual([16, 17, 18, 19])

    const saturday = new Date(2026, 7, 22)
    expect(getFixedHoursForDay(saturday)).toEqual([])

    const sunday = new Date(2026, 7, 23)
    expect(getFixedHoursForDay(sunday)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
  })
})

describe('isSlotOccupied', () => {
  it('detects an overlapping active session and ignores soft-deleted ones', () => {
    const slotStart = new Date(2026, 7, 17, 19, 0).getTime()
    const overlapping = makeSession(slotStart, 60)
    expect(isSlotOccupied([overlapping], slotStart)).toBe(true)

    const deleted = makeSession(slotStart, 60, Date.now())
    expect(isSlotOccupied([deleted], slotStart)).toBe(false)

    const elsewhere = makeSession(slotStart + 5 * 60 * 60 * 1000, 60)
    expect(isSlotOccupied([elsewhere], slotStart)).toBe(false)
  })
})

describe('getDayHourSlots', () => {
  it('marks the occupied hour and leaves the rest free', () => {
    const monday = new Date(2026, 7, 17)
    const nineteenHundred = new Date(2026, 7, 17, 19, 0).getTime()
    const slots = getDayHourSlots(monday, [makeSession(nineteenHundred)])

    expect(slots).toEqual([
      { hour: 19, startAt: nineteenHundred, occupied: true },
      { hour: 20, startAt: nineteenHundred + 60 * 60 * 1000, occupied: false },
    ])
  })
})

describe('startOfWeekMonday', () => {
  it('rewinds any day in the week to that week\'s Monday at midnight', () => {
    const sunday = new Date(2026, 7, 23, 15, 30)
    const monday = startOfWeekMonday(sunday)
    expect(monday.getDay()).toBe(1)
    expect(monday.getDate()).toBe(17)
    expect(monday.getHours()).toBe(0)
  })
})

describe('getWeekFreeSlots', () => {
  it('omits fully-booked days and days with no business hours, keeps only free slots', () => {
    const mondayOfWeek = startOfWeekMonday(new Date(2026, 7, 17))

    // Book both Monday slots (19:00 and 20:00) so Monday disappears entirely.
    const mondayNineteen = new Date(2026, 7, 17, 19, 0).getTime()
    const mondayTwenty = new Date(2026, 7, 17, 20, 0).getTime()

    const sessions = [makeSession(mondayNineteen), makeSession(mondayTwenty)]
    const freeByDay = getWeekFreeSlots(mondayOfWeek, sessions)

    const days = freeByDay.map((d) => d.date.getDay())
    expect(days).not.toContain(1) // Monday fully booked
    expect(days).not.toContain(6) // Saturday closed

    const friday = freeByDay.find((d) => d.date.getDay() === 5)
    expect(friday?.slots.map((s) => s.hour)).toEqual([16, 17, 18, 19])
  })
})
