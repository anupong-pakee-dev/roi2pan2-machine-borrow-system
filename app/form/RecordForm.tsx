'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fmtClock } from '@/lib/format'
import ThaiDatePicker from '@/components/ThaiDatePicker'

interface Props {
  nextNumber: number
  activeMachines: string[]
  machineList: string[]
}

/** วันที่ปัจจุบันในเวลาไทย (UTC+7) — ตรงกับ ThaiDatePicker */
function todayThaiISO(): string {
  const t = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return t.toISOString().slice(0, 10)
}

/**
 * Full-page Borrow form — POS-style picker.
 * For quick-borrow from Dashboard, use <QuickBorrowModal>.
 */
export default function RecordForm({ nextNumber, activeMachines, machineList }: Props) {
  const router = useRouter()
  const [number,     setNumber]     = useState<number | ''>('')
  const [machine,    setMachine]    = useState('')
  const [recordDate, setRecordDate] = useState(todayThaiISO())
  const [borrowAt,   setBorrowAt]   = useState(fmtClock(new Date()))
  const [reports,    setReports]    = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const today = todayThaiISO()
  const available = machineList.filter(m => !activeMachines.includes(m))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!number)  return setError('กรุณาใส่เลขที่')
    if (!machine) return setError('กรุณาเลือกเครื่อง')
    if (!borrowAt) return setError('กรุณาระบุเวลายืม')
    setError('')
    setLoading(true)
    try {
      // Build customCreatedAt ด้วย timezone ไทย (+07:00) ตรงๆ
      // เพื่อป้องกัน UTC shift ที่ทำให้วันที่ผิดในช่วงดึก
      const [hh, mm] = borrowAt.split(/[.:]/).map(Number)
      const hhStr = String(hh || 0).padStart(2, '0')
      const mmStr = String(mm || 0).padStart(2, '0')
      const customCreatedAt = `${recordDate}T${hhStr}:${mmStr}:00+07:00`

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number,
          machine,
          borrowAt,
          status:  'borrowing',
          reports: reports.trim() || null,
          customCreatedAt,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'บันทึกไม่สำเร็จ'); return }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date picker — Thai calendar */}
      <div>
        <label className="label">วันที่บันทึก <span className="text-accent">*</span></label>
        <ThaiDatePicker
          value={recordDate}
          onChange={v => { setRecordDate(v); setError('') }}
          max={today}
        />
        {recordDate !== today && (
          <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1.5">
            <span>⚠</span> บันทึกย้อนหลัง
          </p>
        )}
      </div>

      {/* Header info row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">เลขที่ <span className="text-accent">*</span></label>
          <input
            className="input-field font-mono text-2xl font-semibold h-14"
            type="number"
            min="1"
            value={number}
            onChange={e => { setNumber(e.target.value === '' ? '' : Number(e.target.value)); setError('') }}
            required
          />
        </div>
        <div>
          <label className="label">เวลายืม <span className="text-accent">*</span></label>
          <input
            className="input-field font-mono text-2xl font-semibold h-14"
            value={borrowAt}
            onChange={e => { setBorrowAt(e.target.value); setError('') }}
            placeholder="HH.MM"
            required
          />
        </div>
      </div>

      {/* Machine picker grid */}
      <div>
        <label className="label flex justify-between items-baseline">
          <span>เลือกเครื่อง <span className="text-accent">*</span></span>
          <span className="text-muted normal-case tracking-normal">
            ว่าง {available.length} เครื่อง
          </span>
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 mt-2">
          {available.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMachine(m); setError('') }}
              className={[
                'rounded-xl p-3 min-h-[88px] flex flex-col justify-center items-start text-left',
                'transition-all duration-150 active:scale-[.99]',
                machine === m
                  ? 'bg-accent text-accent-ink border border-transparent'
                  : 'bg-surface border border-dashed border-border hover:border-light/40',
              ].join(' ')}
            >
              <div className="text-[10px] uppercase tracking-[0.08em] font-semibold opacity-65">{m.replace(/\d+$/, '')}</div>
              <div className="font-mono tabular-nums text-3xl font-bold leading-none mt-1">
                {m.replace(/^\D+/, '')}
              </div>
            </button>
          ))}
        </div>
        {activeMachines.length > 0 && (
          <p className="text-xs text-muted mt-3 flex flex-wrap gap-1.5 items-center">
            <span>กำลังยืม:</span>
            {activeMachines.map(m => (
              <span key={m} className="font-mono text-[11px] px-2 py-0.5 rounded
                                       bg-accent2/15 text-accent2">{m}</span>
            ))}
          </p>
        )}
      </div>

      <div>
        <label className="label">หมายเหตุ</label>
        <textarea
          className="input-field"
          rows={2}
          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
          value={reports}
          onChange={e => setReports(e.target.value)}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg
                        bg-accent2/10 border border-accent2/30 text-accent2 text-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
          ยกเลิก
        </button>
        <button type="submit" disabled={loading || !machine} className="btn-primary btn-lg flex-[2]">
          {loading ? 'กำลังบันทึก…' : `เริ่มจับเวลา${machine ? ' · ' + machine : ''}`}
        </button>
      </div>
    </form>
  )
}
