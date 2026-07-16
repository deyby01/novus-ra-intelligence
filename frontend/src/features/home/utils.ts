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

/** Strip inline markdown (links, code, bold, italic, strikethrough) to text. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [label](url) → label
    .replace(/`([^`]+)`/g, '$1') // `code` → code
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // **bold** / __bold__
    .replace(/(\*|_)(.*?)\1/g, '$2') // *italic* / _italic_
    .replace(/~~(.*?)~~/g, '$1') // ~~struck~~
    .trim()
}

const EXCERPT_MAX_CHARS = 240

/**
 * A short, plain-text lead-in from a report's GFM markdown body — the first
 * couple of prose sentences with the markup stripped. Lets the Home preview
 * the AI's reading without rendering the whole report.
 *
 * Structural lines (headings, table rows, bullets, quotes, rules) are dropped
 * so only real prose is summarised. Sentences are split on terminators that a
 * space and a capital follow, so decimals like "12.5%" are never mistaken for
 * a sentence break.
 */
export function reportExcerpt(markdown: string, maxSentences = 2): string {
  const prose = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith('#') && // headings
        !line.startsWith('|') && // table rows
        !line.startsWith('>') && // block quotes
        !/^[-*+]\s/.test(line) && // unordered list items
        !/^\d+\.\s/.test(line) && // ordered list items
        !/^[-*_]{3,}$/.test(line), // horizontal rules
    )
    .map(stripInlineMarkdown)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!prose) return ''

  const sentences = prose.split(/(?<=[.!?])\s+(?=[¿¡"'A-ZÁÉÍÓÚÑÜ])/)
  const excerpt = sentences.slice(0, maxSentences).join(' ').trim()

  if (excerpt.length <= EXCERPT_MAX_CHARS) return excerpt
  const clipped = excerpt.slice(0, EXCERPT_MAX_CHARS)
  return `${clipped.slice(0, clipped.lastIndexOf(' ')).trim()}…`
}
