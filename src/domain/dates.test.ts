import { describe, expect, it } from 'vitest'
import { generateWeeklyOccurrences } from './dates'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const START = Date.UTC(2026, 7, 4, 17, 0)

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
