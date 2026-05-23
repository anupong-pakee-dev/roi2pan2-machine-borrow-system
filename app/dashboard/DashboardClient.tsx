'use client'
import { useState, useMemo, useCallback, useRef, memo } from 'react'
import { useRouter } from 'next/navigation'
import ThaiDatePicker from '@/components/ThaiDatePicker'

interface Record {
  id: string
  number: number
  machine: string
  borrowAt: string
  returnAt: string
  status: string
  minutes: number
  baht: number
  coupon: number
  debt: number
  change: number
  reports: string | null
  createdAt: Date | string
}

interface Props {
  records: Record[]
  role: string
  machineList: string[]
}

function toDateStr(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'buddhist' } as Intl.DateTimeFormatOptions)
}

function toISODate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  const thaiOffset = 7 * 60
  const localTime = new Date(date.getTime() + thaiOffset * 60 * 1000)
  return localTime.toISOString().slice(0, 10)
}

function todayISO() {
  const now = new Date()
  const thaiOffset = 7 * 60
  const localTime = new Date(now.getTime() + thaiOffset * 60 * 1000)
  return localTime.toISOString().slice(0, 10)
}

function parseTime(t: string): number {
  const [h, m] = t.split('.').map(Number)
  return (h || 0) * 60 + (m || 0)
}

type PayMethod = 'baht' | 'coupon' | 'debt'
const PAY_OPTIONS: { value: PayMethod; label: string; color: string }[] = [
  { value: 'baht',   label: '💵 เงินสด',  color: 'text-green-400'  },
  { value: 'coupon', label: '🎟 คูปอง',   color: 'text-yellow-400' },
  { value: 'debt',   label: '📌 ยอดค้าง', color: 'text-red-400'    },
]

function nowThaiHHmm() {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
  return now.toISOString().slice(11, 16).replace(':', '.')
}

