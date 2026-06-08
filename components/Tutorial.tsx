'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/* ─────────────────────────────────────────────────────────── types ── */

export interface TutorialStep {
  title: string
  body: string
  /** CSS selector of element to spotlight. null = centered card */
  target?: string | null
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

interface SpotRect { x: number; y: number; w: number; h: number }

const PAD     = 10   // spotlight padding px
const TIP_W   = 340  // tooltip width px
const EDGE    = 16   // min distance from screen edge

/* ─────────────────────────────────────────────────────── useTutorial ── */

export function useTutorial(storageKey: string) {
  const [active, setActive] = useState(false)
  const [step,   setStep]   = useState(0)
  const [ready,  setReady]  = useState(false)   // avoid SSR mismatch

  useEffect(() => {
    setReady(true)
    if (!localStorage.getItem(storageKey)) setActive(true)
  }, [storageKey])

  const start  = useCallback(() => { setStep(0); setActive(true) }, [])
  const finish = useCallback(() => {
    localStorage.setItem(storageKey, '1')
    setActive(false)
  }, [storageKey])

  const next = useCallback((total: number) => {
    setStep(s => {
      if (s + 1 >= total) { localStorage.setItem(storageKey, '1'); setActive(false); return s }
      return s + 1
    })
  }, [storageKey])

  const prev = useCallback(() => setStep(s => Math.max(0, s - 1)), [])

  return { active, step, ready, start, finish, next, prev }
}

/* ─────────────────────────────────────────────────── TutorialOverlay ── */

interface OverlayProps {
  steps: TutorialStep[]
  active: boolean
  step: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

export default function TutorialOverlay({ steps, active, step, onNext, onPrev, onSkip }: OverlayProps) {
  const [spot,  setSpot]  = useState<SpotRect | null>(null)
  const [vp,    setVp]    = useState({ w: 1280, h: 800 })
  const rafRef  = useRef<number>()
  const current = steps[step]

  /* viewport size */
  useEffect(() => {
    function resize() { setVp({ w: window.innerWidth, h: window.innerHeight }) }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  /* spotlight tracking */
  useLayoutEffect(() => {
    if (!active || !current?.target) { setSpot(null); return }

    function tick() {
      const el = document.querySelector(current!.target!)
      if (el) {
        const r = el.getBoundingClientRect()
        setSpot({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 })
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, current?.target])

  /* scroll target into view */
  useEffect(() => {
    if (!active || !current?.target) return
    const el = document.querySelector(current.target)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [active, current?.target])

  /* keyboard nav */
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext()
      if (e.key === 'ArrowLeft')                       onPrev()
      if (e.key === 'Escape')                          onSkip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onNext, onPrev, onSkip])

  if (!active || typeof window === 'undefined') return null

  /* ── tooltip placement ── */
  const placement = current.placement ?? (spot ? 'bottom' : 'center')
  let tipStyle: React.CSSProperties

  if (!spot || placement === 'center') {
    tipStyle = {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%,-50%)',
      width: TIP_W,
    }
  } else {
    const cx      = spot.x + spot.w / 2
    const tipLeft = Math.max(EDGE, Math.min(vp.w - TIP_W - EDGE, cx - TIP_W / 2))

    if (placement === 'bottom') {
      let top = spot.y + spot.h + 16
      // flip to top if card overflows bottom
      if (top + 220 > vp.h) top = spot.y - 220 - 16
      tipStyle = { position: 'fixed', top, left: tipLeft, width: TIP_W }
    } else if (placement === 'top') {
      const bottom = vp.h - spot.y + 16
      tipStyle = { position: 'fixed', bottom, left: tipLeft, width: TIP_W }
    } else if (placement === 'right') {
      const top = Math.max(EDGE, spot.y)
      tipStyle = { position: 'fixed', top, left: spot.x + spot.w + 16, width: TIP_W }
    } else {
      const top = Math.max(EDGE, spot.y)
      tipStyle = { position: 'fixed', top, right: vp.w - spot.x + 16, width: TIP_W }
    }
  }

  /* ── render ── */
  const isLast = step === steps.length - 1

  return createPortal(
    <div className="fixed inset-0 z-[9000]" style={{ pointerEvents: 'none' }}>

      {/* ── SVG scrim with spotlight hole ── */}
      <svg
        className="absolute inset-0"
        width={vp.w} height={vp.h}
        style={{ pointerEvents: 'all', cursor: 'pointer' }}
        onClick={onNext}
      >
        {spot && (
          <defs>
            <mask id="tut-mask">
              <rect width={vp.w} height={vp.h} fill="white" />
              <rect x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx={10} fill="black" />
            </mask>
          </defs>
        )}

        <rect
          width={vp.w} height={vp.h}
          fill="rgba(0,0,0,0.65)"
          mask={spot ? 'url(#tut-mask)' : undefined}
        />

        {/* spotlight ring */}
        {spot && (
          <rect
            x={spot.x} y={spot.y}
            width={spot.w} height={spot.h}
            rx={10}
            fill="none"
            stroke="rgba(99,232,182,0.85)"
            strokeWidth={2}
            strokeDasharray="6 3"
          />
        )}
      </svg>

      {/* ── Tooltip card ── */}
      <div
        style={{ ...tipStyle, pointerEvents: 'all' }}
        className="bg-surface border border-border rounded-2xl shadow-pop p-5 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        {/* progress dots */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-wrap">
            {steps.map((_, i) => (
              <div key={i} className={[
                'h-1.5 rounded-full transition-all duration-300',
                i === step ? 'w-5 bg-accent' : i < step ? 'w-2 bg-accent/40' : 'w-2 bg-border',
              ].join(' ')} />
            ))}
          </div>
          <span className="text-[11px] text-muted ml-auto shrink-0">{step + 1} / {steps.length}</span>
        </div>

        {/* content */}
        <div>
          <div className="font-display font-semibold text-light text-base leading-snug">{current.title}</div>
          <div className="text-sm text-muted mt-2 leading-relaxed whitespace-pre-line">{current.body}</div>
        </div>

        {/* nav row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={onSkip}
            className="text-xs text-muted hover:text-light transition-colors px-1 py-1"
          >
            ข้าม
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={onPrev}
                className="h-8 px-3 rounded-lg bg-panel border border-border text-muted
                           hover:text-light text-sm font-medium transition-all">
                ← ก่อนหน้า
              </button>
            )}
            <button onClick={onNext}
              className="h-8 px-4 rounded-lg bg-accent text-accent-ink text-sm font-semibold
                         hover:opacity-90 transition-opacity">
              {isLast ? 'เสร็จแล้ว! 🎉' : 'ถัดไป →'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─────────────────────────────────────────────── HelpButton (floating) ── */

export function TutorialHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="ดู Tutorial อีกครั้ง"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[8000]
                 w-11 h-11 rounded-full bg-accent text-accent-ink shadow-pop
                 flex items-center justify-center text-base font-bold
                 hover:opacity-90 active:scale-95 transition-all"
    >
      ?
    </button>
  )
}
