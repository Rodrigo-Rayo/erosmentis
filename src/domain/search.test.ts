import { describe, expect, it } from 'vitest'
import { buildSearchName, matchesSearch, normalizeSearchText } from './search'

describe('normalizeSearchText', () => {
  it('strips accents from Spanish names', () => {
    expect(normalizeSearchText('María')).toBe('maria')
    expect(normalizeSearchText('Peña')).toBe('pena')
    expect(normalizeSearchText('Núñez')).toBe('nunez')
    expect(normalizeSearchText('José Ángel')).toBe('jose angel')
  })

  it('lowercases and trims surrounding whitespace', () => {
    expect(normalizeSearchText('  ANA GARCÍA  ')).toBe('ana garcia')
  })

  it('leaves already-plain text unchanged apart from casing', () => {
    expect(normalizeSearchText('Marc Ruiz')).toBe('marc ruiz')
  })
})

describe('buildSearchName', () => {
  it('joins and normalizes multiple names for a couple', () => {
    expect(buildSearchName(['Ana García', 'José Ángel'])).toBe('ana garcia jose angel')
  })
})

describe('matchesSearch', () => {
  it('matches regardless of accents on either side', () => {
    expect(matchesSearch(buildSearchName(['María Núñez']), 'maria nunez')).toBe(true)
    expect(matchesSearch(buildSearchName(['Maria Nunez']), 'María')).toBe(true)
  })

  it('matches a substring anywhere in the name', () => {
    expect(matchesSearch(buildSearchName(['Ana García']), 'garc')).toBe(true)
  })

  it('treats an empty or whitespace-only query as match-all', () => {
    const searchName = buildSearchName(['Cualquier Paciente'])
    expect(matchesSearch(searchName, '')).toBe(true)
    expect(matchesSearch(searchName, '   ')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(matchesSearch(buildSearchName(['Ana García']), 'pedro')).toBe(false)
  })
})
