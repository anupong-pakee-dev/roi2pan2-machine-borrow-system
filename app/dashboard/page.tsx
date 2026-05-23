import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const allRecords = await prisma.record.findMany({
    orderBy: { createdAt: 'desc' },
  })

  // รวบรวมรายชื่อเครื่องทั้งหมดที่เคยใช้ในระบบ (ใช้ใน dropdown เปลี่ยนเครื่อง)
  const machineSet = new Set(allRecords.map(r => r.machine))
  const DEFAULT_MACHINES = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10','S11','S12']
  DEFAULT_MACHINES.forEach(m => machineSet.add(m))
  const machineList = Array.from(machineSet).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0
    const nb = parseInt(b.replace(/\D/g, '')) || 0
    return na - nb || a.localeCompare(b)
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar username={session.username} role={session.role} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-8 pb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl sm:text-3xl font-bold text-light">Dashboard</h1>
            <p className="text-muted text-xs sm:text-sm mt-0.5 hidden sm:block">ภาพรวมการบันทึกการยืม-คืนเครื่อง</p>
          </div>
          <Link href="/form" className="btn-primary shrink-0 flex items-center gap-1.5 text-sm py-2 px-3 sm:px-5">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            บันทึกใหม่
          </Link>
        </div>
        <DashboardClient records={allRecords} role={session.role} machineList={machineList} />
      </main>
      <Footer />
    </div>
  )
}
