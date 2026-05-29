import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import RecordForm from './RecordForm'

export const dynamic = 'force-dynamic'

export default async function FormPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [lastRecord, activeRecords, dbMachines] = await Promise.all([
    prisma.record.findFirst({ orderBy: { number: 'desc' }, select: { number: true } }),
    prisma.record.findMany({ where: { status: 'borrowing' }, select: { machine: true } }),
    prisma.machine.findMany({ select: { name: true } }),
  ])

  const nextNumber = (lastRecord?.number ?? 199) + 1
  const activeMachines = activeRecords.map(r => r.machine)

  const machineList = dbMachines.map(r => r.name).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0
    const nb = parseInt(b.replace(/\D/g, '')) || 0
    return na - nb || a.localeCompare(b)
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar username={session.username} role={session.role} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <header>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
            เริ่มยืมเครื่อง
          </h1>
          <p className="text-muted text-sm mt-1">
            เลือกหมายเลขเครื่องและเริ่มจับเวลา · เวลาคืนจะบันทึกเมื่อคืน
          </p>
        </header>
        <div className="card">
          <RecordForm
            nextNumber={nextNumber}
            activeMachines={activeMachines}
            machineList={machineList}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
