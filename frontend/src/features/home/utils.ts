/**
 * Formatting helpers for the Home.
 *
 * Numbers are grouped by hand rather than with `toLocaleString`: that depends
 * on the runtime's ICU data, so it silently stops grouping under Node's
 * small-icu build (tests/CI) while grouping in the browser.
 */

/** Format a number the Spanish way: "." for thousands, "," for decimals. */
export function formatNumber(value: number): string {
  const rounded = Number.isInteger(value)
    ? value
    : Math.round(value * 100) / 100
  const [integer, decimals] = Math.abs(rounded).toString().split('.')
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const sign = rounded < 0 ? '-' : ''
  return decimals ? `${sign}${grouped},${decimals}` : `${sign}${grouped}`
}

/** "3 filas" / "1 fila", with grouped thousands. */
export function formatRows(count: number): string {
  return `${formatNumber(count)} ${count === 1 ? 'fila' : 'filas'}`
}

/**
 * A short Spanish relative time: "hace 2 h", "ayer", "hace 3 d".
 *
 * Truncates rather than rounds, so elapsed time never reads ahead of itself
 * (90 minutes is "hace 1 h", not "hace 2 h").
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  return `hace ${days} d`
}
