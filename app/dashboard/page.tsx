import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

const DEFAULT_MACHINES = Array.from({ length: 29 }, (_, i) => `S${i + 1}`)

async function getMachineList(): Promise<string[]> {
  const count = await prisma.machine.count()
  if (count === 0) {
    await prisma.machine.createMany({
      data: DEFAULT_MACHINES.map(name => ({ name })),
      skipDuplicates: true,
    })
  }
  const rows = await prisma.machine.findMany({ select: { name: true } })
  return rows.map(r => r.name).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0
    const nb = parseInt(b.replace(/\D/g, '')) || 0
    return na - nb || a.localeCompare(b)
  })
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [allRecords, machineList] = await Promise.all([
    prisma.record.findMany({ orderBy: { createdAt: 'desc' } }),
    getMachineList(),
  ])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar username={session.username} role={session.role} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <DashboardClient
          records={allRecords}
          role={session.role}
          machineList={machineList}
          isAdmin={session.role === 'admin'}
        />
      </main>
      <Footer />
    </div>
  )
}
