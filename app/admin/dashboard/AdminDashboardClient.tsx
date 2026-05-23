'use client'
import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ThaiDatePicker from '@/components/ThaiDatePicker'

interface Record {
  id: string
  number: number
  machine: string
  borrowAt: string
  returnAt: string
  minutes: number
  baht: number
  coupon: number
  debt: number
  change: number
  reports: string | null
  status: string
  createdAt: Date | string
}

interface Props {
  records: Record[]
}

// แปลงเป็น YYYY-MM-DD ตาม timezone ไทย (UTC+7) เพื่อป้องกันวันคลาดเคลื่อน
function toISODate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  const thaiOffset = 7 * 60
  const localTime = new Date(date.getTime() + thaiOffset * 60 * 1000)
  return localTime.toISOString().slice(0, 10)
}

function todayThaiISO() {
  const now = new Date()
  const thaiOffset = 7 * 60
  const localTime = new Date(now.getTime() + thaiOffset * 60 * 1000)
  return localTime.toISOString().slice(0, 10)
}

function toThaiDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'buddhist' } as Intl.DateTimeFormatOptions)
}

function IconDownload() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}
function IconUpload() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}
function IconShield() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}
function IconSpinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function AdminDashboardClient({ records: initialRecords }: Props) {
  const router = useRouter()
  const [records, setRecords] = useState(initialRecords)
  const [confirmTarget, setConfirmTarget] = useState<Record | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'today' | 'all'>('all')
  const [selectedDate, setSelectedDate] = useState<string>(todayThaiISO())

  const [showExportModal, setShowExportModal] = useState(false)
  const [exportMode, setExportMode] = useState<'daily' | 'monthly'>('daily')
  const [exportDate, setExportDate] = useState(todayThaiISO())
  const [exportMonth, setExportMonth] = useState(todayThaiISO().slice(0, 7))
  const [exporting, setExporting] = useState(false)

  const [showDataModal, setShowDataModal] = useState(false)
  const [dataTab, setDataTab] = useState<'backup' | 'import' | 'clear'>('backup')
  const [backingUp, setBackingUp] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [importError, setImportError] = useState('')
  const [clearConfirm, setClearConfirm] = useState('')
  const [clearing, setClearing] = useState(false)
  const [clearResult, setClearResult] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayed = useMemo(() => {
    if (viewMode === 'today') return records.filter(r => toISODate(r.createdAt) === selectedDate)
    return records
  }, [records, viewMode, selectedDate])

  const stats = useMemo(() => ({
    count: displayed.length,
    minutes: displayed.reduce((s, r) => s + r.minutes, 0),
    baht: displayed.reduce((s, r) => s + r.baht, 0),
    debt: displayed.reduce((s, r) => s + r.debt, 0),
    coupon: displayed.reduce((s, r) => s + r.coupon, 0),
  }), [displayed])

  // ยอดเงินบาททั้งหมด = ยอดเงินบาททั้งหมด - ยอดค้างทั้งหมด
  const netBaht = stats.baht - stats.debt

  async function handleExport() {
    setExporting(true)
    try {
      const mode = exportMode
      const date = exportMode === 'daily' ? exportDate : exportMonth
      const res = await fetch(`/api/admin/export?mode=${mode}&date=${date}`)
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Export ไม่สำเร็จ'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `บันทึก-${mode === 'daily' ? 'วันที่' : 'เดือน'}-${date}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setShowExportModal(false)
    } finally { setExporting(false) }
  }

  async function handleBackup() {
    setBackingUp(true)
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
    } finally { setBackingUp(false) }
  }

  async function handleImport() {
    if (!importFile) return
    setImporting(true); setImportResult(null); setImportError('')
    try {
      const fd = new FormData(); fd.append('file', importFile)
      const res = await fetch('/api/admin/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setImportError(data.error || 'นำเข้าข้อมูลไม่สำเร็จ') }
      else { setImportResult({ imported: data.imported, skipped: data.skipped }); router.refresh() }
    } catch { setImportError('เกิดข้อผิดพลาดในการอัปโหลด') }
    finally { setImporting(false) }
  }

  async function handleClear() {
    if (clearConfirm !== 'ยืนยันลบข้อมูลทั้งหมด') return
    setClearing(true); setClearResult('')
    try {
      const res = await fetch('/api/admin/clear', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'ยืนยันลบข้อมูลทั้งหมด' }),
      })
      const data = await res.json()
      if (res.ok) { setClearResult(`ลบข้อมูลสำเร็จ ${data.deleted} รายการ`); setRecords([]); setClearConfirm(''); router.refresh() }
      else { setClearResult(data.error || 'ล้างข้อมูลไม่สำเร็จ') }
    } finally { setClearing(false) }
  }

  async function handleDelete() {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/records/${confirmTarget.id}`, { method: 'DELETE' })
      if (res.ok) { setRecords(prev => prev.filter(r => r.id !== confirmTarget.id)); setConfirmTarget(null) }
    } finally { setDeleting(false) }
  }

  const closeDataModal = () => { setShowDataModal(false); setImportResult(null); setImportError(''); setClearResult('') }

  return (
    <>
      {/* Delete single confirm */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-accent2/15 border border-accent2/30 flex items-center justify-center text-accent2 shrink-0"><IconTrash /></div>
              <div>
                <p className="font-semibold text-light text-sm">ยืนยันการลบ</p>
                <p className="text-xs text-muted mt-0.5">รายการนี้จะถูกลบถาวร ไม่สามารถกู้คืนได้</p>
              </div>
            </div>
            <div className="bg-panel rounded-xl p-3 mb-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted">เลขที่</span><span className="font-mono text-accent font-semibold">#{confirmTarget.number}</span></div>
              <div className="flex justify-between"><span className="text-muted">เครื่อง</span><span className="font-mono text-light">{confirmTarget.machine}</span></div>
              <div className="flex justify-between"><span className="text-muted">เวลา</span><span className="font-mono text-light">{confirmTarget.borrowAt} → {confirmTarget.returnAt}</span></div>
              <div className="flex justify-between"><span className="text-muted">ค่าบริการ</span><span className="font-mono text-green-400">{confirmTarget.baht} บาท</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmTarget(null)} disabled={deleting} className="btn-secondary flex-1 text-sm py-2">ยกเลิก</button>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1 text-sm py-2 flex items-center justify-center gap-2">
                {deleting ? <IconSpinner /> : <IconTrash />}
                {deleting ? 'กำลังลบ...' : 'ลบรายการ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0"><IconDownload /></div>
              <div>
                <p className="font-semibold text-light">Export Excel</p>
                <p className="text-xs text-muted mt-0.5">เลือกช่วงเวลาที่ต้องการ export</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-panel border border-border rounded-xl p-1 mb-4">
              <button onClick={() => setExportMode('daily')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${exportMode === 'daily' ? 'bg-accent text-ink' : 'text-muted hover:text-light'}`}>รายวัน</button>
              <button onClick={() => setExportMode('monthly')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${exportMode === 'monthly' ? 'bg-accent text-ink' : 'text-muted hover:text-light'}`}>รายเดือน</button>
            </div>
            {exportMode === 'daily' ? (
              <div className="mb-4">
                <label className="label">เลือกวันที่</label>
                <ThaiDatePicker value={exportDate} onChange={setExportDate} />
              </div>
            ) : (
              <div className="mb-4">
                <label className="label">เลือกเดือน</label>
                <input type="month" value={exportMonth} onChange={e => setExportMonth(e.target.value)} className="input-field" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowExportModal(false)} className="btn-secondary flex-1 text-sm py-2">ยกเลิก</button>
              <button onClick={handleExport} disabled={exporting} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2">
                {exporting ? <IconSpinner /> : <IconDownload />}
                {exporting ? 'กำลัง Export...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Management Modal */}
      {showDataModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0"><IconShield /></div>
                <div>
                  <p className="font-semibold text-light">จัดการข้อมูล</p>
                  <p className="text-xs text-muted mt-0.5">สำรอง นำเข้า และล้างฐานข้อมูล</p>
                </div>
              </div>
              <button onClick={closeDataModal} className="text-muted hover:text-light transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex gap-1 bg-panel border border-border rounded-xl p-1 mb-5">
              {(['backup', 'import', 'clear'] as const).map(tab => (
                <button key={tab} onClick={() => { setDataTab(tab); setImportResult(null); setImportError(''); setClearResult('') }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${dataTab === tab ? (tab === 'clear' ? 'bg-accent2/80 text-white' : 'bg-accent text-ink') : 'text-muted hover:text-light'}`}>
                  {tab === 'backup' ? '💾 สำรองข้อมูล' : tab === 'import' ? '📥 นำเข้า' : '🗑 ล้างข้อมูล'}
                </button>
              ))}
            </div>

            {dataTab === 'backup' && (
              <div className="space-y-4">
                <div className="bg-panel rounded-xl p-4 border border-border text-sm text-muted space-y-1.5">
                  <p className="text-light font-medium mb-2">📋 รายละเอียด</p>
                  <p>• Export ข้อมูลทั้งหมดในฐานข้อมูลเป็นไฟล์ CSV</p>
                  <p>• ไฟล์นี้สามารถนำกลับเข้าระบบได้ผ่านแท็บ "นำเข้า"</p>
                  <p>• รวมข้อมูลทั้งหมด <span className="text-accent font-semibold">{records.length}</span> รายการ</p>
                </div>
                <button onClick={handleBackup} disabled={backingUp} className="btn-primary w-full flex items-center justify-center gap-2">
                  {backingUp ? <IconSpinner /> : <IconDownload />}
                  {backingUp ? 'กำลังสำรองข้อมูล...' : 'ดาวน์โหลดไฟล์สำรอง'}
                </button>
              </div>
            )}

            {dataTab === 'import' && (
              <div className="space-y-4">
                <div className="bg-panel rounded-xl p-4 border border-border text-sm text-muted space-y-1.5">
                  <p className="text-light font-medium mb-2">📋 รายละเอียด</p>
                  <p>• ใช้ไฟล์ backup ที่ได้จากระบบนี้เท่านั้น</p>
                  <p>• รายการที่มี ID ซ้ำจะถูกข้ามโดยอัตโนมัติ</p>
                  <p>• ไม่มีการลบข้อมูลเดิมออก</p>
                </div>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-light text-sm font-medium">{importFile ? importFile.name : 'คลิกเพื่อเลือกไฟล์ CSV'}</p>
                  <p className="text-muted text-xs mt-1">รองรับเฉพาะไฟล์ .csv จากระบบ</p>
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { setImportFile(e.target.files?.[0] || null); setImportResult(null); setImportError('') }} />
                </div>
                {importError && <div className="bg-accent2/10 border border-accent2/30 rounded-xl p-3 text-accent2 text-sm">{importError}</div>}
                {importResult && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm">
                    ✅ นำเข้าสำเร็จ <strong>{importResult.imported}</strong> รายการ (ข้าม <strong>{importResult.skipped}</strong> รายการซ้ำ)
                  </div>
                )}
                <button onClick={handleImport} disabled={!importFile || importing} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {importing ? <IconSpinner /> : <IconUpload />}
                  {importing ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}
                </button>
              </div>
            )}

            {dataTab === 'clear' && (
              <div className="space-y-4">
                <div className="bg-accent2/5 border border-accent2/20 rounded-xl p-4 text-sm space-y-1.5">
                  <p className="text-accent2 font-semibold mb-2">⚠️ คำเตือน: การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
                  <p className="text-muted">• จะลบข้อมูลบันทึกทั้งหมด <span className="text-accent2 font-semibold">{records.length}</span> รายการ</p>
                  <p className="text-muted">• บัญชีผู้ใช้งานจะไม่ถูกลบ</p>
                  <p className="text-muted">• แนะนำให้สำรองข้อมูลก่อนดำเนินการ</p>
                </div>
                <div>
                  <label className="label">พิมพ์ข้อความยืนยัน</label>
                  <p className="text-xs text-muted mb-2">พิมพ์: <span className="font-mono text-accent2">ยืนยันลบข้อมูลทั้งหมด</span></p>
                  <input type="text" value={clearConfirm} onChange={e => { setClearConfirm(e.target.value); setClearResult('') }} placeholder="พิมพ์ข้อความยืนยัน..." className="input-field" />
                </div>
                {clearResult && (
                  <div className={`rounded-xl p-3 text-sm ${clearResult.startsWith('ลบข้อมูลสำเร็จ') ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-accent2/10 border border-accent2/30 text-accent2'}`}>{clearResult}</div>
                )}
                <button onClick={handleClear} disabled={clearConfirm !== 'ยืนยันลบข้อมูลทั้งหมด' || clearing} className="btn-danger w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  {clearing ? <IconSpinner /> : <IconTrash />}
                  {clearing ? 'กำลังล้างข้อมูล...' : 'ล้างฐานข้อมูลทั้งหมด'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Records table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-semibold text-light">รายการบันทึก</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-panel border border-border rounded-xl p-1">
              <button onClick={() => setViewMode('today')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'today' ? 'bg-accent text-ink' : 'text-muted hover:text-light'}`}>วันที่เลือก</button>
              <button onClick={() => setViewMode('all')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'all' ? 'bg-accent text-ink' : 'text-muted hover:text-light'}`}>ทั้งหมด</button>
            </div>
            {viewMode === 'today' && (
              <ThaiDatePicker value={selectedDate} onChange={setSelectedDate} className="w-52" />
            )}
            <button onClick={() => setShowExportModal(true)} className="btn-secondary flex items-center gap-2 text-sm py-2">
              <IconDownload />Export Excel
            </button>
          </div>
        </div>

        {/* Summary bar — ยอดเงินบาททั้งหมด = ยอดเงินบาททั้งหมด - ยอดค้างทั้งหมด */}
        <div className="px-6 py-3 border-b border-border bg-panel/30 flex flex-wrap gap-4 text-sm">
          <span className="text-muted">{displayed.length} รายการ</span>
          <span className="text-blue-400">{stats.minutes} นาที</span>
          <span className="text-green-400">ยอดเงินบาท {netBaht.toLocaleString()} บาท</span>
          <span className="text-yellow-400">คูปอง {stats.coupon.toLocaleString()} บาท</span>
          <span className="text-accent2">ค้าง {stats.debt.toLocaleString()} บาท</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['เลขที่','เครื่อง','ยืม','คืน','นาที','บาท','คูปอง','ยอดค้าง','เงินจ่าย','หมายเหตุ','วันที่',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-muted">ไม่มีรายการในช่วงที่เลือก</td></tr>
              ) : displayed.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="px-4 py-3 font-mono text-accent font-semibold">{r.number}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-lg bg-panel border border-border text-xs font-mono">{r.machine}</span></td>
                  <td className="px-4 py-3 font-mono text-light">{r.borrowAt}</td>
                  <td className="px-4 py-3 font-mono text-light">{r.returnAt || '—'}</td>
                  <td className="px-4 py-3 text-blue-400 font-medium">{r.minutes}</td>
                  <td className="px-4 py-3 text-green-400 font-medium">{r.baht}</td>
                  <td className="px-4 py-3 text-yellow-400">{r.coupon || '—'}</td>
                  <td className="px-4 py-3 text-accent2 font-medium">{r.debt || '—'}</td>
                  <td className="px-4 py-3 text-muted">{r.change || '—'}</td>
                  <td className="px-4 py-3 text-muted text-xs max-w-[100px] truncate">{r.reports || '—'}</td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{toThaiDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setConfirmTarget(r)} className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-accent2/10 border border-accent2/20 text-accent2 flex items-center justify-center hover:bg-accent2/20 transition-all" title="ลบรายการ">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {displayed.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-panel/50">
                  <td colSpan={4} className="px-4 py-3 text-xs text-muted font-medium uppercase">รวม</td>
                  <td className="px-4 py-3 text-blue-400 font-bold">{stats.minutes}</td>
                  {/* ยอดเงินบาททั้งหมด = ยอดเงินบาททั้งหมด - ยอดค้างทั้งหมด */}
                  <td className="px-4 py-3 text-green-400 font-bold">{netBaht.toLocaleString()}</td>
                  <td className="px-4 py-3 text-yellow-400 font-bold">{stats.coupon.toLocaleString()}</td>
                  <td className="px-4 py-3 text-accent2 font-bold">{stats.debt.toLocaleString()}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  )
}
