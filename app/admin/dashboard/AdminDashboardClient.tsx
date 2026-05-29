'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import FilterPanel, { FilterState } from '@/components/FilterPanel'
import DataManagementCard from './DataManagementCard'
import { toISODate, fmtDateTH } from '@/lib/format'
import TutorialOverlay, { TutorialHelpButton, TutorialStep, useTutorial } from '@/components/Tutorial'

const ADMIN_STEPS: TutorialStep[] = [
  {
    title: 'ยินดีต้อนรับหน้า Admin 🛡️',
    body: 'หน้านี้ใช้สำหรับดูรายงาน จัดการข้อมูลการยืม-คืน และผู้ใช้ทั้งหมด\nมาทำความรู้จักแต่ละส่วนกัน!',
    target: null,
  },
  {
    title: '📊 ตัวเลขสรุป',
    body: 'แสดงยอดรวมตามช่วงเวลาที่เลือก\n• ยอดสุทธิ (หักหนี้แล้ว)\n• หนี้ค้างชำระ\n• นาทีรวม\n• คูปองที่ใช้',
    target: '[data-tutorial="admin-stats"]',
    placement: 'bottom',
  },
  {
    title: '🗂️ แท็บและตัวกรองช่วงเวลา',
    body: 'เลือกดูข้อมูลตามช่วงเวลา\n• วันนี้ · วันเดียว · ช่วงวัน · ทั้งหมด\nกรองเพิ่มด้วย เครื่อง · วิธีชำระ · ค้นหา',
    target: '[data-tutorial="admin-filter"]',
    placement: 'bottom',
  },
  {
    title: '📋 ตารางรายการ',
    body: 'แสดงทุกรายการพร้อมวันเวลายืม-คืน ยอดเงิน คูปอง หนี้\n• 🗑️ ปุ่มแดง = ลบรายการ\n• 💳 ปุ่มเหลือง = จ่ายย้อนหลัง (เฉพาะรายที่มีหนี้ค้าง)',
    target: '[data-tutorial="admin-table"]',
    placement: 'top',
  },
  {
    title: '💳 จ่ายย้อนหลัง',
    body: 'รายการที่มีหนี้ค้างชำระ (คอลัมน์ "หนี้" มีตัวเลขสีแดง)\nกดปุ่มสีเหลืองเพื่อบันทึกการจ่ายในภายหลัง\nระบุเงินสดหรือคูปอง ยอดหนี้จะอัปเดตทันที',
    target: null,
  },
  {
    title: '👥 จัดการผู้ใช้',
    body: 'สลับมาที่แท็บ "ผู้ใช้" เพื่อ\n• ดูรายชื่อผู้ใช้ทั้งหมด\n• เพิ่มผู้ใช้ใหม่\n• ลบผู้ใช้ (ลบตัวเองไม่ได้)',
    target: '[data-tutorial="admin-tabs"]',
    placement: 'bottom',
  },
  {
    title: '🛡️ ส่วนจัดการข้อมูล',
    body: 'ด้านล่างสุดของหน้ามีเครื่องมือจัดการฐานข้อมูล 4 อย่าง\nแต่ละปุ่มมีหน้าที่ต่างกัน มาดูทีละอันเลย!',
    target: '[data-tutorial="data-management"]',
    placement: 'top',
  },
  {
    title: '📊 Export Excel',
    body: 'ดาวน์โหลดข้อมูลเป็นไฟล์ CSV เปิดด้วย Excel ได้เลย\n• รายวัน — เลือกวันที่ต้องการ\n• รายเดือน — เลือกเดือน\nเหมาะสำหรับทำรายงานส่งหรือวิเคราะห์ยอด',
    target: '[data-tutorial="dm-export"]',
    placement: 'top',
  },
  {
    title: '💾 สำรองข้อมูล (Backup)',
    body: 'ดาวน์โหลดข้อมูลทั้งหมดในฐานข้อมูลเป็นไฟล์ CSV ครั้งเดียว\nแนะนำให้ทำสม่ำเสมอเพื่อป้องกันข้อมูลสูญหาย\nไฟล์ backup สามารถนำเข้ากลับได้ในภายหลัง',
    target: '[data-tutorial="dm-backup"]',
    placement: 'top',
  },
  {
    title: '📥 นำเข้าข้อมูล (Import)',
    body: 'กู้คืนข้อมูลจากไฟล์ backup ที่เคย Export ไว้\n• ใช้ได้เฉพาะไฟล์ backup จากระบบนี้\n• รายการ ID ซ้ำจะถูกข้ามโดยอัตโนมัติ\n• ข้อมูลเดิมในระบบจะไม่ถูกลบ',
    target: '[data-tutorial="dm-import"]',
    placement: 'top',
  },
  {
    title: '🗑️ ล้างฐานข้อมูล',
    body: '⚠️ ระวัง! ปุ่มนี้ลบข้อมูลบันทึกทั้งหมดถาวร\nแนะนำให้ทำ Backup ก่อนเสมอ\nต้องพิมพ์ข้อความยืนยันก่อน — ระบบออกแบบมาเพื่อป้องกันการกดผิด',
    target: '[data-tutorial="dm-clear"]',
    placement: 'top',
  },
  {
    title: 'พร้อมแล้ว! 🎉',
    body: 'คุณรู้จักทุกฟีเจอร์แล้ว\nกดปุ่ม ? มุมล่างขวาเพื่อดู Tutorial นี้อีกครั้งได้เสมอ',
    target: null,
  },
]

