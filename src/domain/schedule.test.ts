import { describe, expect, it } from 'vitest'
import {
  getBusinessHoursForWeekday,
  getFixedSlotStartMinutes,
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

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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

describe('getFixedSlotStartMinutes', () => {
  it('steps every half hour, only where a full 1-hour session still fits before closing', () => {
    const monday = new Date(2026, 7, 17) // a Monday, 19:00-21:00
    expect(getFixedSlotStartMinutes(monday).map(formatMinutes)).toEqual(['19:00', '19:30', '20:00'])

    const friday = new Date(2026, 7, 21) // 16:00-20:00
    expect(getFixedSlotStartMinutes(friday).map(formatMinutes)).toEqual([
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
    ])

    const saturday = new Date(2026, 7, 22)
    expect(getFixedSlotStartMinutes(saturday)).toEqual([])

    const sunday = new Date(2026, 7, 23) // 9:00-20:00
    expect(getFixedSlotStartMinutes(sunday)).toHaveLength(21)
    expect(formatMinutes(getFixedSlotStartMinutes(sunday)[0])).toBe('09:00')
    expect(formatMinutes(getFixedSlotStartMinutes(sunday).at(-1)!)).toBe('19:00')
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
      { hour: 19, minute: 0, startAt: nineteenHundred, occupied: true },
      { hour: 19, minute: 30, startAt: nineteenHundred + 30 * 60 * 1000, occupied: true },
      { hour: 20, minute: 0, startAt: nineteenHundred + 60 * 60 * 1000, occupied: false },
    ])
  })

  it('blocks a slot that only has a 30-minute gap before the next session, not just exact overlaps', () => {
    // A session at 12:00-13:00 and another at 13:30-14:30 leave only a 30-minute gap at 13:00 —
    // not enough room for a full 1-hour session, so 13:00 (and 12:30) must be blocked too.
    const sunday = new Date(2026, 7, 23) // Sunday, 9:00-20:00
    const twelve = new Date(2026, 7, 23, 12, 0).getTime()
    const thirteenThirty = new Date(2026, 7, 23, 13, 30).getTime()
    const sessions = [makeSession(twelve), makeSession(thirteenThirty)]

    const slots = getDayHourSlots(sunday, sessions)
    const byTime = new Map(slots.map((s) => [`${s.hour}:${s.minute}`, s.occupied]))

    expect(byTime.get('12:30')).toBe(true) // 12:30-13:30 would overlap the 12:00 session
    expect(byTime.get('13:0')).toBe(true) // 13:00-14:00 would overlap the 13:30 session
    expect(byTime.get('14:30')).toBe(false) // 14:30-15:30 clears both sessions
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

    // Book Monday's 19:00 and 20:00 slots — with the 19:30 slot also blocked by overlap with
    // either, this fully occupies Monday's three fixed slots.
    const mondayNineteen = new Date(2026, 7, 17, 19, 0).getTime()
    const mondayTwenty = new Date(2026, 7, 17, 20, 0).getTime()

    const sessions = [makeSession(mondayNineteen), makeSession(mondayTwenty)]
    const freeByDay = getWeekFreeSlots(mondayOfWeek, sessions)

    const days = freeByDay.map((d) => d.date.getDay())
    expect(days).not.toContain(1) // Monday fully booked
    expect(days).not.toContain(6) // Saturday closed

    const friday = freeByDay.find((d) => d.date.getDay() === 5)
    expect(friday?.slots.map((s) => formatMinutes(s.hour * 60 + s.minute))).toEqual([
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
    ])
  })
})
