import { describe, expect, it } from 'vitest'
import { formatNumber, formatRows, relativeTime } from './utils'

describe('formatNumber', () => {
  it('groups thousands the Spanish way regardless of the runtime ICU data', () => {
    expect(formatNumber(1662)).toBe('1.662')
    expect(formatNumber(1284567)).toBe('1.284.567')
    expect(formatNumber(318)).toBe('318')
  })

  it('uses a comma for decimals and rounds to two places', () => {
    expect(formatNumber(34.2)).toBe('34,2')
    expect(formatNumber(1234.567)).toBe('1.234,57')
  })

  it('keeps negatives readable', () => {
    expect(formatNumber(-1662)).toBe('-1.662')
  })
})

describe('formatRows', () => {
  it('pluralises', () => {
    expect(formatRows(1)).toBe('1 fila')
    expect(formatRows(4)).toBe('4 filas')
    expect(formatRows(1662)).toBe('1.662 filas')
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-07-14T12:00:00Z').getTime()
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it('describes recent moments in minutes and hours', () => {
    expect(relativeTime(ago(30_000), now)).toBe('hace un momento')
    expect(relativeTime(ago(5 * 60_000), now)).toBe('hace 5 min')
    expect(relativeTime(ago(2 * 3_600_000), now)).toBe('hace 2 h')
  })

  it('describes days, with "ayer" for one', () => {
    expect(relativeTime(ago(24 * 3_600_000), now)).toBe('ayer')
    expect(relativeTime(ago(3 * 24 * 3_600_000), now)).toBe('hace 3 d')
  })
})
