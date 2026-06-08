'use client'
import { memo, useRef, useState } from 'react'
import ThaiDatePicker from '@/components/ThaiDatePicker'
import { toISODate } from '@/lib/format'

export interface FilterState {
  machine: string
  payMethod: string   // '' | 'cash' | 'coupon' | 'debt'
  search: string
}

interface Props {
  /* View-mode (today / date / range / all) */
  viewMode: 'today' | 'date' | 'range' | 'all'
  setViewMode: (v: 'today' | 'date' | 'range' | 'all') => void
  selectedDate: string
  setSelectedDate: (s: string) => void
  selectedDateEnd: string
  setSelectedDateEnd: (s: string) => void
  todayCount: number
  allCount: number

  /* Filter content */
  machines: string[]
  filters: FilterState
  setFilters: (f: FilterState) => void

  /* Result count */
  resultCount: number
  baseCount: number
}

/**
 * Filter Panel for records — view-mode tabs + machine chips + payment method
 * chips + debounced search + result count.
 *
 * Memoized so it doesn't re-render parent on every keystroke.
 */
const FilterPanel = memo(function FilterPanel({
  viewMode, setViewMode, selectedDate, setSelectedDate,
  selectedDateEnd, setSelectedDateEnd,
  todayCount, allCount, machines, filters, setFilters,
  resultCount, baseCount,
}: Props) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onSearchChange(v: string) {
    setLocalSearch(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setFilters({ ...filters, search: v })
    }, 180)
  }

  const activeCount = [filters.machine, filters.payMethod, filters.search].filter(Boolean).length
  const clearAll = () => {
    setLocalSearch('')
    setFilters({ machine: '', payMethod: '', search: '' })
  }

  const today = toISODate(new Date())   // วันนี้ในเวลาไทย (UTC+7)

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      {/* View mode + date */}
      <Row label="ช่วงเวลา">
        <Chip active={viewMode === 'today'} onClick={() => setViewMode('today')}>
          วันนี้ <span className="font-mono text-[11px] opacity-70">·{todayCount}</span>
        </Chip>
        <Chip active={viewMode === 'date'} onClick={() => setViewMode('date')}>
          วันเดียว
        </Chip>
        <Chip active={viewMode === 'range'} onClick={() => setViewMode('range')}>
          ช่วงวัน
        </Chip>
        <Chip active={viewMode === 'all'} onClick={() => setViewMode('all')}>
          ทั้งหมด <span className="font-mono text-[11px] opacity-70">·{allCount}</span>
        </Chip>
        {viewMode === 'date' && (
          <ThaiDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            max={today}
            className="min-w-[190px]"
          />
        )}
        {viewMode === 'range' && (
          <div className="flex items-center gap-2 flex-wrap">
            <ThaiDatePicker
              value={selectedDate}
              onChange={v => {
                setSelectedDate(v)
                if (selectedDateEnd && v > selectedDateEnd) setSelectedDateEnd(v)
              }}
              max={today}
              className="min-w-[190px]"
            />
            <span className="text-muted text-sm">ถึง</span>
            <ThaiDatePicker
              value={selectedDateEnd}
              onChange={setSelectedDateEnd}
              min={selectedDate || undefined}
              max={today}
              className="min-w-[190px]"
            />
          </div>
        )}
      </Row>

      {/* Search */}
      <div className="flex items-center gap-3 h-11 px-4 rounded-xl
                      bg-panel border border-border focus-within:border-light">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.7" strokeLinecap="round" className="text-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={localSearch}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="ค้นหาเลขที่ · เครื่อง · หมายเหตุ…"
          className="flex-1 bg-transparent outline-none text-base text-light placeholder:text-muted"
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="w-6 h-6 rounded-full bg-surface text-muted hover:text-light grid place-items-center"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Machine chips */}
      <Row label="เครื่อง">
        <Chip active={!filters.machine} onClick={() => setFilters({ ...filters, machine: '' })}>
          ทุกเครื่อง
        </Chip>
        {machines.map(m => (
          <Chip
            key={m}
            active={filters.machine === m}
            mono
            onClick={() => setFilters({ ...filters, machine: filters.machine === m ? '' : m })}
          >
            {m}
          </Chip>
        ))}
      </Row>

      {/* Pay method */}
      <Row label="วิธีชำระ">
        {([
          ['',        'ทั้งหมด',        ''],
          ['cash',    '💵 เงินสด',      'active-cash'],
          ['coupon',  '🎟 คูปอง',       'active-coupon'],
          ['debt',    '📌 ค้างชำระ',    'active-debt'],
        ] as [string, string, string][]).map(([v, label, activeCls]) => (
          <Chip
            key={v}
            active={filters.payMethod === v}
            activeCls={activeCls}
            onClick={() => setFilters({ ...filters, payMethod: v })}
          >
            {label}
          </Chip>
        ))}
      </Row>

      {/* Foot */}
      {(activeCount > 0 || resultCount !== baseCount) && (
        <div className="flex justify-between items-center pt-3 border-t border-border text-sm">
          <span className="text-muted">
            แสดง <strong className="text-light">{resultCount}</strong> / {baseCount} รายการ
            {activeCount > 0 && <> · ตัวกรอง <strong className="text-light">{activeCount}</strong></>}
          </span>
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="px-3 py-1 rounded-md text-muted hover:text-light hover:bg-panel transition-colors"
            >
              ล้างตัวกรองทั้งหมด ✕
            </button>
          )}
        </div>
      )}
    </div>
  )
})

export default FilterPanel

/* ===== helpers ===== */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] font-semibold text-muted uppercase tracking-[0.08em] min-w-[64px]">
        {label}
      </span>
      {children}
    </div>
  )
}

function Chip({ active, activeCls, onClick, mono, children }: {
  active?: boolean
  activeCls?: string
  onClick?: () => void
  mono?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'chip',
        active ? (activeCls ? activeCls : 'active') : '',
        mono ? 'font-mono tabular-nums tracking-tight' : '',
      ].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  )
}
