import { describe, expect, it } from 'vitest'
import { centsToEuros, eurosToCents, formatCents, splitEvenly, sumCents } from './money'

describe('money', () => {
  it('formats cents as EUR currency', () => {
    expect(formatCents(6000)).toBe('60,00 €')
  })

  it('converts euros to cents without float drift', () => {
    expect(eurosToCents(60)).toBe(6000)
    expect(eurosToCents(0.1)).toBe(10)
  })

  it('converts cents back to euros', () => {
    expect(centsToEuros(6000)).toBe(60)
  })

  it('sums a list of cent values', () => {
    expect(sumCents([6000, 8000, 0])).toBe(14000)
    expect(sumCents([])).toBe(0)
  })

  it('splits a package price evenly per session, rounding to nearest cent', () => {
    expect(splitEvenly(22000, 4)).toBe(5500)
    expect(splitEvenly(10000, 3)).toBe(3333)
  })

  it('throws when splitting by zero or negative parts', () => {
    expect(() => splitEvenly(1000, 0)).toThrow()
    expect(() => splitEvenly(1000, -1)).toThrow()
  })
})
