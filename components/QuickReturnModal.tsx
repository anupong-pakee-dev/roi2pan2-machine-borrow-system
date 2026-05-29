'use client'
import { useState } from 'react'
import ModalShell from './ModalShell'
import { fmtClock, minutesBetween } from '@/lib/format'
import DenomPicker from './DenomPicker'

interface BorrowingRecord {
  id: string
  number: number
  machine: string
  borrowAt: string
  reports?: string | null
}

interface Props {
  record:       BorrowingRecord
  machineList:  string[]
  busyMachines: string[]
  onClose:   () => void
  onDone:    () => void
  onDeleted: () => void
}

type PayMethod = 'cash' | 'coupon' | 'debt'

/**
 * Quick Return — POS sheet for closing a session in one tap.
 * PATCHes /api/records/:id with returnAt, minutes, baht, coupon, debt, change.
 */
export default function QuickReturnModal({ record, machineList, busyMachines, onClose, onDone, onDeleted }: Props) {
  const [returnAt,   setReturnAt]   = useState<string>(fmtClock(new Date()))
  const [payMethod,  setPayMethod]  = useState<PayMethod>('cash')
  const [paid,       setPaid]       = useState<number[]>([])
  const [reports,    setReports]    = useState<string>(record.reports || '')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // Machine swap state
  const [swapOpen,    setSwapOpen]    = useState(false)
  const [curMachine,  setCurMachine]  = useState(record.machine)
  const [swapping,    setSwapping]    = useState(false)

  // Delete state
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  // Machines available for swap: all idle except the current one
  const swapCandidates = machineList.filter(
    m => m !== curMachine && !busyMachines.includes(m)
  )

  const minutes    = minutesBetween(record.borrowAt, returnAt)
  const baht       = minutes
  const paidTotal  = paid.reduce((s, v) => s + v, 0)
  const debt       = payMethod === 'debt'   ? baht
                   : payMethod === 'coupon' ? Math.max(0, baht - paidTotal)
                   : 0
  const change     = (payMethod === 'cash' || payMethod === 'coupon')
                   ? Math.max(0, paidTotal - baht) : 0
  const effectiveCoupon = payMethod === 'coupon' ? paidTotal : 0

  function switchPayMethod(m: PayMethod) {
    setPayMethod(m)
    setPaid([])
  }

  async function confirm() {
    if (minutes <= 0) return setError('เวลาคืนต้องหลังจากเวลายืม')
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnAt, minutes, baht,
          coupon: effectiveCoupon, debt, change,
          reports: reports.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'บันทึกไม่สำเร็จ'); return }
      onDone()
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setLoading(false)
    }
  }

  async function swapMachine(newMachine: string) {
    setSwapping(true)
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine: newMachine }),
      })
      if (res.ok) { setCurMachine(newMachine); setSwapOpen(false) }
      else setError('เปลี่ยนเครื่องไม่สำเร็จ')
    } catch { setError('เกิดข้อผิดพลาด') }
    finally { setSwapping(false) }
  }

  async function deleteRecord() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/records/${record.id}`, { method: 'DELETE' })
      if (res.ok) onDeleted()
      else setError('ลบไม่สำเร็จ')
    } catch { setError('เกิดข้อผิดพลาด') }
    finally { setDeleting(false) }
  }

  return (
    <ModalShell
      title={`คืนเครื่อง · ${curMachine}`}
      width="640px"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button onClick={confirm} disabled={loading} className="btn-primary btn-lg">
            {loading ? 'กำลังบันทึก…' : 'ยืนยันคืน'}
          </button>
        </>
      }
    >
      {/* ── Machine swap ─────────────────────────────── */}
      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted uppercase tracking-[0.08em] font-semibold">เครื่อง</span>
            <span className="pill pill-idle font-mono text-base font-bold">{curMachine}</span>
            {curMachine !== record.machine && (
              <span className="text-[11px] text-muted line-through font-mono">{record.machine}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSwapOpen(o => !o)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold
                       bg-surface border border-border text-muted hover:text-light
                       hover:border-light/30 transition-all"
          >
            🔄 เปลี่ยนเครื่อง
          </button>
        </div>

        {swapOpen && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <p className="text-xs text-muted mb-3">
              เครื่องว่าง {swapCandidates.length} เครื่อง — เลือกเพื่อย้ายทันที
            </p>
            {swapCandidates.length === 0 ? (
              <p className="text-sm text-accent2">ไม่มีเครื่องว่างให้เปลี่ยน</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {swapCandidates.map(m => (
                  <button
                    key={m}
                    type="button"
                    disabled={swapping}
                    onClick={() => swapMachine(m)}
                    className="rounded-xl py-2 px-1 text-center border border-dashed border-border
                               bg-surface hover:border-accent/60 hover:bg-accent/5
                               font-mono font-bold text-sm transition-all disabled:opacity-50"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">เวลายืม</label>
          <input className="input-field font-mono text-2xl font-semibold h-14"
                 value={`${record.borrowAt} น.`} readOnly />
        </div>
        <div>
          <label className="label">เวลาคืน</label>
          <input
            className="input-field font-mono text-2xl font-semibold h-14"
            value={returnAt}
            onChange={e => setReturnAt(e.target.value)}
            placeholder="HH.MM"
          />
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="label">วิธีชำระเงิน</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['cash',   '💵', 'เงินสด'],
            ['coupon', '🎫', 'คูปอง'],
            ['debt',   '📋', 'เชื่อ'],
          ] as [PayMethod, string, string][]).map(([m, icon, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => switchPayMethod(m)}
              className={[
                'flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl border transition-all',
                payMethod === m
                  ? m === 'debt'
                    ? 'bg-accent2/15 border-accent2/50 text-accent2'
                    : 'bg-accent text-accent-ink border-transparent'
                  : 'bg-surface border-border text-muted hover:text-light hover:border-light/30',
              ].join(' ')}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Denomination picker — shown for cash and coupon */}
      {(payMethod === 'cash' || payMethod === 'coupon') && (
        <div>
          <label className="label">
            {payMethod === 'cash' ? 'รับเงิน (เหรียญ/แบงค์)' : 'มูลค่าคูปอง (เหรียญ/แบงค์)'}
          </label>
          <DenomPicker value={paid} onChange={setPaid} />
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="label">หมายเหตุ (ไม่บังคับ)</label>
        <input
          className="input-field"
          value={reports}
          onChange={e => setReports(e.target.value)}
          placeholder="เช่น แก้คูปองให้ลูกค้า"
        />
      </div>

      {/* Calculator */}
      <div className="mt-2 p-4 sm:p-5 bg-panel rounded-xl space-y-1">
        <Row label="เวลาใช้งาน" value={`${minutes} นาที`} />
        <Row label="ค่าเครื่อง (฿1/นาที)" value={`฿${baht}`} />
        {payMethod === 'cash'   && paidTotal > 0 && <Row label="รับเงิน" value={`฿${paidTotal}`} />}
        {payMethod === 'coupon' && paidTotal > 0 && <Row label="คูปอง" value={`฿${paidTotal}`} />}
        <div className="border-t-2 border-light mt-2 pt-3 flex justify-between items-baseline">
          <span className="font-semibold">
            {payMethod === 'debt' ? 'บันทึกเป็นหนี้'
            : payMethod === 'cash'
              ? paidTotal === 0             ? 'ค่าเครื่อง'
              : change > 0                  ? 'เงินทอน'
              : paidTotal < baht            ? 'ขาดอีก'
              :                               'พอดี'
            : debt > 0                    ? 'ค้างจ่ายเพิ่ม'
            : change > 0                  ? 'เงินทอน'
            :                               'พอดี'}
          </span>
          <span className={[
            'font-mono tabular-nums font-bold text-3xl',
            payMethod === 'debt'                         ? 'text-accent2'   : '',
            payMethod === 'cash' && paidTotal === 0      ? ''               : '',
            payMethod === 'cash' && change > 0           ? 'text-green-500' : '',
            payMethod === 'cash' && paidTotal < baht && paidTotal > 0 ? 'text-amber-400' : '',
            payMethod === 'coupon' && debt > 0           ? 'text-accent2'   : '',
            payMethod === 'coupon' && change > 0         ? 'text-green-500' : '',
          ].join(' ')}>
            {payMethod === 'debt'   ? `฿${baht}`
            : payMethod === 'cash'
              ? paidTotal === 0     ? `฿${baht}`
              : change > 0         ? `฿${change}`
              : paidTotal < baht   ? `฿${baht - paidTotal}`
              :                      `฿0`
            : `฿${debt > 0 ? debt : change}`}
          </span>
        </div>
      </div>

      {/* ── Delete record ──────────────────────────────────────── */}
      <div className="pt-3 mt-1 border-t border-border/40">
        {!confirmDel ? (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl
                       border border-dashed border-accent2/40 text-accent2/60
                       hover:border-accent2/70 hover:text-accent2 hover:bg-accent2/5
                       text-sm font-medium transition-all"
          >
            🗑&ensp;ลบรายการนี้
          </button>
        ) : (
          <div className="rounded-xl bg-accent2/5 border border-accent2/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-accent2 text-center">
              ยืนยันลบรายการ&nbsp;#{record.number}?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmDel(false)}
                className="h-11 rounded-xl text-sm font-semibold
                           bg-surface border border-border text-light
                           hover:bg-panel transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={deleteRecord}
                className="h-11 rounded-xl text-sm font-bold
                           bg-accent2 text-white
                           hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {deleting ? '…' : '🗑 ลบเลย'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-accent2">{error}</p>}
    </ModalShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-1">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-mono font-semibold text-lg">{value}</span>
    </div>
  )
}
