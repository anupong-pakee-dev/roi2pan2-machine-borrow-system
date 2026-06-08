'use client'
import { useState } from 'react'
import ModalShell from './ModalShell'
import { fmtClock } from '@/lib/format'

interface Props {
  machine?: string                // preselect
  nextNumber: number
  machineList: string[]
  busyMachines: string[]
  onClose: () => void
  onCreated: () => void
}

/**
 * Quick Borrow — POS sheet for starting a session in one tap.
 * POSTs to /api/records with status:'borrowing'.
 */
export default function QuickBorrowModal({
  machine, nextNumber, machineList, busyMachines, onClose, onCreated,
}: Props) {
  const [selected, setSelected] = useState<string>(machine || '')
  const [number,   setNumber]   = useState<number | ''>('')
  const [borrowAt, setBorrowAt] = useState(fmtClock(new Date()))
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const available = machineList.filter(m => !busyMachines.includes(m))

  async function confirm() {
    if (!number) return setError('กรุณาใส่เลขที่')
    if (!selected)            return setError('เลือกเครื่องก่อน')
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number,
          machine:  selected,
          borrowAt,
          status:   'borrowing',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'บันทึกไม่สำเร็จ'); return }
      onCreated()
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell
      title={`เริ่มยืมเครื่อง · ${borrowAt}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button
            onClick={confirm}
            disabled={!selected || loading}
            className="btn-primary btn-lg"
          >
            {loading ? 'กำลังบันทึก…' : `เริ่มจับเวลา · ${selected || '—'}`}
          </button>
        </>
      }
    >
      <label className="label mb-3 block">เลือกเครื่องที่ต้องการยืม</label>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {available.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setSelected(m); setError('') }}
            className={[
              'rounded-xl p-3 min-h-[80px] flex flex-col justify-center items-start text-left',
              'transition-all duration-150 active:scale-[.99]',
              selected === m
                ? 'bg-accent text-accent-ink border border-transparent'
                : 'bg-surface border border-dashed border-border hover:border-light/40',
            ].join(' ')}
          >
            <div className="text-[10px] uppercase tracking-[0.08em] font-semibold opacity-65">{m.replace(/\d+$/, '')}</div>
            <div className="font-mono tabular-nums text-2xl font-bold leading-none mt-1">
              {m.replace(/^\D+/, '')}
            </div>
          </button>
        ))}
        {available.length === 0 && (
          <div className="col-span-4 pill-warn pill">เครื่องเต็มทุกตัวแล้ว</div>
        )}
      </div>

      <div className="bg-panel rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-muted shrink-0">เลขที่</span>
          <input
            type="number"
            min="1"
            value={number}
            onChange={e => setNumber(e.target.value === '' ? '' : Number(e.target.value))}
            className="input-field font-mono font-semibold text-right h-9 w-28 px-3"
          />
        </div>
        <div className="flex justify-between items-center gap-4">
          <span className="text-sm text-muted shrink-0">เวลาเริ่ม</span>
          <input
            value={borrowAt}
            onChange={e => { setBorrowAt(e.target.value); setError('') }}
            placeholder="HH.MM"
            className="input-field font-mono font-semibold text-right h-9 w-28 px-3"
          />
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted">อัตรา</span>
          <span className="font-mono font-semibold">฿1 / นาที</span>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-accent2">{error}</p>}
    </ModalShell>
  )
}