interface BulkPayResult {
  id: string
  newDebt: number
  newCoupon: number
  newChange: number
}

interface RecordRow {
  id: string
  number: number
  machine: string
  status: string
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

interface UserRow {
  id: string
  username: string
  role: string
  createdAt: Date | string
}

interface Props {
  records: RecordRow[]
  users: UserRow[]
  currentUserId: string
  readOnly?: boolean
}

export default function AdminDashboardClient({ records: initialRecords, users: initialUsers, currentUserId, readOnly = false }: Props) {
  const router = useRouter()
  const [records, setRecords] = useState(initialRecords)
  const [users,   setUsers]   = useState(initialUsers)

  const [tab, setTab] = useState<'records' | 'users'>('records')
  const [viewMode, setViewMode]   = useState<'today' | 'date' | 'range' | 'all'>('all')
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()))
  const [selectedDateEnd, setSelectedDateEnd] = useState(toISODate(new Date()))
  const [filters, setFilters]     = useState<FilterState>({ machine: '', payMethod: '', search: '' })
  const [showAddUser, setShowAddUser] = useState(false)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [payingRecord, setPayingRecord] = useState<RecordRow | null>(null)
  const [selectedIds, setSelectedIds]  = useState<Set<string>>(new Set())
  const [showBulkPay, setShowBulkPay]  = useState(false)
  const tut = useTutorial('machinelog_tutorial_admin_v1')

  const today = toISODate(new Date())
  const todayRecords = records.filter(r => toISODate(r.createdAt) === today)

  const baseRecords = useMemo(() => {
    if (viewMode === 'today') return todayRecords
    if (viewMode === 'date')  return records.filter(r => toISODate(r.createdAt) === selectedDate)
    if (viewMode === 'range') return records.filter(r => {
      const d = toISODate(r.createdAt)
      return d >= selectedDate && d <= (selectedDateEnd || selectedDate)
    })
    return records
  }, [records, viewMode, selectedDate, selectedDateEnd, todayRecords])

  const machines = useMemo(() => {
    const set = new Set(records.map(r => r.machine))
    return Array.from(set).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, '')) || 0
      const nb = parseInt(b.replace(/\D/g, '')) || 0
      return na - nb || a.localeCompare(b)
    })
  }, [records])

  const filteredRecords = useMemo(() => baseRecords.filter(r => {
    if (filters.machine && r.machine !== filters.machine) return false
    if (filters.payMethod === 'cash'   && !(r.coupon === 0 && r.baht > 0)) return false
    if (filters.payMethod === 'coupon' && !(r.coupon > 0)) return false
    if (filters.payMethod === 'debt'   && !(r.debt > 0))   return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const hay = `${r.number} ${r.machine} ${r.reports || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [baseRecords, filters])

  const stats = useMemo(() => ({
    count:   filteredRecords.length,
    minutes: filteredRecords.reduce((s, r) => s + r.minutes, 0),
    baht:    filteredRecords.reduce((s, r) => s + r.baht, 0),
    coupon:  filteredRecords.reduce((s, r) => s + r.coupon, 0),
    debt:    filteredRecords.reduce((s, r) => s + r.debt, 0),
    net:     filteredRecords.reduce((s, r) => s + r.baht - r.debt, 0),
  }), [filteredRecords])

  async function deleteRecord(id: string) {
    if (!confirm('ลบรายการนี้?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' })
      if (res.ok) setRecords(rs => rs.filter(r => r.id !== id))
    } finally { setDeleting(null) }
  }

  // ── selection helpers ──────────────────────────────────────────────
  const debtIds = useMemo(() => filteredRecords.filter(r => r.debt > 0).map(r => r.id), [filteredRecords])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds(prev =>
      prev.size === debtIds.length ? new Set() : new Set(debtIds)
    )
  }

  function clearSelection() { setSelectedIds(new Set()) }

  // ── bulk pay ───────────────────────────────────────────────────────
  async function bulkPayRecords(results: BulkPayResult[]) {
    await Promise.all(results.map(({ id, newDebt, newCoupon, newChange }) => {
      const r = records.find(x => x.id === id)!
      return fetch(`/api/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnAt: r.returnAt || '',
          minutes: r.minutes, baht: r.baht,
          coupon: newCoupon, debt: newDebt, change: newChange,
          reports: r.reports,
        }),
      }).then(res => res.ok ? res.json() : null)
    })).then(updated => {
      setRecords(rs => rs.map(r => {
        const u = updated.find((x: RecordRow | null) => x?.id === r.id)
        return u ? { ...r, ...u } : r
      }))
    })
    setSelectedIds(new Set())
    setShowBulkPay(false)
  }

  async function payRecord(id: string, cashPaid: number, couponPaid: number) {
    const r = records.find(x => x.id === id)
    if (!r) return
    const totalPaid = cashPaid + couponPaid
    const newDebt   = Math.max(0, r.debt - totalPaid)
    const newChange = Math.max(0, totalPaid - r.debt)
    const newCoupon = r.coupon + couponPaid

    const res = await fetch(`/api/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        returnAt: r.returnAt || '',
        minutes:  r.minutes,
        baht:     r.baht,
        coupon:   newCoupon,
        debt:     newDebt,
        change:   newChange,
        reports:  r.reports,
      }),
    })
    if (res.ok) {
      const updated: RecordRow = await res.json()
      setRecords(rs => rs.map(x => x.id === id ? { ...x, ...updated } : x))
    }
    setPayingRecord(null)
  }

  async function deleteUser(id: string) {
    if (id === currentUserId) return alert('ลบตัวเองไม่ได้')
    if (!confirm('ลบผู้ใช้นี้?')) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (res.ok) setUsers(us => us.filter(u => u.id !== id))
    } finally { setDeleting(null) }
  }

  return (
    <div className="space-y-5">
      {/* Tutorial */}
      {tut.ready && (
        <>
          <TutorialOverlay
            steps={ADMIN_STEPS}
            active={tut.active}
            step={tut.step}
            onNext={() => tut.next(ADMIN_STEPS.length)}
            onPrev={tut.prev}
            onSkip={tut.finish}
          />
          {!tut.active && <TutorialHelpButton onClick={tut.start} />}
        </>
      )}

      {/* Stats */}
      <div data-tutorial="admin-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="stat-card stat-card-accent">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/60">ยอดสุทธิ (หักหนี้)</div>
          <div className="font-mono tabular-nums text-4xl font-bold leading-tight text-accent">
            ฿{stats.net.toLocaleString()}
          </div>
          <div className="text-xs text-ink/55">{stats.count} รายการ</div>
        </div>
        <Stat label="หนี้ค้างชำระ" value={`฿${stats.debt.toLocaleString()}`}
              sub={`${filteredRecords.filter(r => r.debt > 0).length} รายการ`} danger />
        <Stat label="นาทีรวม" value={stats.minutes.toLocaleString()}
              sub={`≈ ${Math.round(stats.minutes / 60)} ชั่วโมง`} />
        <Stat label="คูปองที่ใช้" value={`฿${stats.coupon.toLocaleString()}`}
              sub={`${filteredRecords.filter(r => r.coupon > 0).length} รายการ`} />
      </div>

      {/* Tab + add user */}
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div data-tutorial="admin-tabs" className="bg-surface border border-border rounded-xl p-1 flex gap-1">
          {(([
            ['records', `รายการทั้งหมด · ${records.length}`],
            ...(!readOnly ? [['users', `ผู้ใช้ · ${users.length}`]] : []),
          ]) as ['records' | 'users', string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={[
                'h-9 px-4 rounded-lg text-sm font-medium transition-all',
                tab === k ? 'bg-light text-ink' : 'text-muted hover:text-light',
              ].join(' ')}
            >{label}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {readOnly && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel border border-border
                             text-xs text-muted font-medium">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              ดูข้อมูลอย่างเดียว
            </span>
          )}
          {tab === 'users' && !readOnly && (
            <button className="btn-primary" onClick={() => setShowAddUser(true)}>+ เพิ่มผู้ใช้</button>
          )}
        </div>
      </div>

      {tab === 'records' ? (
        <>
          <div data-tutorial="admin-filter">
          <FilterPanel
            viewMode={viewMode}
            setViewMode={setViewMode}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedDateEnd={selectedDateEnd}
            setSelectedDateEnd={setSelectedDateEnd}
            todayCount={todayRecords.length}
            allCount={records.length}
            machines={machines}
            filters={filters}
            setFilters={setFilters}
            resultCount={filteredRecords.length}
            baseCount={baseRecords.length}
          />
          </div>
          {/* Selection bar */}
          {!readOnly && selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-yellow-400/10 border border-yellow-400/30
                            rounded-2xl flex-wrap">
              <span className="text-yellow-300 font-semibold text-sm">
                เลือก {selectedIds.size} รายการ
              </span>
              <span className="text-yellow-400/70 text-sm font-mono">
                · หนี้รวม ฿{filteredRecords.filter(r => selectedIds.has(r.id)).reduce((s, r) => s + r.debt, 0).toLocaleString()}
              </span>
              <div className="flex gap-2 ml-auto">
                <button onClick={clearSelection}
                  className="h-8 px-3 rounded-lg bg-panel border border-border text-muted
                             hover:text-light text-sm transition-all">
                  ยกเลิก
                </button>
                <button onClick={() => setShowBulkPay(true)}
                  className="h-8 px-4 rounded-lg bg-yellow-400 text-black font-semibold
                             hover:bg-yellow-300 text-sm transition-all">
                  💳 จ่ายรวม
                </button>
              </div>
            </div>
          )}

          <div data-tutorial="admin-table">
          <RecordsTable
            records={filteredRecords}
            onDelete={deleteRecord}
            deleting={deleting}
            onPay={setPayingRecord}
            selectedIds={selectedIds}
            debtIds={debtIds}
            onToggle={toggleSelect}
            onToggleAll={toggleSelectAll}
            readOnly={readOnly}
          />
          </div>
        </>
      ) : (
        <UsersTable users={users} onDelete={deleteUser} deleting={deleting} currentUserId={currentUserId} />
      )}

      {!readOnly && <DataManagementCard totalRecords={records.length} />}

      {!readOnly && showAddUser && (
        <AddUserDialog
          onClose={() => setShowAddUser(false)}
          onCreated={(u) => { setUsers(us => [...us, u]); setShowAddUser(false); router.refresh() }}
        />
      )}

      {!readOnly && payingRecord && (
        <PayDialog
          record={payingRecord}
          onClose={() => setPayingRecord(null)}
          onConfirm={(cash, coupon) => payRecord(payingRecord.id, cash, coupon)}
        />
      )}

      {!readOnly && showBulkPay && (
        <BulkPayDialog
          records={filteredRecords.filter(r => selectedIds.has(r.id))}
          onClose={() => setShowBulkPay(false)}
          onConfirm={bulkPayRecords}
        />
      )}
    </div>
  )
}

/* ===== sub-components ===== */

function Stat({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="stat-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={['font-mono tabular-nums text-4xl font-bold leading-tight',
                       danger ? 'text-accent2' : ''].join(' ')}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  )
}

function RecordsTable({ records, onDelete, deleting, onPay,
                        selectedIds, debtIds, onToggle, onToggleAll, readOnly }: {
  records: RecordRow[]
  onDelete: (id: string) => void
  deleting: string | null
  onPay: (r: RecordRow) => void
  selectedIds: Set<string>
  debtIds: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
  readOnly?: boolean
}) {
  if (records.length === 0) {
    return <div className="card text-center py-12 text-muted text-sm">ไม่พบรายการที่ตรงกับตัวกรอง</div>
  }

  const visibleDebtIds = records.filter(r => r.debt > 0).map(r => r.id)
  const allSelected = visibleDebtIds.length > 0 && visibleDebtIds.every(id => selectedIds.has(id))
  const someSelected = visibleDebtIds.some(id => selectedIds.has(id))

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-panel">
              {/* select-all checkbox — admin only */}
              {!readOnly && (
                <th className="pl-4 pr-2 py-3 w-8">
                  {visibleDebtIds.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                      onChange={onToggleAll}
                      className="w-4 h-4 rounded accent-yellow-400 cursor-pointer"
                      title="เลือก/ยกเลิกทั้งหมด"
                    />
                  )}
                </th>
              )}
              {['เลขที่','เครื่อง','ยืม','คืน','นาที','บาท','คูปอง','หนี้','ทอน','หมายเหตุ',
                 ...(!readOnly ? ['',''] : [])].map((h, i) => (
                <th key={i}
                    className="px-4 py-3 text-left text-[11px] font-semibold text-muted
                               uppercase tracking-[0.08em] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map(r => {
              const isSelected = selectedIds.has(r.id)
              return (
                <tr key={r.id}
                    className={['table-row', isSelected ? 'bg-yellow-400/5' : ''].join(' ')}>
                  {/* checkbox cell — admin only */}
                  {!readOnly && (
                    <td className="pl-4 pr-2 py-3">
                      {r.debt > 0 && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggle(r.id)}
                          className="w-4 h-4 rounded accent-yellow-400 cursor-pointer"
                        />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 font-mono text-accent font-semibold">#{r.number}</td>
                  <td className="px-4 py-3"><span className="pill pill-idle font-mono">{r.machine}</span></td>
                  <td className="px-4 py-3 font-mono leading-tight">
                    <div>{r.borrowAt}</div>
                    <div className="text-[10px] text-muted font-sans">{fmtDateTH(new Date(r.createdAt))}</div>
                  </td>
                  <td className="px-4 py-3 font-mono leading-tight">
                    {r.returnAt
                      ? <><div>{r.returnAt}</div><div className="text-[10px] text-muted font-sans">{fmtDateTH(new Date(r.createdAt))}</div></>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{r.minutes}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">฿{r.baht}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.coupon ? `฿${r.coupon}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-accent2">{r.debt ? `฿${r.debt}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-500">{r.change ? `฿${r.change}` : '—'}</td>
                  <td className="px-4 py-3 text-muted text-xs max-w-[200px] truncate">{r.reports || '—'}</td>
                  {!readOnly && (
                    <>
                      <td className="px-4 py-3">
                        {r.debt > 0 && (
                          <button
                            onClick={() => onPay(r)}
                            title="จ่ายย้อนหลัง (รายการเดียว)"
                            className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/30
                                       text-yellow-400 hover:bg-yellow-400/20 grid place-items-center"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <rect x="2" y="6" width="20" height="13" rx="2"/>
                              <path d="M2 10h20"/><path d="M7 15h2m4 0h2"/>
                            </svg>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onDelete(r.id)}
                          disabled={deleting === r.id}
                          className="w-8 h-8 rounded-lg bg-accent2/10 border border-accent2/20
                                     text-accent2 hover:bg-accent2/20 grid place-items-center"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M3 6h18"/>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/>
                          </svg>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UsersTable({ users, onDelete, deleting, currentUserId }: {
  users: UserRow[]
  onDelete: (id: string) => void
  deleting: string | null
  currentUserId: string
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-panel">
            {['Username','Role','สร้างเมื่อ',''].map(h => (
              <th key={h}
                  className="px-4 py-3 text-left text-[11px] font-semibold text-muted
                             uppercase tracking-[0.08em] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="table-row">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={[
                    'w-9 h-9 rounded-full grid place-items-center font-semibold text-sm',
                    u.role === 'admin' ? 'bg-accent text-accent-ink' : 'bg-panel text-light',
                  ].join(' ')}>
                    {u.username[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{u.username}</div>
                    <div className="text-xs text-muted font-mono">{u.id.slice(0, 8)}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`pill ${u.role === 'admin' ? 'pill-active' : 'pill-idle'}`}>
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-muted">
                {new Date(u.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onDelete(u.id)}
                  disabled={u.id === currentUserId || deleting === u.id}
                  className="w-8 h-8 rounded-lg bg-accent2/10 border border-accent2/20
                             text-accent2 hover:bg-accent2/20 grid place-items-center
                             disabled:opacity-30 disabled:cursor-not-allowed"
                  title={u.id === currentUserId ? 'ลบตัวเองไม่ได้' : 'ลบ'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PayDialog({ record, onClose, onConfirm }: {
  record: RecordRow
  onClose: () => void
  onConfirm: (cash: number, coupon: number) => void
}) {
  const [cash,   setCash]   = useState('')
  const [coupon, setCoupon] = useState('')
  const [loading, setLoading] = useState(false)

  const cashNum   = parseInt(cash)   || 0
  const couponNum = parseInt(coupon) || 0
  const totalPaid = cashNum + couponNum
  const newDebt   = Math.max(0, record.debt - totalPaid)
  const newChange = Math.max(0, totalPaid - record.debt)
  const canSubmit = totalPaid > 0

  async function submit() {
    if (!canSubmit) return
    setLoading(true)
    await onConfirm(cashNum, couponNum)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="bg-surface border border-border rounded-3xl w-full max-w-md shadow-pop"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-display text-xl font-semibold">จ่ายย้อนหลัง</div>
            <div className="text-xs text-muted mt-0.5">
              #{record.number} · {record.machine} · {fmtDateTH(new Date(record.createdAt))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted uppercase tracking-wide">หนี้คงเหลือ</div>
            <div className="font-mono text-2xl font-bold text-accent2">฿{record.debt}</div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="label">💵 เงินสดที่จ่าย (บาท)</label>
            <input
              className="input-field"
              type="number"
              min="0"
              placeholder="0"
              value={cash}
              onChange={e => setCash(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">🎟 คูปองที่จ่าย (บาท)</label>
            <input
              className="input-field"
              type="number"
              min="0"
              placeholder="0"
              value={coupon}
              onChange={e => setCoupon(e.target.value)}
            />
          </div>

          {/* Preview */}
          {totalPaid > 0 && (
            <div className="bg-panel border border-border rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">ยอดที่จ่าย</span>
                <span className="font-mono font-semibold text-light">฿{totalPaid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">หนี้คงเหลือหลังจ่าย</span>
                <span className={`font-mono font-semibold ${newDebt === 0 ? 'text-green-400' : 'text-accent2'}`}>
                  ฿{newDebt}
                </span>
              </div>
              {newChange > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">ทอนเงิน</span>
                  <span className="font-mono font-semibold text-green-400">฿{newChange}</span>
                </div>
              )}
              {newDebt === 0 && (
                <div className="text-center text-xs text-green-400 font-semibold pt-1">
                  ✓ ชำระครบแล้ว
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            className="btn-primary disabled:opacity-40"
          >
            {loading ? 'กำลังบันทึก…' : 'บันทึกการชำระ'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Distribution helper ─────────────────────────────────────────── */
function distributePayment(
  records: RecordRow[],
  cashPaid: number,
  couponPaid: number,
): BulkPayResult[] {
  let remCash   = cashPaid
  let remCoupon = couponPaid
  const results: BulkPayResult[] = records.map(r => {
    const couponFor = Math.min(remCoupon, r.debt)
    remCoupon -= couponFor
    const cashFor = Math.min(remCash, r.debt - couponFor)
    remCash -= cashFor
    return {
      id: r.id,
      newDebt:   r.debt - couponFor - cashFor,
      newCoupon: r.coupon + couponFor,
      newChange: 0,
    }
  })
  // ทอนส่วนเกินให้รายการสุดท้ายที่จ่ายครบ
  const overpay = remCash + remCoupon
  if (overpay > 0) {
    const lastFull = [...results].reverse().find(x => x.newDebt === 0)
    if (lastFull) lastFull.newChange = overpay
  }
  return results
}

function BulkPayDialog({ records, onClose, onConfirm }: {
  records: RecordRow[]
  onClose: () => void
  onConfirm: (results: BulkPayResult[]) => Promise<void>
}) {
  const [cash,    setCash]    = useState('')
  const [coupon,  setCoupon]  = useState('')
  const [loading, setLoading] = useState(false)

  const cashNum   = parseInt(cash)   || 0
  const couponNum = parseInt(coupon) || 0
  const totalDebt = records.reduce((s, r) => s + r.debt, 0)
  const totalPaid = cashNum + couponNum
  const preview   = totalPaid > 0 ? distributePayment(records, cashNum, couponNum) : null
  const newTotalDebt = preview ? preview.reduce((s, r) => s + r.newDebt, 0) : totalDebt
  const totalChange  = preview ? preview.reduce((s, r) => s + r.newChange, 0) : 0
  const paidFull     = preview ? preview.filter(r => r.newDebt === 0).length : 0

  async function submit() {
    if (!preview || totalPaid === 0) return
    setLoading(true)
    await onConfirm(preview)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="bg-surface border border-border rounded-3xl w-full max-w-lg shadow-pop
                      max-h-[90vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
          <div>
            <div className="font-display text-xl font-semibold">จ่ายรวม {records.length} รายการ</div>
            <div className="text-xs text-muted mt-0.5">กระจายจ่าย: คูปองก่อน → เงินสด ตามลำดับรายการ</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted uppercase tracking-wide">หนี้รวม</div>
            <div className="font-mono text-2xl font-bold text-accent2">฿{totalDebt.toLocaleString()}</div>
          </div>
        </div>

        {/* Inputs */}
        <div className="px-6 pt-5 pb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="label">💵 เงินสดรวม (บาท)</label>
            <input className="input-field" type="number" min="0" placeholder="0"
                   value={cash} onChange={e => setCash(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">🎟 คูปองรวม (บาท)</label>
            <input className="input-field" type="number" min="0" placeholder="0"
                   value={coupon} onChange={e => setCoupon(e.target.value)} />
          </div>
        </div>

        {/* Summary preview */}
        {preview && (
          <div className="mx-6 mb-4 bg-panel border border-border rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">ยอดจ่ายรวม</span>
              <span className="font-mono font-semibold text-light">฿{totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">ชำระครบแล้ว</span>
              <span className="font-mono font-semibold text-green-400">{paidFull} / {records.length} รายการ</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">หนี้คงเหลือรวม</span>
              <span className={`font-mono font-semibold ${newTotalDebt === 0 ? 'text-green-400' : 'text-accent2'}`}>
                ฿{newTotalDebt.toLocaleString()}
              </span>
            </div>
            {totalChange > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">ทอนเงินรวม</span>
                <span className="font-mono font-semibold text-green-400">฿{totalChange.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Per-record breakdown */}
        <div className="px-6 pb-5 space-y-2">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">
            รายละเอียดแต่ละรายการ
          </div>
          {records.map((r, i) => {
            const p = preview?.[i]
            return (
              <div key={r.id}
                   className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm
                               ${p?.newDebt === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-panel'}`}>
                <span className="font-mono text-accent font-semibold w-10 shrink-0">#{r.number}</span>
                <span className="pill pill-idle font-mono text-xs shrink-0">{r.machine}</span>
                <span className="text-muted text-xs shrink-0">{fmtDateTH(new Date(r.createdAt))}</span>
                <div className="ml-auto flex items-center gap-3 shrink-0">
                  <span className="font-mono text-accent2 text-xs">฿{r.debt}</span>
                  {p && (
                    <>
                      <span className="text-muted text-xs">→</span>
                      <span className={`font-mono font-semibold text-xs
                                       ${p.newDebt === 0 ? 'text-green-400' : 'text-accent2'}`}>
                        ฿{p.newDebt}
                      </span>
                      {p.newDebt === 0 && <span className="text-green-400 text-xs">✓</span>}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end sticky bottom-0 bg-surface">
          <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button
            onClick={submit}
            disabled={totalPaid === 0 || loading}
            className="btn-primary disabled:opacity-40"
          >
            {loading ? 'กำลังบันทึก…' : `บันทึก ${records.length} รายการ`}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddUserDialog({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (u: UserRow) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState<'staff' | 'admin'>('staff')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function submit() {
    if (!username || !password) return setError('กรอกข้อมูลให้ครบ')
    setLoading(true)
    try {
      // Reuse register endpoint if present, else mimic locally
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'เพิ่มผู้ใช้ไม่สำเร็จ')
        return
      }
      const data = await res.json()
      onCreated(data)
    } catch {
      setError('เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div className="bg-surface border border-border rounded-3xl w-full max-w-md shadow-pop"
           onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border">
          <div className="font-display text-xl font-semibold">เพิ่มผู้ใช้ใหม่</div>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input-field" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Role</label>
            <div className="bg-surface border border-border rounded-xl p-1 flex gap-1">
              {(['staff', 'admin'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={[
                    'flex-1 h-9 rounded-lg text-sm font-medium transition-all',
                    role === r ? 'bg-light text-ink' : 'text-muted hover:text-light',
                  ].join(' ')}
                >{r}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-accent2">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">ยกเลิก</button>
          <button onClick={submit} disabled={loading} className="btn-primary">
            {loading ? 'กำลังบันทึก…' : 'เพิ่มผู้ใช้'}
          </button>
        </div>
      </div>
    </div>
  )
}
