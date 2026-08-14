/// <reference types="node" />
import { afterEach, describe, expect, it } from 'vitest'
import {
  generateWeeklyOccurrences,
  monthRange,
  nextHalfHourBoundaryOnDay,
  weekRange,
} from './dates'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 7, 4, 17, 0)

describe('monthRange / weekRange timezone handling', () => {
  const originalTZ = process.env.TZ

  afterEach(() => {
    process.env.TZ = originalTZ
  })

  it('monthRange produces Madrid-local bounds regardless of the host system timezone', () => {
    process.env.TZ = 'America/New_York'
    const range = monthRange(new Date(Date.UTC(2026, 7, 15)))
    // August 2026 in Madrid is CEST (UTC+2): the month starts at 2026-07-31T22:00Z and ends
    // at 2026-08-31T21:59:59.999Z. A host system in New York must not shift these bounds.
    expect(new Date(range.start).toISOString()).toBe('2026-07-31T22:00:00.000Z')
    expect(new Date(range.end).toISOString()).toBe('2026-08-31T21:59:59.999Z')
  })

  it('weekRange produces Madrid-local bounds regardless of the host system timezone', () => {
    process.env.TZ = 'America/New_York'
    const range = weekRange(new Date(Date.UTC(2026, 7, 13)), 1)
    // Week of Mon 2026-08-10 to Sun 2026-08-16 in Madrid (CEST, UTC+2).
    expect(new Date(range.start).toISOString()).toBe('2026-08-09T22:00:00.000Z')
    expect(new Date(range.end).toISOString()).toBe('2026-08-16T21:59:59.999Z')
  })
})

describe('nextHalfHourBoundaryOnDay', () => {
  it('carries the current time-of-day over onto the given day, then rounds up to the next half hour', () => {
    const pickedDay = new Date(2026, 7, 20) // midnight, no time-of-day of its own
    const now = new Date(2026, 7, 14, 14, 37)
    const result = nextHalfHourBoundaryOnDay(pickedDay, now)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(7)
    expect(result.getDate()).toBe(20)
    expect(result.getHours()).toBe(15)
    expect(result.getMinutes()).toBe(0)
  })

  it('keeps an already-on-the-half-hour time as-is', () => {
    const pickedDay = new Date(2026, 7, 20)
    const now = new Date(2026, 7, 14, 9, 30, 0, 0)
    const result = nextHalfHourBoundaryOnDay(pickedDay, now)
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(30)
  })
})

describe('generateWeeklyOccurrences', () => {
  it('defaults to one occurrence per week', () => {
    const occurrences = generateWeeklyOccurrences(START, 3)
    expect(occurrences).toHaveLength(3)
    expect(occurrences[1] - occurrences[0]).toBe(WEEK_MS)
    expect(occurrences[2] - occurrences[1]).toBe(WEEK_MS)
  })

  it('spaces occurrences by the given interval, for biweekly/monthly cadences', () => {
    const biweekly = generateWeeklyOccurrences(START, 3, 2)
    expect(biweekly[1] - biweekly[0]).toBe(2 * WEEK_MS)

    const monthly = generateWeeklyOccurrences(START, 3, 4)
    expect(monthly[1] - monthly[0]).toBe(4 * WEEK_MS)
  })

  it('returns an empty array for a non-positive count', () => {
    expect(generateWeeklyOccurrences(START, 0)).toEqual([])
    expect(generateWeeklyOccurrences(START, -1)).toEqual([])
  })
})
