import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AdminDashboardClient from '@/app/admin/dashboard/AdminDashboardClient'

export const dynamic = 'force-dynamic'

export default async function StaffDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'staff' && session.role !== 'admin') redirect('/dashboard')

  const allRecords = await prisma.record.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar username={session.username} role={session.role} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8">
        <header className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            ดูข้อมูลย้อนหลัง
          </h1>
          <p className="text-muted text-sm mt-1">
            ดูและกรองรายการยืม-คืนทั้งหมด · ดูข้อมูลอย่างเดียว (ไม่สามารถแก้ไขได้)
          </p>
        </header>
        <AdminDashboardClient
          records={allRecords}
          users={[]}
          currentUserId={session.id}
          readOnly={true}
        />
      </main>
      <Footer />
    </div>
  )
}
