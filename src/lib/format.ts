// ─── Arabic month names + date formatting helpers (mirror PHP format_date) ───

const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const

/** Parse an ISO date or datetime string into a Date (UTC midnight for date-only). */
function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null
  // date-only "YYYY-MM-DD" → use UTC midnight to match PHP's strtotime behaviour
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T00:00:00Z`)
  }
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

/** Today's UTC midnight as a Date. */
function todayUTC(): Date {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Format an ISO date string to "15 سبتمبر 2026" (Arabic month names). Empty string on null. */
export function formatDate(iso: string | null | undefined): string {
  const d = parse(iso)
  if (!d) return ''
  const day = d.getUTCDate()
  const month = AR_MONTHS[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${day} ${month} ${year}`
}

/** Format an ISO datetime string to "15 سبتمبر 2026 - 14:30". */
export function formatDateTime(iso: string | null | undefined): string {
  const d = parse(iso)
  if (!d) return ''
  const datePart = formatDate(iso)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${datePart} - ${hh}:${mm}`
}

/** Days until given date. Positive=future, negative=past, rounded. Null if no date. */
export function daysUntil(iso: string | null | undefined): number | null {
  const d = parse(iso)
  if (!d) return null
  const today = todayUTC()
  const diffMs = d.getTime() - today.getTime()
  return Math.round(diffMs / 86400000)
}

/** Today's date as YYYY-MM-DD (UTC, to match server-side). */
export function todayISO(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`
}

/** Validate strict YYYY-MM-DD. */
export function isValidDate(s: string | null | undefined): boolean {
  if (!s) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/** Add N days to a YYYY-MM-DD date string. */
export function addDays(iso: string, days: number): string {
  const d = parse(iso) || new Date()
  const out = new Date(d.getTime() + days * 86400000)
  return `${out.getUTCFullYear()}-${String(out.getUTCMonth() + 1).padStart(2, '0')}-${String(
    out.getUTCDate()
  ).padStart(2, '0')}`
}

/** Truncate text to N chars with ellipsis. */
export function truncate(text: string | null | undefined, n: number): string {
  if (!text) return ''
  if (text.length <= n) return text
  return text.slice(0, n).trimEnd() + '…'
}
