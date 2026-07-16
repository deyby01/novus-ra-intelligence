import { describe, expect, it } from 'vitest'
import { formatNumber, formatRows, relativeTime, reportExcerpt } from './utils'

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

describe('reportExcerpt', () => {
  it('skips headings and returns the first two prose sentences', () => {
    const md = [
      '## Executive Summary',
      '',
      'Ingresos crecieron un 12% este trimestre. La región Norte lideró el',
      'crecimiento. El inventario se mantuvo estable.',
    ].join('\n')

    expect(reportExcerpt(md)).toBe(
      'Ingresos crecieron un 12% este trimestre. La región Norte lideró el crecimiento.',
    )
  })

  it('strips inline markdown — bold, links and code', () => {
    const md =
      'El **margen** llegó a `34,2%`. Ver [detalle](https://x.io/report).'

    expect(reportExcerpt(md)).toBe('El margen llegó a 34,2%. Ver detalle.')
  })

  it('ignores tables, bullets and quotes, keeping only prose', () => {
    const md = [
      '# Reporte',
      '| Mes | Ventas |',
      '| --- | --- |',
      '| Ene | 100 |',
      '',
      '- punto uno',
      '> una cita',
      '',
      'Las ventas subieron con fuerza.',
    ].join('\n')

    expect(reportExcerpt(md)).toBe('Las ventas subieron con fuerza.')
  })

  it('does not split a decimal number into two sentences', () => {
    const md = 'El margen fue de 12.5% en total. Buen resultado.'

    expect(reportExcerpt(md)).toBe(
      'El margen fue de 12.5% en total. Buen resultado.',
    )
  })

  it('honours the sentence cap', () => {
    const md = 'Uno. Dos. Tres.'

    expect(reportExcerpt(md, 1)).toBe('Uno.')
  })

  it('returns an empty string when there is no prose to summarise', () => {
    const md = ['## Solo un título', '', '| a | b |', '| - | - |'].join('\n')

    expect(reportExcerpt(md)).toBe('')
  })
})
