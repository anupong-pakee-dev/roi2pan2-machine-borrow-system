'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ThaiDatePicker from '@/components/ThaiDatePicker'

interface Props {
  totalRecords: number
}

function todayThaiISO() {
  const now = new Date()
  const thaiTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  return thaiTime.toISOString().slice(0, 10)
}

function todayThaiYM() {
  return todayThaiISO().slice(0, 7)
}

function IconSpinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

/* ─── Export Modal ─────────────────────────────────────────────────────── */
function ExportModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'daily' | 'monthly'>('daily')
  const [date, setDate] = useState(todayThaiISO())
  const [month, setMonth] = useState(todayThaiYM())
  const [loading, setLoading] = useState(false)

  async function doExport() {
    setLoading(true)
    try {
      const param = mode === 'daily' ? date : month
      const res = await fetch(`/api/admin/export?mode=${mode}&date=${param}`)
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Export ไม่สำเร็จ'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `บันทึก-${mode === 'daily' ? 'วันที่' : 'เดือน'}-${param}.csv`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader icon="📊" title="Export Excel" sub="เลือกช่วงเวลาที่ต้องการ export" />

      <div className="flex gap-1 bg-panel border border-border rounded-xl p-1 mb-4">
        {(['daily', 'monthly'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-accent text-ink' : 'text-muted hover:text-light'}`}>
            {m === 'daily' ? '📅 รายวัน' : '🗓 รายเดือน'}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <label className="label">{mode === 'daily' ? 'เลือกวันที่' : 'เลือกเดือน'}</label>
        {mode === 'daily'
          ? <ThaiDatePicker value={date} onChange={setDate} />
          : <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input-field" />
        }
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">ยกเลิก</button>
        <button onClick={doExport} disabled={loading}
          className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2">
          {loading ? <IconSpinner /> : <span>⬇</span>}
          {loading ? 'กำลัง Export...' : 'Export'}
        </button>
      </div>
    </Overlay>
  )
}

/* ─── Backup Modal ─────────────────────────────────────────────────────── */
function BackupModal({ totalRecords, onClose }: { totalRecords: number; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function doBackup() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/backup')
      if (!res.ok) { alert('สำรองข้อมูลไม่สำเร็จ'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${todayThaiISO()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
    } finally { setLoading(false) }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader icon="💾" title="สำรองข้อมูล" sub="ดาวน์โหลด backup ทั้งหมดเป็นไฟล์ CSV" />

      <div className="bg-panel rounded-xl p-4 border border-border text-sm space-y-2 mb-5">
        <InfoRow label="จำนวนรายการ" value={`${totalRecords.toLocaleString()} รายการ`} />
        <InfoRow label="รูปแบบไฟล์" value="CSV (UTF-8)" />
        <InfoRow label="นำเข้ากลับได้" value="✅ ผ่านแท็บ นำเข้าข้อมูล" />
      </div>

      {done && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm mb-4">
          ✅ ดาวน์โหลดสำเร็จแล้ว
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">ปิด</button>
        <button onClick={doBackup} disabled={loading}
          className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2">
          {loading ? <IconSpinner /> : <span>⬇</span>}
          {loading ? 'กำลังสำรอง...' : 'ดาวน์โหลด'}
        </button>
      </div>
    </Overlay>
  )
}

/* ─── Import Modal ─────────────────────────────────────────────────────── */
function ImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState('')

  async function doImport() {
    if (!file) return
    setLoading(true); setResult(null); setError('')
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/admin/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'นำเข้าไม่สำเร็จ')
      else { setResult({ imported: data.imported, skipped: data.skipped }); router.refresh() }
    } catch { setError('เกิดข้อผิดพลาด') }
    finally { setLoading(false) }
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader icon="📥" title="นำเข้าข้อมูล" sub="กู้คืนจากไฟล์ backup" />

      <div className="bg-panel rounded-xl p-4 border border-border text-sm space-y-1.5 text-muted mb-4">
        <p>• ใช้เฉพาะไฟล์ <span className="text-light font-mono">backup-YYYY-MM-DD.csv</span> จากระบบนี้</p>
        <p>• รายการ ID ซ้ำจะถูกข้ามโดยอัตโนมัติ</p>
        <p>• ข้อมูลเดิมจะไม่ถูกลบออก</p>
      </div>

      <div
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/40 hover:bg-white/[0.01] transition-all mb-4"
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-3xl mb-2">{file ? '📄' : '📁'}</div>
        <p className="text-sm font-medium text-light">{file ? file.name : 'คลิกเพื่อเลือกไฟล์'}</p>
        <p className="text-xs text-muted mt-1">.csv เท่านั้น</p>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); setError('') }} />
      </div>

      {error && <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-3 text-accent2 text-sm mb-4">{error}</div>}
      {result && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm mb-4">
          ✅ นำเข้าสำเร็จ <strong>{result.imported}</strong> รายการ
          {result.skipped > 0 && <span className="text-muted ml-1">(ข้าม {result.skipped} ซ้ำ)</span>}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">ปิด</button>
        <button onClick={doImport} disabled={!file || loading}
          className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <IconSpinner /> : <span>⬆</span>}
          {loading ? 'กำลังนำเข้า...' : 'นำเข้า'}
        </button>
      </div>
    </Overlay>
  )
}

/* ─── Clear Modal ──────────────────────────────────────────────────────── */
function ClearModal({ totalRecords, onCleared, onClose }: { totalRecords: number; onCleared: () => void; onClose: () => void }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(0)

  const PHRASE = 'ยืนยันลบข้อมูลทั้งหมด'

  async function doClear() {
    if (confirm !== PHRASE) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clear', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: PHRASE }),
      })
      const data = await res.json()
      if (res.ok) { setDone(data.deleted); onCleared(); router.refresh() }
      else alert(data.error || 'ล้างข้อมูลไม่สำเร็จ')
    } finally { setLoading(false) }
  }

  if (done > 0) {
    return (
      <Overlay onClose={onClose}>
        <div className="text-center py-4">
          <div className="text-5xl mb-4">✅</div>
          <p className="text-light font-semibold text-lg">ล้างข้อมูลสำเร็จ</p>
          <p className="text-muted text-sm mt-1">ลบออก {done.toLocaleString()} รายการ</p>
        </div>
        <button onClick={onClose} className="btn-primary w-full mt-4 text-sm py-2.5">ปิด</button>
      </Overlay>
    )
  }

  return (
    <Overlay onClose={onClose}>
      <ModalHeader icon="⚠️" title="ล้างฐานข้อมูล" sub="การดำเนินการนี้ไม่สามารถยกเลิกได้" />

      <div className="bg-accent2/5 border border-accent2/20 rounded-xl p-4 text-sm space-y-1.5 mb-5">
        <p className="text-accent2 font-semibold">สิ่งที่จะเกิดขึ้น:</p>
        <p className="text-muted">• ลบข้อมูลบันทึกทั้งหมด <span className="text-accent2 font-bold">{totalRecords.toLocaleString()}</span> รายการ</p>
        <p className="text-muted">• บัญชีผู้ใช้จะไม่ถูกลบ</p>
        <p className="text-muted">• ข้อมูลจะหายถาวร ไม่สามารถกู้คืนได้</p>
      </div>

      <div className="mb-5">
        <label className="label">พิมพ์เพื่อยืนยัน</label>
        <p className="text-xs text-muted mb-2">
          พิมพ์: <span className="font-mono text-accent2 bg-accent2/10 px-1.5 py-0.5 rounded">{PHRASE}</span>
        </p>
        <input
          type="text" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="พิมพ์ข้อความยืนยัน..."
          className={`input-field transition-all ${confirm === PHRASE ? 'border-accent2 ring-1 ring-accent2/30' : ''}`}
        />
        {confirm.length > 0 && confirm !== PHRASE && (
          <p className="text-xs text-accent2 mt-1.5">⚠ ข้อความไม่ตรง</p>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">ยกเลิก</button>
        <button onClick={doClear} disabled={confirm !== PHRASE || loading}
          className="btn-danger flex-1 text-sm py-2.5 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          {loading ? <IconSpinner /> : '🗑'}
          {loading ? 'กำลังลบ...' : 'ล้างข้อมูล'}
        </button>
      </div>
    </Overlay>
  )
}

/* ─── Shared primitives ────────────────────────────────────────────────── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-11 h-11 rounded-xl bg-white/5 border border-border flex items-center justify-center text-xl shrink-0">{icon}</div>
      <div>
        <p className="font-display font-semibold text-light">{title}</p>
        <p className="text-xs text-muted mt-0.5">{sub}</p>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-light font-medium">{value}</span>
    </div>
  )
}

/* ─── Action button in the grid ───────────────────────────────────────── */
function ActionBtn({
  icon, label, sub, color, onClick,
}: {
  icon: string; label: string; sub: string
  color: 'amber' | 'blue' | 'green' | 'red'
  onClick: () => void
}) {
  const colors = {
    amber: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-400/50 hover:bg-amber-500/15',
    blue:  'bg-blue-500/10  border-blue-500/20  hover:border-blue-400/50  hover:bg-blue-500/15',
    green: 'bg-green-500/10 border-green-500/20 hover:border-green-400/50 hover:bg-green-500/15',
    red:   'bg-accent2/10   border-accent2/20   hover:border-accent2/50   hover:bg-accent2/15',
  }
  const textColors = {
    amber: 'text-amber-400',
    blue:  'text-blue-400',
    green: 'text-green-400',
    red:   'text-accent2',
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border transition-all duration-150 active:scale-95 text-center ${colors[color]}`}
    >
      <span className="text-3xl">{icon}</span>
      <div>
        <p className={`text-sm font-semibold ${textColors[color]}`}>{label}</p>
        <p className="text-xs text-muted mt-0.5 leading-snug">{sub}</p>
      </div>
    </button>
  )
}

/* ─── Main Card ────────────────────────────────────────────────────────── */
export default function DataManagementCard({ totalRecords }: Props) {
  const [modal, setModal] = useState<'export' | 'backup' | 'import' | 'clear' | null>(null)
  const [recordCount, setRecordCount] = useState(totalRecords)

  return (
    <>
      {modal === 'export' && <ExportModal onClose={() => setModal(null)} />}
      {modal === 'backup' && <BackupModal totalRecords={recordCount} onClose={() => setModal(null)} />}
      {modal === 'import' && <ImportModal onClose={() => setModal(null)} />}
      {modal === 'clear'  && (
        <ClearModal
          totalRecords={recordCount}
          onCleared={() => setRecordCount(0)}
          onClose={() => setModal(null)}
        />
      )}

      <div className="card p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-lg shrink-0">
            🛡
          </div>
          <div>
            <h2 className="font-display font-semibold text-light">จัดการข้อมูล</h2>
            <p className="text-xs text-muted mt-0.5">Export · สำรอง · นำเข้า · ล้างฐานข้อมูล</p>
          </div>
          <div className="ml-auto">
            <span className="px-3 py-1 rounded-full bg-panel border border-border text-xs text-muted font-mono">
              {recordCount.toLocaleString()} รายการ
            </span>
          </div>
        </div>

        {/* 4-button grid */}
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ActionBtn
            icon="📊" label="Export Excel"
            sub="รายวัน หรือ รายเดือน"
            color="amber"
            onClick={() => setModal('export')}
          />
          <ActionBtn
            icon="💾" label="สำรองข้อมูล"
            sub="ดาวน์โหลด backup ทั้งหมด"
            color="blue"
            onClick={() => setModal('backup')}
          />
          <ActionBtn
            icon="📥" label="นำเข้าข้อมูล"
            sub="กู้คืนจากไฟล์ backup"
            color="green"
            onClick={() => setModal('import')}
          />
          <ActionBtn
            icon="🗑" label="ล้างฐานข้อมูล"
            sub="ลบข้อมูลทั้งหมด"
            color="red"
            onClick={() => setModal('clear')}
          />
        </div>
      </div>
    </>
  )
}
