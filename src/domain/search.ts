const COMBINING_DIACRITICS = /[̀-ͯ]/g

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(COMBINING_DIACRITICS, '').toLowerCase().trim()
}

export function buildSearchName(names: readonly string[]): string {
  return normalizeSearchText(names.join(' '))
}

export function matchesSearch(searchName: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery === '') {
    return true
  }
  return searchName.includes(normalizedQuery)
}
