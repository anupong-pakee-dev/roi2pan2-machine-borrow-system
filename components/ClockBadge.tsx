'use client'
import { useEffect, useState } from 'react'
import { fmtClockSec, fmtDateTH } from '@/lib/format'

/** Live clock + date in the navbar (POS-style). */
export default function ClockBadge() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="hidden sm:flex flex-col items-end leading-tight">
      <span className="font-mono font-medium text-light text-base tabular-nums min-w-[72px] text-right">
        {now ? fmtClockSec(now) : '--:--:--'}
      </span>
      <span className="text-[10px] text-muted uppercase tracking-[0.1em]">
        {now ? fmtDateTH(now) : ''}
      </span>
    </div>
  )
}
