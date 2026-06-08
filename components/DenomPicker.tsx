'use client'

/** Denomination values in baht */
const DENOMS = [1, 2, 5, 10, 20, 50, 100, 500, 1000]

interface Props {
  /** Array of picked denomination values (accumulated) */
  value: number[]
  onChange: (v: number[]) => void
}

/**
 * POS-style denomination picker.
 * Tap a coin/note to add it; tap a chip to remove one of that value; "ล้าง" to clear.
 */
export default function DenomPicker({ value, onChange }: Props) {
  const total = value.reduce((s, v) => s + v, 0)

  /** Count how many of each denomination have been tapped */
  const counts: Record<number, number> = {}
  for (const v of value) counts[v] = (counts[v] || 0) + 1

  function add(d: number) {
    onChange([...value, d])
  }

  function removeLast(d: number) {
    const arr = [...value]
    const idx = arr.lastIndexOf(d)
    if (idx >= 0) {
      arr.splice(idx, 1)
      onChange(arr)
    }
  }

  return (
    <div className="space-y-3">
      {/* Denomination grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {DENOMS.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => add(d)}
            className={[
              'relative h-11 sm:h-12 rounded-xl border font-mono font-semibold text-sm sm:text-base',
              'transition-all active:scale-95 select-none',
              counts[d]
                ? 'bg-accent/10 border-accent/40 text-accent hover:bg-accent/20'
                : 'bg-surface border-border hover:bg-panel hover:border-light/30 text-light',
            ].join(' ')}
          >
            ฿{d}
            {counts[d] > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full
                           bg-accent text-accent-ink text-[10px] font-bold
                           flex items-center justify-center leading-none pointer-events-none"
              >
                {counts[d]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Breakdown + total row */}
      <div className="flex items-center justify-between bg-panel rounded-xl px-3 sm:px-4 py-3 min-h-[52px] gap-2">
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {DENOMS.filter(d => counts[d] > 0).map(d => (
            <button
              key={d}
              type="button"
              onClick={() => removeLast(d)}
              title="คลิกเพื่อลบ 1 ใบ/เหรียญ"
              className="h-7 px-2.5 rounded-lg bg-accent/15 text-accent
                         text-xs font-mono font-semibold
                         hover:bg-accent2/15 hover:text-accent2 transition-all"
            >
              ฿{d}×{counts[d]}
            </button>
          ))}
          {value.length === 0 && (
            <span className="text-xs text-muted italic">กดเหรียญ/แบงค์เพื่อเพิ่ม</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-muted hover:text-accent2 transition-colors underline"
            >
              ล้าง
            </button>
          )}
          <span className="font-mono font-bold text-xl sm:text-2xl">฿{total}</span>
        </div>
      </div>
    </div>
  )
}
