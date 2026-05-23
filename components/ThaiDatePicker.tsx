'use client'
import { useState, useRef, useEffect } from 'react'

// ---- helpers ----
const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน',
  'พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม',
  'กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
]
const THAI_MONTHS_SHORT = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.',
  'พ.ค.','มิ.ย.','ก.ค.','ส.ค.',
  'ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
]
const WEEK_LABELS = ['อา','จ','อ','พ','พฤ','ศ','ส']

/** แปลง YYYY-MM-DD → { year(ค.ศ.), month(1-12), day } */
function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y, month: m, day: d }
}
/** แปลง { year(ค.ศ.), month, day } → YYYY-MM-DD */
function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}
function firstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay()
}
function todayThaiISO() {
  const now = new Date()
  const t = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return t.toISOString().slice(0, 10)
}

// ---- Props ----
interface Props {
  value: string          // YYYY-MM-DD (ค.ศ.)
  onChange: (v: string) => void
  className?: string
  placeholder?: string
  max?: string           // YYYY-MM-DD
  min?: string           // YYYY-MM-DD
}

export default function ThaiDatePicker({ value, onChange, className = '', placeholder = 'เลือกวันที่', max, min }: Props) {
  const today = todayThaiISO()
  const { year: ty, month: tm, day: td } = parseISO(today)

  // ค่าที่เลือกอยู่
  const selected = value ? parseISO(value) : null

  // หน้าปฏิทินที่แสดง (ค.ศ.)
  const [calYear, setCalYear]   = useState(selected?.year  ?? ty)
  const [calMonth, setCalMonth] = useState(selected?.month ?? tm)

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // ปิดเมื่อคลิกข้างนอก
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // sync calendar เมื่อ value เปลี่ยนจากภายนอก
  useEffect(() => {
    if (value) {
      const { year, month } = parseISO(value)
      setCalYear(year); setCalMonth(month)
    }
  }, [value])

  function prevMonth() {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1) }
    else setCalMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const iso = toISO(calYear, calMonth, day)
    if (max && iso > max) return
    if (min && iso < min) return
    onChange(iso)
    setOpen(false)
  }

  // label ที่โชว์ใน trigger
  const displayLabel = selected
    ? `${String(selected.day).padStart(2,'0')} ${THAI_MONTHS_SHORT[selected.month-1]} ${selected.year + 543}`
    : placeholder

  const days = daysInMonth(calYear, calMonth)
  const startDow = firstDayOfWeek(calYear, calMonth)
  const todayParsed = parseISO(today)

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`input-field flex items-center justify-between gap-2 cursor-pointer text-left ${!value ? 'text-muted' : 'text-light'}`}
      >
        <span>{displayLabel}</span>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0 text-muted">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 bg-surface border border-border rounded-2xl shadow-2xl p-4 w-72 left-0">
          {/* Header: prev / month+year / next */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-light transition-colors">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <span className="text-sm font-semibold text-light">
              {THAI_MONTHS[calMonth-1]} {calYear + 543}
            </span>

            <button type="button" onClick={nextMonth}
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-light transition-colors">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEK_LABELS.map(w => (
              <div key={w} className="text-center text-[10px] text-muted font-medium py-1">{w}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {/* empty cells */}
            {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}

            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1
              const iso = toISO(calYear, calMonth, day)
              const isSelected = value === iso
              const isToday    = calYear === todayParsed.year && calMonth === todayParsed.month && day === todayParsed.day
              const isDisabled = (max && iso > max) || (min && iso < min)

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  disabled={!!isDisabled}
                  className={`
                    h-8 w-full rounded-lg text-sm font-medium transition-all
                    ${isSelected ? 'bg-accent text-ink font-bold' :
                      isToday    ? 'bg-white/10 text-accent border border-accent/40' :
                      isDisabled ? 'text-muted/30 cursor-not-allowed' :
                                   'text-light hover:bg-white/10 cursor-pointer'}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* ปุ่มวันนี้ */}
          <div className="mt-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                const { year, month } = parseISO(today)
                setCalYear(year); setCalMonth(month)
                selectDay(parseISO(today).day)
              }}
              className="w-full text-xs text-accent hover:text-accent/80 font-medium py-1 rounded-lg hover:bg-accent/10 transition-colors"
            >
              วันนี้ ({parseISO(today).day} {THAI_MONTHS_SHORT[parseISO(today).month-1]} {parseISO(today).year + 543})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
