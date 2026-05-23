'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

function parseTime(t: string): number {
  const [h, m] = t.split('.').map(Number)
  return (h || 0) * 60 + (m || 0)
}

type PayMethod = 'baht' | 'coupon' | 'debt'

const PAY_OPTIONS: { value: PayMethod; label: string; desc: string; color: string }[] = [
  { value: 'baht',   label: '💵 เงินสด',  desc: 'ลูกค้าจ่ายด้วยเงินสด',        color: 'text-green-400'  },
  { value: 'coupon', label: '🎟 คูปอง',   desc: 'ลูกค้าจ่ายด้วยคูปอง',          color: 'text-yellow-400' },
  { value: 'debt',   label: '📌 ยอดค้าง', desc: 'ลูกค้าไม่จ่าย รอสิ้นเดือน',   color: 'text-accent2'    },
]

export default function ReturnForm({ record }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [returnAt, setReturnAt]   = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod>('baht')
  const [paidAmount, setPaidAmount] = useState('')
  const [reports, setReports]     = useState(record.reports || '')

  const [totalMinutes, setTotalMinutes] = useState(0)
  const [totalBaht, setTotalBaht]       = useState(0)

  useEffect(() => {
    if (record.borrowAt && returnAt) {
      const start = parseTime(record.borrowAt)
      const end   = parseTime(returnAt)
      let mins    = end - start
      if (mins < 0) mins += 24 * 60
      setTotalMinutes(mins)
      setTotalBaht(mins) // 1 นาที = 1 บาท
    } else {
      setTotalMinutes(0)
      setTotalBaht(0)
    }
  }, [record.borrowAt, returnAt])

  // ---- คำนวณการชำระ (คูปอง = เงินสดในรูปแบบคูปอง มีเงินทอนได้เหมือนกัน) ----
  function getSubmitValues() {
    const paid = parseInt(paidAmount) || 0
    if (payMethod === 'baht') {
      // เงินสด: คืนเงินทอนถ้าจ่ายมากกว่า, ค้างถ้าจ่ายน้อยกว่า
      const changeOut = paid > totalBaht ? paid - totalBaht : 0
      const debtOut   = paid < totalBaht ? totalBaht - paid : 0
      return { coupon: 0, debt: debtOut, change: changeOut, bahtPaid: paid }
    } else if (payMethod === 'coupon') {
      // คูปอง: ถ้าคูปองเกินค่าบริการ → ทอนเงินสดคืน, ถ้าขาด → ยอดค้าง
      const couponAmt = parseInt(paidAmount) || 0
      const changeOut = couponAmt > totalBaht ? couponAmt - totalBaht : 0
      const debtOut   = couponAmt < totalBaht ? totalBaht - couponAmt : 0
      return { coupon: couponAmt, debt: debtOut, change: changeOut, bahtPaid: 0 }
    } else {
      // ยอดค้าง: ทั้งหมดเป็นหนี้
      return { coupon: 0, debt: totalBaht, change: 0, bahtPaid: 0 }
    }
  }

  const sv   = totalMinutes > 0 ? getSubmitValues() : { coupon: 0, debt: 0, change: 0, bahtPaid: 0 }
  const paid = parseInt(paidAmount) || 0
  const selectedPay = PAY_OPTIONS.find(p => p.value === payMethod)!

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!returnAt) return setError('กรุณาระบุเวลาคืน')
    if (totalMinutes <= 0) return setError('เวลาคืนต้องหลังจากเวลายืม')
    if ((payMethod === 'baht' || payMethod === 'coupon') && !paidAmount)
      return setError('กรุณากรอกจำนวนเงิน')

    setLoading(true)
    try {
      const res = await fetch(`/api/records/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnAt,
          minutes: totalMinutes,
          baht:    totalBaht,
          coupon:  sv.coupon,
          debt:    sv.debt,
          change:  sv.change,   // ✅ แก้ไข: ใช้ sv.change (เงินทอน) ไม่ใช่ sv.bahtPaid
          reports: reports.trim() || null,
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
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-3xl">✓</div>
        <h2 className="font-display text-xl font-semibold text-green-400">บันทึกการคืนสำเร็จ!</h2>
        <p className="text-muted text-sm">กำลังกลับไปหน้า Dashboard...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ข้อมูลการยืม (read-only) */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 space-y-2">
        <p className="text-xs text-blue-400 uppercase tracking-wider font-medium mb-2">ข้อมูลการยืม</p>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-accent font-display font-bold text-lg">#{record.number}</span>
          <span className="px-2 py-0.5 rounded-lg bg-panel border border-border font-mono text-xs">{record.machine}</span>
          <span className="text-muted">ยืมเมื่อ</span>
          <span className="font-mono text-light">{record.borrowAt.replace('.', ':')}</span>
        </div>
      </div>

      {/* เวลาคืน */}
      <div>
        <label className="label">เวลาคืน <span className="text-accent">*</span></label>
        <input
          className="input-field font-mono text-lg"
          type="time"
          value={returnAt ? returnAt.replace('.', ':') : ''}
          onChange={e => {
            const v = e.target.value
            setReturnAt(v ? v.replace(':', '.') : '')
            setError('')
          }}
          required
          autoFocus
        />
      </div>

      {/* ยอดค่าบริการ */}
      {totalMinutes > 0 && (
        <div className="flex items-center gap-4 p-3 sm:p-4 rounded-xl bg-panel border border-border">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-display font-bold text-blue-400">{totalMinutes}</p>
            <p className="text-xs text-muted mt-0.5">นาที</p>
          </div>
          <div className="text-muted text-xl">=</div>
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-display font-bold text-green-400">{totalBaht}</p>
            <p className="text-xs text-muted mt-0.5">บาท</p>
          </div>
          <div className="flex-1 text-right text-xs text-muted">ค่าบริการ 1 นาที = 1 บาท</div>
        </div>
      )}

      {/* วิธีชำระเงิน */}
      <div>
        <label className="label">วิธีชำระเงิน <span className="text-accent">*</span></label>
        <select
          className="input-field"
          value={payMethod}
          onChange={e => {
            setPayMethod(e.target.value as PayMethod)
            setPaidAmount('')
          }}
        >
          {PAY_OPTIONS.map(p => (
            <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
          ))}
        </select>
        <p className={`text-xs mt-1.5 ${selectedPay.color}`}>
          {payMethod === 'baht'   && 'กรอกจำนวนเงินที่ลูกค้าจ่ายมาด้านล่าง'}
          {payMethod === 'coupon' && `คูปองเท่ากับเงินสด — ค่าบริการ ${totalBaht} บาท${totalBaht > 0 ? ` → ทอน ${Math.max(0,(parseInt(paidAmount)||0)-totalBaht)} บาท` : ' (กรอกเวลาก่อน)'}`}
          {payMethod === 'debt'   && `ลูกค้ายังไม่จ่าย ยอดค้าง ${totalBaht} บาท รอจ่ายสิ้นเดือน`}
        </p>
      </div>

      {/* ช่องใส่เงิน */}
      {(payMethod === 'baht' || payMethod === 'coupon') && (
        <div>
          <label className="label">
            {payMethod === 'baht' ? 'จำนวนเงินที่ลูกค้าจ่ายมา (บาท)' : 'จำนวนคูปองที่ลูกค้าจ่ายมา (บาท)'}
            {' '}<span className="text-accent">*</span>
          </label>
          <input
            className="input-field font-mono text-lg"
            type="number"
            min="0"
            placeholder={payMethod === 'baht' ? 'เช่น 50' : `เช่น ${totalBaht}`}
            value={paidAmount}
            onChange={e => { setPaidAmount(e.target.value); setError('') }}
            required
          />
        </div>
      )}

      {/* สรุปการชำระ */}
      {totalMinutes > 0 && (
        <div className={`rounded-xl border p-4 transition-all ${
          payMethod === 'debt'
            ? 'bg-accent2/10 border-accent2/30'
            : sv.change > 0
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : sv.debt > 0
            ? 'bg-accent2/10 border-accent2/30'
            : paid > 0
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-panel border-border'
        }`}>
          <p className="text-xs text-muted uppercase tracking-wider mb-3">สรุปการชำระ</p>
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="text-muted w-24">ค่าบริการ</span>
                <span className="text-light font-mono">{totalBaht} บาท</span>
              </div>
              {payMethod === 'baht' && paid > 0 && (
                <div className="flex gap-2">
                  <span className="text-muted w-24">จ่ายมา</span>
                  <span className="text-green-400 font-mono">{paid} บาท</span>
                </div>
              )}
              {payMethod === 'coupon' && paid > 0 && (
                <div className="flex gap-2">
                  <span className="text-muted w-24">คูปอง</span>
                  <span className="text-yellow-400 font-mono">{paid} บาท</span>
                </div>
              )}
              {payMethod === 'debt' && (
                <div className="flex gap-2">
                  <span className="text-muted w-24">ยอดค้าง</span>
                  <span className="text-accent2 font-mono">{totalBaht} บาท</span>
                </div>
              )}
            </div>

            <div className="text-right min-w-[110px]">
              {payMethod === 'debt' ? (
                <>
                  <p className="text-xs text-accent2 mb-0.5">📌 ยอดค้าง</p>
                  <p className="text-2xl sm:text-3xl font-bold font-display text-accent2">{totalBaht}</p>
                  <p className="text-xs text-muted">บาท</p>
                </>
              ) : payMethod === 'coupon' ? (
                <>
                  {sv.debt > 0 ? (
                    <>
                      <p className="text-xs text-accent2 mb-0.5">📌 ขาดอีก</p>
                      <p className="text-2xl sm:text-3xl font-bold font-display text-accent2">{sv.debt}</p>
                      <p className="text-xs text-muted">บาท</p>
                    </>
                  ) : sv.change > 0 ? (
                    <>
                      <p className="text-xs text-yellow-400 mb-0.5">💵 เงินทอน</p>
                      <p className="text-2xl sm:text-3xl font-bold font-display text-yellow-400">{sv.change}</p>
                      <p className="text-xs text-muted">บาท</p>
                    </>
                  ) : paid > 0 ? (
                    <p className="text-base text-green-400 font-semibold">✓ คูปองพอดี</p>
                  ) : (
                    <p className="text-xs text-muted">รอกรอกมูลค่าคูปอง</p>
                  )}
                </>
              ) : sv.change > 0 ? (
                <>
                  <p className="text-xs text-yellow-400 mb-0.5">💵 เงินทอน</p>
                  <p className="text-2xl sm:text-3xl font-bold font-display text-yellow-400">{sv.change}</p>
                  <p className="text-xs text-muted">บาท</p>
                </>
              ) : sv.debt > 0 ? (
                <>
                  <p className="text-xs text-accent2 mb-0.5">📌 ขาดอีก</p>
                  <p className="text-2xl sm:text-3xl font-bold font-display text-accent2">{sv.debt}</p>
                  <p className="text-xs text-muted">บาท</p>
                </>
              ) : paid > 0 ? (
                <p className="text-base text-green-400 font-semibold">✓ ชำระครบ</p>
              ) : (
                <p className="text-xs text-muted">รอกรอกเงิน</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* หมายเหตุ */}
      <div>
        <label className="label">หมายเหตุ</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
          value={reports}
          onChange={e => setReports(e.target.value)}
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
          ) : '✅ บันทึกการคืน'}
        </button>
      </div>
    </form>
  )
}
