'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fmtClock, minutesBetween } from '@/lib/format'
import DenomPicker from '@/components/DenomPicker'

interface BorrowRecord {
  id: string
  number: number
  machine: string
  borrowAt: string
  reports: string | null
  createdAt: string | Date
}

interface Props {
  record: BorrowRecord
}

type PayMethod = 'cash' | 'coupon' | 'debt'

export default function ReturnForm({ record }: Props) {
  const router = useRouter()
  const [returnAt,   setReturnAt]   = useState(fmtClock(new Date()))
  const [payMethod,  setPayMethod]  = useState<PayMethod>('cash')
  const [paid,       setPaid]       = useState<number[]>([])
  const [reports,    setReports]    = useState(record.reports || '')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
      {/* Borrowing summary */}
      <div className="p-4 rounded-2xl bg-panel border border-border flex items-center gap-4 flex-wrap">
        <span className="font-mono text-accent font-bold text-xl">#{record.number}</span>
        <span className="pill pill-idle font-mono">{record.machine}</span>
        <div className="text-sm">
          <span className="text-muted">ยืมเมื่อ </span>
          <span className="font-mono font-semibold">{record.borrowAt} น.</span>
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">เวลายืม</label>
          <input
            className="input-field font-mono text-2xl font-semibold h-14"
            value={`${record.borrowAt} น.`}
            readOnly
          />
        </div>
        <div>
          <label className="label">เวลาคืน <span className="text-accent">*</span></label>
          <input
            className="input-field font-mono text-2xl font-semibold h-14"
            value={returnAt}
            onChange={e => { setReturnAt(e.target.value); setError('') }}
            placeholder="HH.MM"
            required
            autoFocus
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
        <label className="label">หมายเหตุ</label>
        <textarea
          className="input-field"
          rows={2}
          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
          value={reports}
          onChange={e => setReports(e.target.value)}
        />
      </div>

      {/* Calculator panel */}
      <div className="p-4 sm:p-5 bg-panel rounded-2xl space-y-1">
        <Row label="เวลาใช้งาน" value={`${minutes} นาที`} />
        <Row label="ค่าเครื่อง (฿1/นาที)" value={`฿${baht}`} />
        {payMethod === 'cash'   && paidTotal > 0 && <Row label="รับเงิน" value={`฿${paidTotal}`} />}
        {payMethod === 'coupon' && paidTotal > 0 && <Row label="คูปอง" value={`฿${paidTotal}`} />}
        <div className="border-t-2 border-light mt-2 pt-3 flex justify-between items-baseline">
          <span className="font-semibold">
            {payMethod === 'debt' ? 'บันทึกเป็นหนี้'
            : payMethod === 'cash'
              ? paidTotal === 0   ? 'ค่าเครื่อง'
              : change > 0       ? 'เงินทอน'
              : paidTotal < baht ? 'ขาดอีก'
              :                    'พอดี'
            : debt > 0           ? 'ค้างจ่ายเพิ่ม'
            : change > 0         ? 'เงินทอน'
            :                      'พอดี'}
          </span>
          <span className={[
            'font-mono tabular-nums font-bold text-3xl',
            payMethod === 'debt'                                       ? 'text-accent2'   : '',
            payMethod === 'cash' && change > 0                         ? 'text-green-500' : '',
            payMethod === 'cash' && paidTotal > 0 && paidTotal < baht  ? 'text-amber-400' : '',
            payMethod === 'coupon' && debt > 0                         ? 'text-accent2'   : '',
            payMethod === 'coupon' && change > 0                       ? 'text-green-500' : '',
          ].join(' ')}>
            {payMethod === 'debt'   ? `฿${baht}`
            : payMethod === 'cash'
              ? paidTotal === 0    ? `฿${baht}`
              : change > 0        ? `฿${change}`
              : paidTotal < baht  ? `฿${baht - paidTotal}`
              :                     `฿0`
            : `฿${debt > 0 ? debt : change}`}
          </span>
        </div>
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
        <button type="submit" disabled={loading} className="btn-primary btn-lg flex-[2]">
          {loading ? 'กำลังบันทึก…' : 'ยืนยันคืน'}
        </button>
      </div>
    </form>
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
