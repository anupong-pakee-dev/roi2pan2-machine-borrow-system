// Parse "HH.MM" format to minutes from midnight
export function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split('.').map(Number)
  return h * 60 + (m || 0)
}

// Calculate minutes between two "HH.MM" time strings
export function calcMinutes(borrowAt: string, returnAt: string): number {
  const start = parseTime(borrowAt)
  const end = parseTime(returnAt)
  if (end < start) return end + 24 * 60 - start // overnight
  return end - start
}

// Format number as time "HH.MM"
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`
}

// Calculate debt and change
export function calcFinancials(baht: number, coupon: number) {
  const debt = Math.max(0, baht - coupon)
  const change = coupon > baht ? coupon - baht : 0
  return { debt, change }
}
