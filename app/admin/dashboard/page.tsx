import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AdminActions from './AdminActions'
import AdminDashboardClient from './AdminDashboardClient'
import DataManagementCard from './DataManagementCard'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')

  const [users, allRecords] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, username: true, role: true, createdAt: true } }),
    prisma.record.findMany({ orderBy: { createdAt: 'desc' } }),
  ])

  const totalMinutes = allRecords.reduce((s, r) => s + r.minutes, 0)
  const totalBaht = allRecords.reduce((s, r) => s + r.baht, 0)
  const totalDebt = allRecords.reduce((s, r) => s + r.debt, 0)
  const totalCoupon = allRecords.reduce((s, r) => s + r.coupon, 0)

  const machineMap: Record<string, number> = {}
  allRecords.forEach(r => { machineMap[r.machine] = (machineMap[r.machine] || 0) + 1 })
  const topMachines = Object.entries(machineMap).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar username={session.username} role={session.role} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f5a623" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-light">Admin Dashboard</h1>
            <p className="text-muted text-sm">จัดการข้อมูลและผู้ใช้ระบบ</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="รายการทั้งหมด" value={allRecords.length} unit="รายการ" icon="📋" color="text-accent" />
          <StatCard label="นาทีรวม" value={totalMinutes} unit="นาที" icon="⏱" color="text-blue-400" />
          {/* ยอดเงินบาททั้งหมด = ยอดเงินบาททั้งหมด - ยอดค้างทั้งหมด */}
          <StatCard label="ยอดเงินบาททั้งหมด" value={totalBaht - totalDebt} unit="บาท" icon="💰" color="text-green-400" />
          <StatCard label="ยอดค้างรวม" value={totalDebt} unit="บาท" icon="📌" color="text-accent2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-display font-semibold text-light">ผู้ใช้งานระบบ</h2>
              <span className="badge badge-admin">{users.length} คน</span>
            </div>
            <div className="divide-y divide-border">
              {users.map(u => (
                <div key={u.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-light">{u.username}</p>
                    <p className="text-xs text-muted font-mono">{u.id.slice(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={u.role === 'admin' ? 'badge-admin' : 'badge-user'}>{u.role}</span>
                    <AdminActions userId={u.id} username={u.username} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Machine usage + finance */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-display font-semibold text-light">เครื่องที่ใช้บ่อย</h2>
            </div>
            <div className="px-6 py-4 space-y-3">
              {topMachines.length === 0 ? (
                <p className="text-muted text-sm">ยังไม่มีข้อมูล</p>
              ) : topMachines.map(([machine, count]) => {
                const max = topMachines[0][1]
                const pct = Math.round((count / max) * 100)
                return (
                  <div key={machine}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-sm text-light">{machine}</span>
                      <span className="text-xs text-muted">{count} ครั้ง</span>
                    </div>
                    <div className="h-2 bg-panel rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-6 py-4 border-t border-border">
              <h3 className="text-xs text-muted uppercase tracking-wider mb-3">สรุปการเงิน</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-panel rounded-xl p-3">
                  <p className="text-accent2 font-display font-bold text-lg">{totalDebt.toLocaleString()}</p>
                  <p className="text-xs text-muted">ยอดค้างรวม (บาท)</p>
                </div>
                <div className="bg-panel rounded-xl p-3">
                  <p className="text-yellow-400 font-display font-bold text-lg">{totalCoupon.toLocaleString()}</p>
                  <p className="text-xs text-muted">คูปองรวม (บาท)</p>
                </div>
                <div className="bg-panel rounded-xl p-3">
                  <p className="text-green-400 font-display font-bold text-lg">{(totalBaht - totalDebt).toLocaleString()}</p>
                  {/* ยอดเงินบาททั้งหมด = ยอดเงินบาททั้งหมด - ยอดค้างทั้งหมด */}
                  <p className="text-xs text-muted">ยอดเงินบาททั้งหมด (บาท)</p>
                </div>
                <div className="bg-panel rounded-xl p-3">
                  <p className="text-blue-400 font-display font-bold text-lg">{totalBaht.toLocaleString()}</p>
                  <p className="text-xs text-muted">รายได้รวม (บาท)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data management: export / backup / import / clear */}
        <DataManagementCard totalRecords={allRecords.length} />

        {/* Records with filter + export */}
        <AdminDashboardClient records={allRecords} />
      </main>
      <Footer />
    </div>
  )
}

function StatCard({ label, value, unit, icon, color }: {
  label: string; value: number; unit: string; icon: string; color: string
}) {
  return (
    <div className="stat-card">
      <span className="text-xl">{icon}</span>
      <p className={`text-2xl font-display font-bold ${color}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-muted mt-0.5">{unit}</p>
      <p className="text-xs text-muted/60 mt-1">{label}</p>
    </div>
  )
}
