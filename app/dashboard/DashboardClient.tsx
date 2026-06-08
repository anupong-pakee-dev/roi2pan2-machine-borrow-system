'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import MachineTile, { MachineTileData } from '@/components/MachineTile'
import QuickBorrowModal from '@/components/QuickBorrowModal'
import QuickReturnModal from '@/components/QuickReturnModal'
import { toISODate } from '@/lib/format'
import TutorialOverlay, { TutorialHelpButton, TutorialStep, useTutorial } from '@/components/Tutorial'

const DASHBOARD_STEPS: TutorialStep[] = [
  {
    title: 'ยินดีต้อนรับสู่ MachineLog 👋',
    body: 'ระบบบันทึกการยืม-คืนเครื่อง ใช้งานง่าย รวดเร็ว\nมาทำความรู้จักฟีเจอร์หลักกันเลย!',
    target: null,
  },
  {
    title: '📊 สรุปภาพรวมวันนี้',
    body: 'แถวบนสุดแสดง เครื่องที่กำลังใช้งาน · รายการวันนี้ · นาทีรวม · ยอดสุทธิ\nตัวเลขอัปเดตอัตโนมัติทุกครั้งที่มีการยืมหรือคืน',
    target: '[data-tutorial="stats"]',
    placement: 'bottom',
  },
  {
    title: '🖥️ หน้าจอเครื่อง',
    body: 'แต่ละการ์ดคือหนึ่งเครื่อง\n• สีเทา (ว่าง) → แตะเพื่อเริ่มบันทึกการยืม\n• สีเขียว (กำลังใช้) → แตะเพื่อบันทึกการคืน',
    target: '[data-tutorial="machine-grid"]',
    placement: 'top',
  },
  {
    title: '🔍 กรองมุมมองเครื่อง',
    body: 'กรองดูเฉพาะเครื่องที่ต้องการ\nเลือก ทั้งหมด · ใช้งานอยู่ · ว่าง ได้ที่นี่',
    target: '[data-tutorial="filter-tabs"]',
    placement: 'bottom',
  },
  {
    title: '📋 รายการล่าสุด',
    body: 'ดูประวัติการยืม-คืน 10 รายการล่าสุด\nมีข้อมูลเวลา · นาที · บาท · คูปอง · หนี้ค้างชำระ ครบถ้วน',
    target: '[data-tutorial="recent-records"]',
    placement: 'top',
  },
  {
    title: 'พร้อมใช้งานแล้ว! 🎉',
    body: 'กดปุ่ม ? มุมล่างขวาเพื่อดู Tutorial นี้อีกครั้งได้ตลอด\n\nหากเป็น Admin ไปที่หน้า แอดมิน เพื่อดูรายงาน จัดการข้อมูล และตั้งค่าต่างๆ',
    target: null,
  },
]

interface RecordRow {
  id: string
  number: number
  machine: string
  status: string                  // 'borrowing' | 'completed'
  borrowAt: string
  returnAt: string | null
  minutes: number
  baht: number
  coupon: number
  debt: number
  change: number
  reports: string | null
  createdAt: Date | string
}

interface Props {
  records: RecordRow[]
  role: string
  machineList: string[]
  isAdmin: boolean
}

type Filter = 'all' | 'active' | 'idle'

