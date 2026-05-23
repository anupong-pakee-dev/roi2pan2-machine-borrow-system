'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ThaiDatePicker from '@/components/ThaiDatePicker'

interface Props {
  nextNumber: number
  activeMachines: string[]
  machineList: string[]
}

const DEFAULT_MACHINES = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12']

function todayISO() {
  const now = new Date()
  const thaiTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return thaiTime.toISOString().slice(0, 10)
}

function BorrowStep({ nextNumber, activeMachines, machineList }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState('')

  const [machines, setMachines] = useState<string[]>(
    machineList.length > 0 ? machineList : DEFAULT_MACHINES
  )
  const [newMachineName, setNewMachineName] = useState('')
  const [showAddMachine, setShowAddMachine] = useState(false)

  const [form, setForm] = useState({
    number:     String(nextNumber),
    machine:    '',
    borrowAt:   '',
    reports:    '',
    recordDate: todayISO(),
  })

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
    setError('')
  }

  function addMachine() {
    const name = newMachineName.trim().toUpperCase()
    if (!name) return
    if (!machines.includes(name)) {
      setMachines(m => [...m, name].sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, '')) || 0
        const nb = parseInt(b.replace(/\D/g, '')) || 0
        return na - nb || a.localeCompare(b)
      }))
    }
    setNewMachineName('')
    setShowAddMachine(false)
  }

  const isBackdated = form.recordDate !== todayISO()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.machine)  return setError('กรุณาเลือกเครื่อง')
    if (!form.borrowAt) return setError('กรุณาระบุเวลายืม')

    setLoading(true)
    try {
      const customCreatedAt = isBackdated
        ? new Date(`${form.recordDate}T00:00:00+07:00`).toISOString()
        : undefined

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number:          parseInt(form.number),
          machine:         form.machine,
          borrowAt:        form.borrowAt,
          status:          'borrowing',
          reports:         form.reports.trim() || null,
          customCreatedAt,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'บันทึกไม่สำเร็จ')
      } else {
        setSuccess(true)
        setTimeout(() => { router.push('/dashboard'); router.refresh() }, 1500)
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-3xl">⏳</div>
        <h2 className="font-display text-xl font-semibold text-blue-400">บันทึกการยืมแล้ว!</h2>
        <p className="text-muted text-sm">รายการจะแสดงใน Dashboard — กำลังกลับ...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* วันที่บันทึก (ย้อนหลังได้) */}
      <div>
        <label className="label flex items-center gap-2">
          📅 วันที่บันทึก
          {isBackdated && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              ย้อนหลัง
            </span>
          )}
        </label>
        <ThaiDatePicker
          value={form.recordDate}
          max={todayISO()}
          onChange={v => set('recordDate', v)}
          className={isBackdated ? '[&_button]:border-yellow-500/50 [&_button]:text-yellow-300' : ''}
        />
        {isBackdated && (
          <p className="text-xs text-yellow-400/80 mt-1.5">
            ⚠️ กำลังบันทึกข้อมูลย้อนหลัง — {new Date(form.recordDate + 'T12:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', calendar: 'buddhist' } as Intl.DateTimeFormatOptions)}
          </p>
        )}
      </div>

      {/* Row 1: เลขที่ + เครื่อง */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">เลขที่ <span className="text-accent">*</span></label>
          <input
            className="input-field font-mono"
            type="number"
            onChange={e => set('number', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">เครื่อง <span className="text-accent">*</span></label>
          <div className="flex gap-2">
            <select
              className="input-field font-mono flex-1"
              value={form.machine}
              onChange={e => set('machine', e.target.value)}
              required
            >
              <option value="">-- เลือกเครื่อง --</option>
              {machines.map(m => {
                const isBusy = activeMachines.includes(m)
                return (
                  <option key={m} value={m} disabled={isBusy}>
                    {m}{isBusy ? ' 🔴 (กำลังยืม)' : ''}
                  </option>
                )
              })}
            </select>
            <button
              type="button"
              onClick={() => setShowAddMachine(v => !v)}
              className="btn-secondary px-3 text-lg font-bold"
              title="เพิ่มเครื่องใหม่"
            >+</button>
          </div>
          {activeMachines.length > 0 && (
            <p className="text-xs text-muted mt-1.5 flex flex-wrap gap-1 items-center">
              <span>กำลังยืม:</span>
              {activeMachines.map(m => (
                <span key={m} className="px-1.5 py-0.5 rounded bg-accent2/20 text-accent2 font-mono text-[10px]">{m}</span>
              ))}
            </p>
          )}
          {showAddMachine && (
            <div className="flex gap-2 mt-2">
              <input
                className="input-field font-mono flex-1 py-2 text-sm uppercase"
                placeholder="ชื่อเครื่อง เช่น S13"
                value={newMachineName}
                onChange={e => setNewMachineName(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMachine())}
                autoFocus
              />
              <button type="button" onClick={addMachine} className="btn-primary px-4 py-2 text-sm">เพิ่ม</button>
            </div>
          )}
        </div>
      </div>

      {/* เวลายืม */}
      <div>
        <label className="label">เวลายืม <span className="text-accent">*</span></label>
        <input
          className="input-field font-mono text-lg"
          type="time"
          value={form.borrowAt ? form.borrowAt.replace('.', ':') : ''}
          onChange={e => {
            const v = e.target.value
            set('borrowAt', v ? v.replace(':', '.') : '')
          }}
          required
        />
      </div>

      {/* หมายเหตุ */}
      <div>
        <label className="label">หมายเหตุ</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
          value={form.reports}
          onChange={e => set('reports', e.target.value)}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-accent2/10 border border-accent2/30 text-accent2 text-sm">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">ยกเลิก</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              กำลังบันทึก...
            </>
          ) : '⏳ บันทึกการยืม'}
        </button>
      </div>
    </form>
  )
}

export default function RecordForm({ nextNumber, activeMachines, machineList }: Props) {
  return (
    <BorrowStep
      nextNumber={nextNumber}
      activeMachines={activeMachines}
      machineList={machineList}
    />
  )
}
