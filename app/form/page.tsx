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

  const lastRecord = await prisma.record.findFirst({
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  const nextNumber = (lastRecord?.number ?? 199) + 1

  // รายการทั้งหมดสำหรับ list เครื่อง
  const allRecords = await prisma.record.findMany({
    select: { machine: true, status: true },
    orderBy: { createdAt: 'desc' },
  })

  // รายชื่อเครื่องทั้งหมดที่เคยใช้
  const machineSet = new Set<string>()
  allRecords.forEach(r => machineSet.add(r.machine))
  const machineList = Array.from(machineSet).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0
    const nb = parseInt(b.replace(/\D/g, '')) || 0
    return na - nb || a.localeCompare(b)
  })

  // เครื่องที่กำลังถูกยืมอยู่ (status = 'borrowing')
  const activeMachines = allRecords
    .filter(r => r.status === 'borrowing')
    .map(r => r.machine)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar username={session.username} role={session.role} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8">
        <div className="mb-5 sm:mb-8">
          <h1 className="font-display text-xl sm:text-3xl font-bold text-light">บันทึกการยืม</h1>
          <p className="text-muted text-sm mt-1">เลือกเครื่องและกรอกเวลายืม — เวลาคืนและการชำระจะบันทึกหลังคืนเครื่อง</p>
        </div>
        <div className="card shadow-xl shadow-black/30 !p-4 sm:!p-6">
          <RecordForm nextNumber={nextNumber} activeMachines={activeMachines} machineList={machineList} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