export default function DashboardClient({ records, role, machineList: initMachineList, isAdmin }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [borrowOpen,  setBorrowOpen]  = useState<{ machine?: string } | null>(null)
  const [returnTarget, setReturnTarget] = useState<RecordRow | null>(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [machineList, setMachineList] = useState(initMachineList)
  const tut = useTutorial('machinelog_tutorial_dashboard_v1')

  // ---- Derived data ----
  const borrowing = useMemo(
    () => records.filter(r => r.status === 'borrowing'),
    [records]
  )

  const completed = useMemo(
    () => records.filter(r => r.status !== 'borrowing'),
    [records]
  )

  const today = toISODate(new Date())
  const todayCompleted = useMemo(
    () => completed.filter(r => toISODate(r.createdAt) === today),
    [completed, today]
  )
  const todayMinutes = todayCompleted.reduce((s, r) => s + r.minutes, 0)
  const todayNet     = todayCompleted.reduce((s, r) => s + r.baht - r.change, 0)

  // Build tiles for the grid (all known machines + any borrowed machine not in list)
  const allMachines = useMemo(() => {
    const set = new Set(machineList)
    borrowing.forEach(r => set.add(r.machine))
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, '')) || 0
      const nb = parseInt(b.replace(/\D/g, '')) || 0
      return na - nb || a.localeCompare(b)
    })
  }, [machineList, borrowing])

  const tiles: MachineTileData[] = allMachines.map(name => {
    const rec = borrowing.find(r => r.machine === name)
    if (rec) return { name, status: 'in-use', borrowAt: rec.borrowAt, recordId: rec.id, number: rec.number }
    return { name, status: 'idle' }
  })

  const visible = tiles.filter(t => {
    if (filter === 'active') return t.status === 'in-use'
    if (filter === 'idle')   return t.status === 'idle'
    return true
  })

  const activeCount = tiles.filter(t => t.status === 'in-use').length

  const nextNumber = useMemo(() => {
    const nums = records.map(r => r.number).filter(Boolean)
    return nums.length > 0 ? Math.max(...nums) + 1 : 1
  }, [records])

  const busyMachines = borrowing.map(r => r.machine)

  function onTileClick(t: MachineTileData) {
    if (t.status === 'idle') {
      setBorrowOpen({ machine: t.name })
    } else {
      const rec = borrowing.find(r => r.id === t.recordId)
      if (rec) setReturnTarget(rec)
    }
  }

  return (
    <>
      {/* Tutorial */}
      {tut.ready && (
        <>
          <TutorialOverlay
            steps={DASHBOARD_STEPS}
            active={tut.active}
            step={tut.step}
            onNext={() => tut.next(DASHBOARD_STEPS.length)}
            onPrev={tut.prev}
            onSkip={tut.finish}
          />
          {!tut.active && <TutorialHelpButton onClick={tut.start} />}
        </>
      )}

      {/* Stats row */}
      <div data-tutorial="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card stat-card-accent">
          <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/60">
            เครื่องที่ใช้งานอยู่
          </div>
          <div className="font-mono tabular-nums text-2xl sm:text-4xl font-bold leading-tight text-accent">
            {activeCount}
            <span className="text-xl sm:text-2xl text-ink/40"> /{tiles.length}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-ink/55">อัปเดตทุกวินาที</div>
        </div>
        <Stat label="รายการวันนี้" value={String(todayCompleted.length)} sub="บันทึกแล้ว" />
        <Stat label="นาทีรวมวันนี้" value={String(todayMinutes)} sub={`≈ ${Math.round(todayMinutes / 60)} ชั่วโมง`} />
        <Stat label="ยอดสุทธิวันนี้" value={`฿${todayNet.toLocaleString()}`} sub="หลังหักทอน" />
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-end gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">หน้าจอเครื่อง</h2>
          <p className="text-muted text-xs sm:text-sm mt-0.5">
            แตะเครื่องว่างเพื่อเริ่มยืม · แตะเครื่องที่ใช้อยู่เพื่อคืน
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setManageOpen(true)}
              className="h-9 px-3 rounded-xl bg-surface border border-border text-muted
                         hover:text-light hover:border-light/30 text-sm font-medium
                         flex items-center gap-1.5 transition-all"
            >
              ⚙️ จัดการเครื่อง
            </button>
          )}
          <div data-tutorial="filter-tabs">
            <FilterTabs
              filter={filter}
              setFilter={setFilter}
              total={tiles.length}
              active={activeCount}
            />
          </div>
        </div>
      </div>

      {/* Machine grid */}
      <div data-tutorial="machine-grid"
           className="grid gap-3 sm:gap-4
                      grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map(t => (
          <MachineTile key={t.name} m={t} onClick={onTileClick} />
        ))}
      </div>

      {/* Recent records */}
      <div data-tutorial="recent-records">
        <RecentRecords records={completed.slice(0, 10)} />
      </div>

      {/* Modals */}
      {borrowOpen && (
        <QuickBorrowModal
          machine={borrowOpen.machine}
          nextNumber={nextNumber}
          machineList={machineList}
          busyMachines={busyMachines}
          onClose={() => setBorrowOpen(null)}
          onCreated={() => { setBorrowOpen(null); router.refresh() }}
        />
      )}
      {manageOpen && (
        <MachineManagerModal
          machineList={machineList}
          busyMachines={busyMachines}
          onClose={() => setManageOpen(false)}
          onChanged={setMachineList}
        />
      )}
      {returnTarget && (
        <QuickReturnModal
          record={returnTarget}
          machineList={machineList}
          busyMachines={busyMachines}
          onClose={() => setReturnTarget(null)}
          onDone={() => { setReturnTarget(null); router.refresh() }}
          onDeleted={() => { setReturnTarget(null); router.refresh() }}
        />
      )}
    </>
  )
}

/* ===== sub-components ===== */

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="font-mono tabular-nums text-2xl sm:text-4xl font-bold leading-tight">{value}</div>
      {sub && <div className="text-[10px] sm:text-xs text-muted">{sub}</div>}
    </div>
  )
}

