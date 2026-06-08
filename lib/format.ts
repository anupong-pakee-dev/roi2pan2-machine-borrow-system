/**
 * Shared utilities for time + formatting (used by client components).
 */

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** "HH.MM" — the canonical format stored in DB */
export function fmtClock(d: Date): string {
  return `${pad2(d.getHours())}.${pad2(d.getMinutes())}`
}

export function fmtClockSec(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** Buddhist-era Thai date, short form */
export function fmtDateTH(d: Date): string {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}

/** "HH.MM" parser → minutes since midnight */
export function parseHM(t: string): number {
  if (!t) return 0
  const [h, m] = t.split('.').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** wrap-aware minutes between two "HH.MM" strings */
export function minutesBetween(start: string, end: string): number {
  let diff = parseHM(end) - parseHM(start)
  if (diff < 0) diff += 24 * 60
  return diff
}

export function fmtDuration(mins: number | undefined): string {
  if (mins == null) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} นาที`
  return `${h}ชม. ${pad2(m)}`
}

/**
 * วันที่วันนี้เป็น YYYY-MM-DD ในเวลาไทย (UTC+7)
 * ใช้เปรียบเทียบกับ toISODate() เสมอ
 */
export function todayISO(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/**
 * แปลง Date หรือ ISO string → YYYY-MM-DD ในเวลาไทย (UTC+7)
 * ต้องใช้ UTC+7 ทุกครั้ง ไม่ใช้ local timezone ของอุปกรณ์
 * เพื่อให้ตรงกับ ThaiDatePicker และ todayISO()
 */
export function toISODate(d: Date | string): string {
  const ms = typeof d === 'string' ? new Date(d).getTime() : (d as Date).getTime()
  return new Date(ms + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
