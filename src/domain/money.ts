export function formatCents(cents: number, locale = 'es-ES', currency = 'EUR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

export function centsToEuros(cents: number): number {
  return cents / 100
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

export function splitEvenly(totalCents: number, parts: number): number {
  if (parts <= 0) {
    throw new Error('parts must be greater than zero')
  }
  return Math.round(totalCents / parts)
}
