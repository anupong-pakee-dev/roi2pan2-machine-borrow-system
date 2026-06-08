'use client'
import { useState, useMemo } from 'react'

interface RecordRow {
  number: number
  baht: number
  debt: number
  coupon: number
  minutes: number
}

interface RankEntry {
  number: number
  count: number
  totalBaht: number
  totalDebt: number
  totalPaid: number
  totalCoupon: number
  totalMinutes: number
}

function buildRankings(records: RecordRow[]): RankEntry[] {
  const map = new Map<number, RankEntry>()
  for (const r of records) {
    const entry = map.get(r.number) ?? {
      number: r.number, count: 0,
      totalBaht: 0, totalDebt: 0, totalPaid: 0, totalCoupon: 0, totalMinutes: 0,
    }
    entry.count++
    entry.totalBaht    += r.baht
    entry.totalDebt    += r.debt
    entry.totalPaid    += (r.baht - r.debt)
    entry.totalCoupon  += r.coupon
    entry.totalMinutes += r.minutes
    map.set(r.number, entry)
  }
  return Array.from(map.values())
}

function makeCSV(ranking: RankEntry[], tab: 'debt' | 'payment'): void {
  const headers = [
    'อันดับ', 'เลขที่', 'จำนวนครั้ง',
    'ยอดรวม (บาท)', 'จ่ายแล้ว (บาท)', 'หนี้ค้าง (บาท)', 'คูปอง (บาท)', 'นาทีรวม',
  ]
  const rows = ranking.map((e, i) => [
    i + 1, e.number, e.count,
    e.totalBaht, e.totalPaid, e.totalDebt, e.totalCoupon, e.totalMinutes,
  ])
  const csv = '﻿' + [headers, ...rows]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `อันดับ-${tab === 'debt' ? 'หนี้สูงสุด' : 'จ่ายมากสุด'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function RankBadge({ rank }: { rank: number }) {
  const base = 'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold'
  if (rank === 1) return <span className={`${base} bg-yellow-400/25 text-yellow-400`}>1</span>
  if (rank === 2) return <span className={`${base} bg-slate-400/20 text-slate-300`}>2</span>
  if (rank === 3) return <span className={`${base} bg-amber-700/30 text-amber-500`}>3</span>
  return <span className="inline-flex items-center justify-center w-7 h-7 font-mono text-xs text-muted">{rank}</span>
}

const TOP_N = 10

export default function RankingCard({ records }: { records: RecordRow[] }) {
  const [tab, setTab] = useState<'debt' | 'payment'>('debt')
  const [showAll, setShowAll] = useState(false)

  const allEntries = useMemo(() => buildRankings(records), [records])

  const debtRanking = useMemo(
    () => [...allEntries].filter(e => e.totalDebt > 0).sort((a, b) => b.totalDebt - a.totalDebt),
    [allEntries],
  )

  const paymentRanking = useMemo(
    () => [...allEntries].filter(e => e.totalPaid > 0).sort((a, b) => b.totalPaid - a.totalPaid),
    [allEntries],
  )

  const ranking  = tab === 'debt' ? debtRanking : paymentRanking
  const visible  = showAll ? ranking : ranking.slice(0, TOP_N)
  const hasMore  = ranking.length > TOP_N

  if (allEntries.length === 0) return null

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg shrink-0">
          🏆
        </div>
        <div>
          <h2 className="font-display font-semibold text-light">จัดอันดับ</h2>
          <p className="text-xs text-muted mt-0.5">เรียงตามเลขที่ · {allEntries.length} หมายเลข</p>
        </div>
        <button
          onClick={() => makeCSV(ranking, tab)}
          className="ml-auto btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
        >
          ⬇ Export
        </button>
      </div>

      {/* Tabs */}
      <div className="px-5 pt-4">
        <div className="flex gap-1 bg-panel border border-border rounded-xl p-1 mb-4">
          {([
            ['debt',    '💸 หนี้สูงสุด'],
            ['payment', '💳 จ่ายมากสุด'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setTab(k); setShowAll(false) }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === k ? 'bg-accent text-ink' : 'text-muted hover:text-light'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {ranking.length === 0 ? (
        <div className="pb-8 text-center text-muted text-sm">ไม่มีข้อมูล</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-panel">
                  {[
                    { label: 'อันดับ',                        align: 'text-left'  },
                    { label: 'เลขที่',                        align: 'text-left'  },
                    { label: tab === 'debt' ? 'หนี้ค้าง' : 'จ่ายแล้ว', align: 'text-right' },
                    { label: 'ยอดรวม',                       align: 'text-right' },
                    { label: 'ครั้ง',                         align: 'text-right' },
                  ].map(({ label, align }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-[11px] font-semibold text-muted uppercase tracking-[0.08em] whitespace-nowrap ${align}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((e, i) => (
                  <tr key={e.number} className="border-t border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <RankBadge rank={i + 1} />
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-light text-base">
                      {e.number}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${
                      tab === 'debt' ? 'text-accent2' : 'text-green-400'
                    }`}>
                      ฿{(tab === 'debt' ? e.totalDebt : e.totalPaid).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted">
                      ฿{e.totalBaht.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">
                      {e.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore ? (
            <div className="border-t border-border">
              <button
                onClick={() => setShowAll(v => !v)}
                className="w-full py-3 text-sm text-muted hover:text-light transition-colors"
              >
                {showAll ? '▲ แสดงน้อยลง' : `▼ ดูทั้งหมด ${ranking.length} อันดับ`}
              </button>
            </div>
          ) : (
            <div className="h-3" />
          )}
        </>
      )}
    </div>
  )
}
