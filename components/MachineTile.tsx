'use client'
import { useEffect, useState } from 'react'
import { fmtClock, fmtDuration, minutesBetween } from '@/lib/format'

export interface MachineTileData {
  name: string
  status: 'idle' | 'in-use'
  borrowAt?: string       // "HH.MM"
  recordId?: string       // borrowing record id
  number?: number
}

interface Props {
  m: MachineTileData
  onClick?: (m: MachineTileData) => void
}

/**
 * Machine tile — large POS-style tap target.
 * - Idle:   dashed border, plus icon
 * - In-use: filled with accent, live timer + ฿ counter
 */
export default function MachineTile({ m, onClick }: Props) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (m.status !== 'in-use') return
    const t = setInterval(() => setTick(v => v + 1), 1000)
    return () => clearInterval(t)
  }, [m.status])

  const inUse = m.status === 'in-use'
  const elapsed = inUse && m.borrowAt
    ? minutesBetween(m.borrowAt, fmtClock(new Date()))
    : 0
  const warn = inUse && elapsed > 120

  return (
    <button
      type="button"
      onClick={() => onClick?.(m)}
      className={[
        'relative rounded-xl sm:rounded-2xl p-3 sm:p-4 min-h-[130px] sm:min-h-[155px] text-left',
        'flex flex-col justify-between gap-1.5 sm:gap-2 overflow-hidden',
        'transition-all duration-150',
        'hover:-translate-y-0.5 active:scale-[.99]',
        inUse
          ? 'bg-accent text-accent-ink border border-transparent shadow-card'
          : 'bg-surface border border-dashed border-border hover:border-light/40 hover:shadow-card',
        warn ? 'ring-2 ring-yellow-500/60' : '',
      ].join(' ')}
    >
      {/* Top row: status pill */}
      <div className="flex items-center justify-between">
        <span className={[
          'inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full',
          'text-[11px] font-semibold uppercase tracking-[0.06em]',
          inUse ? 'bg-accent-ink/15 text-accent-ink' : 'bg-panel text-muted',
        ].join(' ')}>
          {inUse && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-current opacity-60 animate-ping" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-current" />
            </span>
          )}
          {inUse ? 'Active' : 'ว่าง'}
        </span>

        {/* Record number — top right, visible on all sizes */}
        {inUse && m.number != null && (
          <span className={[
            'font-mono font-semibold text-[13px] leading-none',
            'bg-accent-ink/10 px-2 py-1 rounded-lg',
            'text-accent-ink',
          ].join(' ')}>
            #{m.number}
          </span>
        )}
      </div>

      {/* Machine name — S and number same size */}
      <div className="font-mono font-bold tabular-nums leading-none tracking-tight text-[28px] sm:text-[38px]">
        {m.name}
      </div>

      <div className="flex justify-between items-end">
        {inUse ? (
          <>
            <div>
              <div className={[
                'text-[11px] uppercase tracking-[0.06em]',
                inUse ? 'text-accent-ink/65' : 'text-muted',
              ].join(' ')}>
                เริ่ม {m.borrowAt}
              </div>
              <div className="font-mono tabular-nums font-semibold text-[16px] sm:text-[20px] leading-none mt-0.5">
                {fmtDuration(elapsed)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] sm:text-[11px] text-accent-ink/65 uppercase tracking-[0.06em]">ค่าใช้</div>
              <div className="font-mono tabular-nums font-semibold text-[16px] sm:text-[20px] leading-none mt-0.5">
                ฿{elapsed}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.06em] text-muted">พร้อมใช้งาน</div>
              <div className="font-mono tabular-nums text-[16px] sm:text-[20px] leading-none mt-0.5 text-muted/50">—</div>
            </div>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                 className="text-muted">
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
          </>
        )}
      </div>
    </button>
  )
}