// ============================================================
// ⚡ QUICK RETURN MODAL (ใหม่) — คืนได้โดยไม่ต้องเปิดหน้าใหม่
// ============================================================
function QuickReturnModal({
  record,
  onClose,
  onSuccess,
}: {
  record: Record
  onClose: () => void
  onSuccess: (id: string) => void
}) {
  const [payMethod, setPayMethod]   = useState<PayMethod>('baht')
  const [paidAmount, setPaidAmount] = useState('')
  const [reports, setReports]       = useState(record.reports || '')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [done, setDone]             = useState(false)
  const [previewMinutes, setPreviewMinutes] = useState(() => {
    const start = parseTime(record.borrowAt)
    const end   = parseTime(nowThaiHHmm())
    let mins = end - start
    if (mins < 0) mins += 24 * 60
    return mins
  })

  // อัปเดต preview ทุก 30 วิ
  useState(() => {
    const id = setInterval(() => {
      const start = parseTime(record.borrowAt)
      const end   = parseTime(nowThaiHHmm())
      let mins = end - start
      if (mins < 0) mins += 24 * 60
      setPreviewMinutes(mins)
    }, 30000)
    return () => clearInterval(id)
  })

  const paid = parseInt(paidAmount) || 0

  function calcSv(baht: number) {
    if (payMethod === 'debt') return { coupon: 0, debt: baht, change: 0 }
    if (payMethod === 'coupon') return { coupon: paid, debt: paid < baht ? baht - paid : 0, change: paid > baht ? paid - baht : 0 }
    return { coupon: 0, debt: paid < baht ? baht - paid : 0, change: paid > baht ? paid - baht : 0 }
  }

  const sv = calcSv(previewMinutes)

  async function handleSubmit() {
    setError('')
    if ((payMethod === 'baht' || payMethod === 'coupon') && !paidAmount)
      return setError('กรุณากรอกจำนวนเงิน')

    // snap เวลา ณ ตอนกดบันทึก
    const snapTime    = nowThaiHHmm()
    const start       = parseTime(record.borrowAt)
    const end         = parseTime(snapTime)
    let snapMinutes   = end - start
    if (snapMinutes < 0) snapMinutes += 24 * 60
    if (snapMinutes <= 0) return setError('เวลาคืนต้องหลังจากเวลายืม')
    const snapSv = calcSv(snapMinutes)

    setLoading(true)
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnAt: snapTime,
          minutes:  snapMinutes,
          baht:     snapMinutes,
          coupon:   snapSv.coupon,
          debt:     snapSv.debt,
          change:   snapSv.change,
          reports:  reports.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'บันทึกไม่สำเร็จ')
      } else {
        setDone(true)
        setTimeout(() => onSuccess(record.id), 900)
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-lg">⚡</span>
            <span className="font-display font-semibold text-light">คืนด่วน</span>
            <span className="px-2 py-0.5 rounded-lg bg-panel border border-border text-xs font-mono text-accent">#{record.number}</span>
            <span className="px-2 py-0.5 rounded-lg bg-panel border border-border text-xs font-mono">{record.machine}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-panel border border-border text-muted hover:text-light flex items-center justify-center transition-colors">✕</button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-2xl">✓</div>
            <p className="font-semibold text-green-400">บันทึกสำเร็จ!</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* ข้อมูลยืม + preview เวลาปัจจุบัน */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-panel border border-border text-sm">
              <div>
                <p className="text-xs text-muted mb-0.5">ยืมเมื่อ</p>
                <p className="font-mono text-light">{record.borrowAt.replace('.', ':')}</p>
              </div>
              <span className="text-muted">→</span>
              <div>
                <p className="text-xs text-muted mb-0.5">คืน (ตอนกดบันทึก)</p>
                <p className="font-mono text-yellow-400">⏰ ปัจจุบัน</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted mb-0.5">ประมาณ</p>
                <p className="text-blue-400 font-bold font-display">{previewMinutes} <span className="text-xs font-normal text-muted">นาที</span></p>
                <p className="text-green-400 font-bold font-display text-sm">{previewMinutes} <span className="text-xs font-normal text-muted">บาท</span></p>
              </div>
            </div>

            {/* วิธีชำระ — ปุ่ม 3 ปุ่ม (เร็วกว่า dropdown) */}
            <div>
              <label className="label">วิธีชำระ</label>
              <div className="grid grid-cols-3 gap-2">
                {PAY_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => { setPayMethod(p.value); setPaidAmount('') }}
                    className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                      payMethod === p.value
                        ? `bg-accent/15 border-accent/50 ${p.color}`
                        : 'bg-panel border-border text-muted hover:text-light'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ช่องเงิน */}
            {(payMethod === 'baht' || payMethod === 'coupon') && (
              <div>
                <label className="label">
                  {payMethod === 'baht' ? 'เงินที่รับมา (บาท)' : 'มูลค่าคูปอง (บาท)'}
                  <span className="text-accent"> *</span>
                </label>
                <input
                  className="input-field font-mono text-lg"
                  type="number" min="0"
                  placeholder={payMethod === 'baht' ? `เช่น ${previewMinutes}` : `เช่น ${previewMinutes}`}
                  value={paidAmount}
                  onChange={e => { setPaidAmount(e.target.value); setError('') }}
                />
              </div>
            )}

            {/* สรุปเงินทอน / ค้าง */}
            {previewMinutes > 0 && payMethod !== 'debt' && paid > 0 && (
              <div className={`rounded-xl border p-3 text-center ${
                sv.change > 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                sv.debt > 0   ? 'bg-red-500/10 border-red-500/30' :
                                'bg-green-500/10 border-green-500/30'
              }`}>
                {sv.change > 0 ? (
                  <><p className="text-xs text-yellow-400">💵 เงินทอน</p><p className="text-2xl font-bold font-display text-yellow-400">{sv.change} บาท</p></>
                ) : sv.debt > 0 ? (
                  <><p className="text-xs text-red-400">📌 ขาดอีก</p><p className="text-2xl font-bold font-display text-red-400">{sv.debt} บาท</p></>
                ) : (
                  <p className="text-green-400 font-semibold">✓ ชำระครบ</p>
                )}
              </div>
            )}
            {previewMinutes > 0 && payMethod === 'debt' && (
              <div className="rounded-xl border bg-red-500/10 border-red-500/30 p-3 text-center">
                <p className="text-xs text-red-400">📌 ยอดค้าง</p>
                <p className="text-2xl font-bold font-display text-red-400">{previewMinutes} บาท</p>
              </div>
            )}

            {/* หมายเหตุ (ย่อ) */}
            <input
              className="input-field text-sm"
              placeholder="หมายเหตุ (ถ้ามี)"
              value={reports}
              onChange={e => setReports(e.target.value)}
            />

            {error && (
              <p className="text-accent2 text-sm flex items-center gap-1.5">
                <span>⚠</span>{error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">ยกเลิก</button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex-2 flex-1 text-sm py-2.5 flex items-center justify-center gap-2 font-semibold"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : '⚡'}
                {loading ? 'กำลังบันทึก...' : 'บันทึกเลย'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// ⚡ QUICK BORROW PANEL (ใหม่) — ยืมด่วนโดยไม่ต้องเปิดหน้าใหม่
// ============================================================
function QuickBorrowPanel({
  nextNumber,
  borrowingMachines,
  machineList,
  onSuccess,
}: {
  nextNumber: number
  borrowingMachines: string[]
  machineList: string[]
  onSuccess: (record: Record) => void
}) {
  function nowThaiTime() {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
    return now.toISOString().slice(11, 16)
  }

  const [open, setOpen]           = useState(false)
  const [number, setNumber]       = useState(String(nextNumber))
  const [machine, setMachine]     = useState('')
  const [borrowAt, setBorrowAt]   = useState(() => nowThaiTime())
  const [reports, setReports]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)

  const availableMachines = machineList.filter(m => !borrowingMachines.includes(m))

  async function handleSubmit() {
    setError('')
    if (!machine)  return setError('กรุณาเลือกเครื่อง')
    if (!borrowAt) return setError('กรุณาระบุเวลายืม')

    setLoading(true)
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number:   parseInt(number) || nextNumber,
          machine,
          borrowAt: borrowAt.replace(':', '.'),
          status:   'borrowing',
          reports:  reports.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'บันทึกไม่สำเร็จ')
      } else {
        setDone(true)
        onSuccess(data)
        setTimeout(() => {
          setDone(false)
          setNumber(String(nextNumber + 1))
          setMachine('')
          setReports('')
          setOpen(false)
        }, 1200)
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header — คลิกเพื่อพับ/กาง */}
      <button
        onClick={() => { if (!open) setBorrowAt(nowThaiTime()); setOpen(v => !v) }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-panel/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">⚡</span>
          <span className="font-display font-semibold text-light text-sm">ยืมด่วน</span>
          <span className="text-xs text-muted">(ไม่ต้องเปิดหน้าใหม่)</span>
        </div>
        <svg
          width="16" height="16" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2}
          className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4">
          {done ? (
            <div className="flex items-center justify-center gap-2 py-4 text-blue-400 font-semibold">
              <span>⏳</span> บันทึกการยืมแล้ว!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              {/* เลขที่ */}
              <div>
                <label className="label text-xs">เลขที่</label>
                <input
                  className="input-field font-mono py-2 text-sm"
                  type="number"
                  onChange={e => { setNumber(e.target.value); setError('') }}
                />
              </div>
              {/* เครื่อง */}
              <div>
                <label className="label text-xs">เครื่อง <span className="text-accent">*</span></label>
                <select
                  className="input-field font-mono py-2 text-sm"
                  value={machine}
                  onChange={e => { setMachine(e.target.value); setError('') }}
                >
                  <option value="">-- เลือก --</option>
                  {availableMachines.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              {/* เวลา */}
              <div>
                <label className="label text-xs">เวลายืม <span className="text-accent">*</span></label>
                <input
                  className="input-field font-mono py-2 text-sm"
                  type="time"
                  value={borrowAt}
                  onChange={e => { setBorrowAt(e.target.value); setError('') }}
                />
              </div>
              {/* ปุ่มบันทึก */}
              <div className="flex flex-col gap-2">
                {error && <p className="text-accent2 text-xs">{error}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary text-sm py-2 flex items-center justify-center gap-1.5 font-semibold"
                >
                  {loading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : '⚡'}
                  {loading ? '' : 'บันทึกยืม'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---- Confirm Dialog ----
function ConfirmDialog({ record, onConfirm, onCancel, loading }: {
  record: Record
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent2/15 border border-accent2/30 flex items-center justify-center text-accent2 shrink-0">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-light text-sm">ยืนยันการลบ</p>
            <p className="text-xs text-muted mt-0.5">รายการนี้จะถูกลบถาวร ไม่สามารถกู้คืนได้</p>
          </div>
        </div>
        <div className="bg-panel rounded-xl p-3 mb-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">เลขที่</span>
            <span className="font-mono text-accent font-semibold">#{record.number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">เครื่อง</span>
            <span className="font-mono text-light">{record.machine}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">ยืมเมื่อ</span>
            <span className="font-mono text-light">{record.borrowAt}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="btn-secondary flex-1 text-sm py-2">ยกเลิก</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1 text-sm py-2 flex items-center justify-center gap-2">
            {loading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
            {loading ? 'กำลังลบ...' : 'ลบรายการ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Stat Card ----
function StatCard({ label, value, unit, icon, color }: {
  label: string; value: number; unit: string; icon: string; color: string
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3 sm:p-5 flex flex-col gap-1">
      <span className="text-lg">{icon}</span>
      <p className={`text-xl sm:text-2xl font-display font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-muted">{unit}</p>
      <p className="text-xs text-muted/60">{label}</p>
    </div>
  )
}

// ---- Borrowing Card ----
function BorrowingCard({ record, onDelete, canDelete, canChangeMachine, router, borrowingMachines, machineList, onMachineChanged, onQuickReturn }: {
  record: Record
  onDelete: (r: Record) => void
  canDelete: boolean
  canChangeMachine: boolean
  router: ReturnType<typeof useRouter>
  borrowingMachines: string[]
  machineList: string[]
  onMachineChanged: (id: string, newMachine: string) => void
  onQuickReturn: (r: Record) => void  // ⚡ ใหม่
}) {
  const [showChangeMachine, setShowChangeMachine] = useState(false)
  const [selectedMachine, setSelectedMachine]     = useState('')
  const [changing, setChanging]                   = useState(false)
  const [changeError, setChangeError]             = useState('')

  const availableMachines = machineList.filter(
    m => m !== record.machine && !borrowingMachines.includes(m)
  )

  async function handleChangeMachine() {
    if (!selectedMachine) return
    setChanging(true)
    setChangeError('')
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine: selectedMachine }),
      })
      const data = await res.json()
      if (!res.ok) {
        setChangeError(data.error || 'เปลี่ยนเครื่องไม่สำเร็จ')
      } else {
        onMachineChanged(record.id, selectedMachine)
        setShowChangeMachine(false)
        setSelectedMachine('')
      }
    } catch {
      setChangeError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="bg-blue-500/5 border border-blue-500/30 rounded-xl p-4 space-y-3 relative overflow-hidden">
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
        </span>
        <span className="text-xs text-blue-400 font-medium">กำลังยืม</span>
      </div>

      <div className="flex items-center gap-2 pr-20">
        <span className="text-accent font-display font-bold text-lg">#{record.number}</span>
        <span className="px-2 py-0.5 rounded-lg bg-panel border border-border text-xs font-mono">{record.machine}</span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted text-xs">ยืมเมื่อ</span>
        <span className="font-mono text-light">{record.borrowAt.replace('.', ':')}</span>
        {record.reports && <span className="text-muted text-xs truncate ml-2">{record.reports}</span>}
      </div>

      {canChangeMachine && showChangeMachine && (
        <div className="bg-panel border border-border rounded-xl p-3 space-y-2">
          <p className="text-xs text-muted font-medium">🔄 เลือกเครื่องใหม่</p>
          {availableMachines.length === 0 ? (
            <p className="text-xs text-accent2">ไม่มีเครื่องว่างในขณะนี้</p>
          ) : (
            <div className="flex gap-2">
              <select
                className="input-field font-mono text-sm flex-1 py-1.5"
                value={selectedMachine}
                onChange={e => { setSelectedMachine(e.target.value); setChangeError('') }}
              >
                <option value="">-- เลือกเครื่อง --</option>
                {availableMachines.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={handleChangeMachine}
                disabled={!selectedMachine || changing}
                className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {changing ? (
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : '✓'}
                {changing ? '' : 'ยืนยัน'}
              </button>
            </div>
          )}
          {changeError && <p className="text-xs text-accent2">{changeError}</p>}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {/* ⚡ ปุ่มคืนด่วน (ใหม่) */}
        <button
          onClick={() => onQuickReturn(record)}
          className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1.5 font-semibold"
        >
          ⚡ คืนด่วน
        </button>
        {/* ปุ่มเดิม — บันทึกการคืน (เต็มหน้า) */}
        <button
          onClick={() => router.push(`/return?id=${record.id}`)}
          className="btn-secondary px-3 py-2 text-xs flex items-center justify-center gap-1"
          title="บันทึกการคืน (แบบเต็ม)"
        >
          ✅
        </button>
        {canChangeMachine && (
          <button
            onClick={() => { setShowChangeMachine(v => !v); setChangeError(''); setSelectedMachine('') }}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
              showChangeMachine
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'bg-panel border-border text-muted hover:text-light hover:border-accent/30'
            }`}
            title="เปลี่ยนเครื่อง"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(record)}
            className="w-9 h-9 rounded-lg bg-accent2/10 border border-accent2/20 text-accent2 flex items-center justify-center hover:bg-accent2/20 transition-colors"
            title="ลบรายการ"
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Filter Panel (self-contained, ไม่ re-render parent ทุกตัวอักษร) ----
interface FilterState {
  machine: string
  payMethod: string
  search: string
}

const FilterPanel = memo(function FilterPanel({
  machines, onFilterChange, resultCount, totalCount,
}: {
  machines: string[]
  onFilterChange: (f: FilterState) => void
  resultCount: number
  totalCount: number
}) {
  const [machine,   setMachine]   = useState('')
  const [payMethod, setPayMethod] = useState('')
  const [search,    setSearch]    = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function applyMachine(v: string) {
    setMachine(v)
    onFilterChange({ machine: v, payMethod, search })
  }
  function applyPay(v: string) {
    setPayMethod(v)
    onFilterChange({ machine, payMethod: v, search })
  }
  function applySearch(v: string) {
    setSearch(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onFilterChange({ machine, payMethod, search: v })
    }, 200)
  }
  function clearAll() {
    setMachine(''); setPayMethod(''); setSearch('')
    onFilterChange({ machine: '', payMethod: '', search: '' })
  }

  const activeCount = [machine, payMethod, search].filter(Boolean).length

  return (
    <div className="bg-panel border border-border rounded-xl p-3 space-y-3">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          className="input-field text-sm py-2 pl-9"
          placeholder="ค้นหาเลขที่ / หมายเหตุ..."
          value={search}
          onChange={e => applySearch(e.target.value)}
        />
      </div>

      {/* Machine chips */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-muted uppercase tracking-wider">เครื่อง</p>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => applyMachine('')} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${!machine ? 'bg-accent text-ink border-accent' : 'bg-panel border-border text-muted hover:text-light hover:border-muted'}`}>
            ทุกเครื่อง
          </button>
          {machines.map(m => (
            <button key={m} onClick={() => applyMachine(machine === m ? '' : m)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${machine === m ? 'bg-accent text-ink border-accent' : 'bg-panel border-border text-muted hover:text-light hover:border-muted'}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Pay method chips */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium text-muted uppercase tracking-wider">วิธีชำระ</p>
        <div className="flex flex-wrap gap-1.5">
          {([
            { value: '', label: 'ทั้งหมด', active: 'bg-accent text-ink border-accent' },
            { value: 'baht',   label: '💵 เงินสด',  active: 'bg-green-500/20 text-green-400 border-green-500/40' },
            { value: 'coupon', label: '🎟 คูปอง',   active: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
            { value: 'debt',   label: '📌 ยอดค้าง', active: 'bg-accent2/20 text-accent2 border-accent2/40' },
          ] as { value: string; label: string; active: string }[]).map(opt => (
            <button key={opt.value} onClick={() => applyPay(opt.value)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${payMethod === opt.value ? opt.active : 'bg-panel border-border text-muted hover:text-light hover:border-muted'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count + clear */}
      {activeCount > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="text-xs text-muted">แสดง {resultCount} / {totalCount} รายการ</span>
          <button onClick={clearAll} className="text-xs text-muted hover:text-light transition-colors px-2 py-1 rounded-lg hover:bg-surface">
            ล้างทั้งหมด ✕
          </button>
        </div>
      )}
    </div>
  )
})

// ---- Borrow Search Bar (self-contained) ----
const BorrowSearchBar = memo(function BorrowSearchBar({
  onSearch,
}: {
  onSearch: (q: string) => void
}) {
  const [value, setValue] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(v: string) {
    setValue(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSearch(v), 150)
  }

  return (
    <div className="relative flex-1 min-w-[160px] max-w-xs">
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted w-3.5 h-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
      <input
        className="input-field text-sm py-1.5 pl-8 pr-8"
        placeholder="ค้นหาเลขที่ / เครื่อง..."
        value={value}
        onChange={e => handleChange(e.target.value)}
      />
      {value && (
        <button onClick={() => { setValue(''); onSearch('') }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-light transition-colors">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
})

// ---- Main Dashboard ----
export default function DashboardClient({ records: initialRecords, role, machineList }: Props) {
  const router = useRouter()
  const [records, setRecords]             = useState(initialRecords)
  const [viewMode, setViewMode]           = useState<'today' | 'date' | 'all'>('today')
  const [selectedDate, setSelectedDate]   = useState(todayISO())
  const [filters, setFilters]             = useState<FilterState>({ machine: '', payMethod: '', search: '' })
  const [borrowSearch, setBorrowSearch]   = useState('')
  const handleFilterChange  = useCallback((f: FilterState) => setFilters(f), [])
  const handleBorrowSearch  = useCallback((q: string) => setBorrowSearch(q), [])
  const [confirmTarget, setConfirmTarget] = useState<Record | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [quickReturnTarget, setQuickReturnTarget] = useState<Record | null>(null)  // ⚡ ใหม่

  const today = todayISO()

  const borrowingRecords = useMemo(() =>
    records.filter(r => r.status === 'borrowing'),
    [records]
  )

  const completedRecords = useMemo(() =>
    records.filter(r => r.status !== 'borrowing'),
    [records]
  )

  const todayCompleted = useMemo(() =>
    completedRecords.filter(r => toISODate(r.createdAt) === today),
    [completedRecords, today]
  )

  const dateCompleted = useMemo(() =>
    completedRecords.filter(r => toISODate(r.createdAt) === selectedDate),
    [completedRecords, selectedDate]
  )

  const allMachines = useMemo(() => {
    const s = new Set(completedRecords.map(r => r.machine))
    return Array.from(s).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, '')) || 0
      const nb = parseInt(b.replace(/\D/g, '')) || 0
      return na - nb || a.localeCompare(b)
    })
  }, [completedRecords])

  const baseDisplayed = useMemo(() => {
    if (viewMode === 'today') return todayCompleted
    if (viewMode === 'date')  return dateCompleted
    return completedRecords
  }, [viewMode, todayCompleted, dateCompleted, completedRecords])

  const displayed = useMemo(() => {
    return baseDisplayed.filter(r => {
      if (filters.machine && r.machine !== filters.machine) return false
      if (filters.payMethod === 'baht'   && r.coupon === 0 && r.debt === 0 && r.baht > 0) return true
      if (filters.payMethod === 'coupon' && r.coupon > 0) return true
      if (filters.payMethod === 'debt'   && r.debt > 0) return true
      if (filters.payMethod && !['baht','coupon','debt'].includes(filters.payMethod) === false) {}
      if (filters.payMethod === 'baht' || filters.payMethod === 'coupon' || filters.payMethod === 'debt') {
      } else if (filters.payMethod) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!String(r.number).includes(q) && !(r.reports || '').toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [baseDisplayed, filters])

  const activeFilterCount = [filters.machine, filters.payMethod, filters.search].filter(Boolean).length

  const stats = useMemo(() => {
    const baht  = displayed.reduce((s, r) => s + r.baht, 0)
    const debt  = displayed.reduce((s, r) => s + r.debt, 0)
    return {
      count:   displayed.length,
      minutes: displayed.reduce((s, r) => s + r.minutes, 0),
      baht,
      coupon:  displayed.reduce((s, r) => s + r.coupon, 0),
      debt,
      netBaht: baht - debt,
    }
  }, [displayed])

  async function handleDelete() {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/records/${confirmTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== confirmTarget.id))
        setConfirmTarget(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  function handleMachineChanged(id: string, newMachine: string) {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, machine: newMachine } : r))
  }

  // ⚡ Quick Return สำเร็จ — เอา record ออกจาก borrowing, เพิ่มใน completed
  function handleQuickReturnSuccess(id: string) {
    setRecords(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'completed' } : r
    ))
    setQuickReturnTarget(null)
    router.refresh()
  }

  // ⚡ Quick Borrow สำเร็จ — เพิ่ม record ใหม่เข้า state
  function handleQuickBorrowSuccess(newRecord: Record) {
    setRecords(prev => [newRecord, ...prev])
  }

  const borrowingMachines = useMemo(
    () => borrowingRecords.map(r => r.machine),
    [borrowingRecords]
  )

  const filteredBorrowingRecords = useMemo(() => {
    if (!borrowSearch.trim()) return borrowingRecords
    const q = borrowSearch.toLowerCase()
    return borrowingRecords.filter(r =>
      String(r.number).includes(q) || r.machine.toLowerCase().includes(q)
    )
  }, [borrowingRecords, borrowSearch])

  // nextNumber สำหรับ quick borrow
  const nextNumber = useMemo(() => {
    const nums = records.map(r => r.number).filter(n => n > 0)
    return nums.length > 0 ? Math.max(...nums) + 1 : 1
  }, [records])

  const canDelete = role === 'admin' || role === 'user'
  const canChangeMachine = role === 'admin' || role === 'user'

  function viewLabel() {
    if (viewMode === 'today') return `วันนี้ (${toDateStr(new Date())})`
    if (viewMode === 'date')  return `วันที่ ${toDateStr(new Date(selectedDate + 'T12:00:00'))}`
    return 'ทั้งหมด'
  }

  return (
    <>
      {confirmTarget && (
        <ConfirmDialog
          record={confirmTarget}
          onConfirm={handleDelete}
          onCancel={() => setConfirmTarget(null)}
          loading={deleting}
        />
      )}

      {/* ⚡ Quick Return Modal */}
      {quickReturnTarget && (
        <QuickReturnModal
          record={quickReturnTarget}
          onClose={() => setQuickReturnTarget(null)}
          onSuccess={handleQuickReturnSuccess}
        />
      )}

      {/* ⚡ Quick Borrow Panel */}
      <QuickBorrowPanel
        nextNumber={nextNumber}
        borrowingMachines={borrowingMachines}
        machineList={machineList}
        onSuccess={handleQuickBorrowSuccess}
      />

      {/* ---- รายการกำลังยืม ---- */}
      {borrowingRecords.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-400"></span>
              </span>
              <h2 className="font-display font-semibold text-blue-400 text-sm uppercase tracking-wider">
                กำลังยืม ({filteredBorrowingRecords.length}{filteredBorrowingRecords.length !== borrowingRecords.length ? `/${borrowingRecords.length}` : ''})
              </h2>
            </div>
            <BorrowSearchBar onSearch={handleBorrowSearch} />
          </div>
          {filteredBorrowingRecords.length === 0 ? (
            <div className="card text-center py-8 text-muted text-sm">ไม่พบรายการที่ตรงกับการค้นหา</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBorrowingRecords.map(r => (
                <BorrowingCard
                  key={r.id}
                  record={r}
                  onDelete={setConfirmTarget}
                  canDelete={canDelete}
                  canChangeMachine={canChangeMachine}
                  router={router}
                  borrowingMachines={borrowingMachines}
                  machineList={machineList}
                  onMachineChanged={handleMachineChanged}
                  onQuickReturn={setQuickReturnTarget}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---- Toggle + Date Picker ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-panel border border-border rounded-xl p-1">
          <button
            onClick={() => setViewMode('today')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'today' ? 'bg-accent text-ink' : 'text-muted hover:text-light'
            }`}
          >
            วันนี้
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              viewMode === 'today' ? 'bg-ink/20' : 'bg-border'
            }`}>{todayCompleted.length}</span>
          </button>
          <button
            onClick={() => setViewMode('date')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'date' ? 'bg-accent text-ink' : 'text-muted hover:text-light'
            }`}
          >
            📅 เลือกวัน
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'all' ? 'bg-accent text-ink' : 'text-muted hover:text-light'
            }`}
          >
            ทั้งหมด
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              viewMode === 'all' ? 'bg-ink/20' : 'bg-border'
            }`}>{completedRecords.length}</span>
          </button>
        </div>

        {viewMode === 'date' && (
          <ThaiDatePicker
            value={selectedDate}
            max={today}
            onChange={v => setSelectedDate(v || today)}
            className="w-52"
          />
        )}
      </div>

      <FilterPanel
        machines={allMachines}
        onFilterChange={handleFilterChange}
        resultCount={displayed.length}
        totalCount={baseDisplayed.length}
      />

      {/* ---- Stat Cards ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={viewMode === 'today' ? 'รายการวันนี้' : viewMode === 'date' ? 'รายการวันที่เลือก' : 'รายการทั้งหมด'}
          value={stats.count} unit="รายการ" icon="📋" color="text-accent"
        />
        <StatCard label="ยอดนาทีรวม"  value={stats.minutes}  unit="นาที"  icon="⏱"  color="text-blue-400"   />
        <StatCard label="ยอดบาทรวม"   value={stats.netBaht}  unit="บาท"   icon="💰"  color="text-green-400"  />
        <StatCard label="ยอดคูปองรวม"  value={stats.coupon}   unit="บาท"   icon="🎟"  color="text-yellow-400" />
      </div>

      {stats.debt > 0 && (
        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-accent2/10 border border-accent2/30">
          <span className="text-xl">📌</span>
          <div>
            <p className="text-sm font-semibold text-accent2">
              ยอดค้างสะสม {stats.debt.toLocaleString()} บาท
            </p>
            <p className="text-xs text-muted mt-0.5">{viewLabel()}</p>
          </div>
        </div>
      )}

      {/* ---- Mobile card list ---- */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-light text-sm">{viewLabel()}</h2>
          <span className="text-xs text-muted">{displayed.length} รายการ</span>
        </div>
        {displayed.length === 0 ? (
          <div className="card text-center py-10 text-muted text-sm">
            {activeFilterCount > 0 ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีรายการ'}
          </div>
        ) : displayed.map(r => (
          <div key={r.id} className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-accent font-display font-bold text-lg">#{r.number}</span>
                <span className="px-2 py-0.5 rounded-lg bg-panel border border-border text-xs font-mono">{r.machine}</span>
              </div>
              <div className="flex items-center gap-2">
                {viewMode !== 'today' && (
                  <span className="text-xs text-muted">{toDateStr(r.createdAt)}</span>
                )}
                {canDelete && (
                  <button
                    onClick={() => setConfirmTarget(r)}
                    className="w-7 h-7 rounded-lg bg-accent2/10 border border-accent2/20 text-accent2 flex items-center justify-center hover:bg-accent2/20 transition-colors active:scale-95"
                  >
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted text-xs w-8">ยืม</span>
              <span className="font-mono text-light">{r.borrowAt}</span>
              <span className="text-muted">→</span>
              <span className="text-muted text-xs">คืน</span>
              <span className="font-mono text-light">{r.returnAt}</span>
              <span className="ml-auto text-blue-400 font-medium text-sm">{r.minutes} <span className="text-xs text-muted">นาที</span></span>
            </div>
            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border">
              <div className="text-center">
                <p className="text-green-400 font-bold font-mono">{r.baht}</p>
                <p className="text-[10px] text-muted mt-0.5">บาท</p>
              </div>
              <div className="text-center">
                <p className={`font-bold font-mono ${r.coupon ? 'text-yellow-400' : 'text-muted/30'}`}>{r.coupon || '—'}</p>
                <p className="text-[10px] text-muted mt-0.5">คูปอง</p>
              </div>
              <div className="text-center">
                <p className={`font-bold font-mono ${r.debt ? 'text-accent2' : 'text-muted/30'}`}>{r.debt || '—'}</p>
                <p className="text-[10px] text-muted mt-0.5">ค้าง</p>
              </div>
              <div className="text-center">
                <p className={`font-bold font-mono ${r.change ? 'text-yellow-300' : 'text-muted/30'}`}>{r.change || '—'}</p>
                <p className="text-[10px] text-muted mt-0.5">ทอน</p>
              </div>
            </div>
            {r.reports && (
              <div className="flex items-center gap-3 pt-1 border-t border-border text-xs text-muted">
                <span className="truncate">{r.reports}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ---- Desktop Table ---- */}
      <div className="hidden md:block card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-semibold text-light">{viewLabel()}</h2>
          <span className="text-xs text-muted">{displayed.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {(['เลขที่','เครื่อง','ยืม','คืน','นาที','บาท','คูปอง','ยอดค้าง','เงินทอน','หมายเหตุ',
                  viewMode !== 'today' ? 'วันที่' : null,
                  canDelete ? '' : null,
                ] as (string|null)[]).filter(h => h !== null).map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-muted">
                    {activeFilterCount > 0 ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีรายการ'}
                  </td>
                </tr>
              ) : displayed.map(r => (
                <tr key={r.id} className="table-row group">
                  <td className="px-4 py-3 font-mono text-accent font-semibold">{r.number}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-lg bg-panel border border-border text-xs font-mono">{r.machine}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-light">{r.borrowAt}</td>
                  <td className="px-4 py-3 font-mono text-light">{r.returnAt}</td>
                  <td className="px-4 py-3 text-blue-400 font-medium">{r.minutes}</td>
                  <td className="px-4 py-3 text-green-400 font-medium">{r.baht}</td>
                  <td className="px-4 py-3 text-yellow-400">{r.coupon || '—'}</td>
                  <td className="px-4 py-3 text-accent2 font-medium">{r.debt || '—'}</td>
                  <td className="px-4 py-3 text-yellow-300">{r.change || '—'}</td>
                  <td className="px-4 py-3 text-muted text-xs max-w-[120px] truncate">{r.reports || '—'}</td>
                  {viewMode !== 'today' && (
                    <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{toDateStr(r.createdAt)}</td>
                  )}
                  {canDelete && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmTarget(r)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-accent2/10 border border-accent2/20 text-accent2 flex items-center justify-center hover:bg-accent2/20 transition-all"
                        title="ลบรายการ"
                      >
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {displayed.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-panel/50">
                  <td colSpan={4} className="px-4 py-3 text-xs text-muted font-medium uppercase">รวม</td>
                  <td className="px-4 py-3 text-blue-400 font-bold">{stats.minutes}</td>
                  <td className="px-4 py-3 text-green-400 font-bold">{stats.netBaht.toLocaleString()}</td>
                  <td className="px-4 py-3 text-yellow-400 font-bold">{stats.coupon || '—'}</td>
                  <td className="px-4 py-3 text-accent2 font-bold">{stats.debt || '—'}</td>
                  <td colSpan={canDelete ? (viewMode !== 'today' ? 4 : 3) : (viewMode !== 'today' ? 3 : 2)}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  )
}