function FilterTabs({ filter, setFilter, total, active }:
  { filter: Filter; setFilter: (f: Filter) => void; total: number; active: number }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-1 flex gap-1">
      {([
        ['all',    `ทั้งหมด · ${total}`],
        ['active', `ใช้งาน · ${active}`],
        ['idle',   `ว่าง · ${total - active}`],
      ] as [Filter, string][]).map(([k, label]) => (
        <button
          key={k}
          onClick={() => setFilter(k)}
          className={[
            'h-9 px-4 rounded-lg text-sm font-medium transition-all',
            filter === k
              ? 'bg-light text-ink'
              : 'text-muted hover:text-light',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function MachineManagerModal({ machineList, busyMachines, onClose, onChanged }: {
  machineList: string[]
  busyMachines: string[]
  onClose: () => void
  onChanged: (list: string[]) => void
}) {
  const [newName, setNewName] = useState('')
  const [adding, setAdding]   = useState(false)
  const [error,  setError]    = useState('')

  async function addMachine() {
    if (!newName.trim()) return
    setAdding(true); setError('')
    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'เพิ่มไม่สำเร็จ'); return }
      const sorted = [...machineList, newName.trim().toUpperCase()].sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, '')) || 0
        const nb = parseInt(b.replace(/\D/g, '')) || 0
        return na - nb || a.localeCompare(b)
      })
      onChanged(sorted); setNewName('')
    } finally { setAdding(false) }
  }

  async function deleteMachine(name: string) {
    const res = await fetch(`/api/machines/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (res.ok) onChanged(machineList.filter(m => m !== name))
    else setError('ลบไม่สำเร็จ')
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-pop">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-display font-semibold text-light">จัดการเครื่อง</div>
            <div className="text-xs text-muted mt-0.5">{machineList.length} เครื่องทั้งหมด</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-panel text-muted hover:text-light grid place-items-center">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Add new */}
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="ชื่อเครื่องใหม่ เช่น S30"
              value={newName}
              onChange={e => { setNewName(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && addMachine()}
            />
            <button
              onClick={addMachine}
              disabled={adding || !newName.trim()}
              className="btn-primary disabled:opacity-40 shrink-0"
            >
              + เพิ่ม
            </button>
          </div>
          {error && <p className="text-xs text-accent2">{error}</p>}

          {/* Machine grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
            {machineList.map(m => {
              const busy = busyMachines.includes(m)
              return (
                <div key={m}
                  className={[
                    'relative group rounded-xl border p-2 text-center',
                    busy ? 'border-accent/40 bg-accent/10' : 'border-border bg-panel',
                  ].join(' ')}
                >
                  <div className="font-mono font-bold text-sm">{m}</div>
                  {busy && <div className="text-[9px] text-accent/80 mt-0.5">กำลังใช้</div>}
                  {!busy && (
                    <button
                      onClick={() => deleteMachine(m)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full
                                 bg-accent2 text-white text-[10px] font-bold
                                 opacity-0 group-hover:opacity-100 transition-opacity
                                 flex items-center justify-center"
                      title={`ลบ ${m}`}
                    >✕</button>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-muted">
            * เครื่องที่กำลังใช้งานอยู่จะลบไม่ได้ · hover เครื่องเพื่อลบ
          </p>
        </div>
      </div>
    </div>
  )
}

function RecentRecords({ records }: { records: RecordRow[] }) {
  if (records.length === 0) {
    return (
      <div className="card text-center py-10 text-muted text-sm">ยังไม่มีรายการที่คืนแล้ว</div>
    )
  }
  return (
    <div>
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight">รายการล่าสุด</h3>
          <p className="text-muted text-xs">{records.length} รายการ</p>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-panel">
                {['เลขที่', 'เครื่อง', 'ยืม', 'คืน', 'นาที', 'บาท', 'คูปอง', 'หนี้', 'ทอน'].map(h => (
                  <th key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-muted
                                 uppercase tracking-[0.08em] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="px-2 sm:px-4 py-2 sm:py-3 font-mono text-accent font-semibold text-xs sm:text-sm">#{r.number}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3"><span className="pill pill-idle font-mono text-[11px] sm:text-xs">{r.machine}</span></td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 font-mono text-xs sm:text-sm">{r.borrowAt}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 font-mono text-xs sm:text-sm">{r.returnAt || '—'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-mono text-xs sm:text-sm">{r.minutes}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-mono font-semibold text-xs sm:text-sm">฿{r.baht}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-mono text-xs sm:text-sm">{r.coupon ? `฿${r.coupon}` : '—'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-mono text-accent2 text-xs sm:text-sm">{r.debt ? `฿${r.debt}` : '—'}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-mono text-green-500 text-xs sm:text-sm">{r.change ? `฿${r.change}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
