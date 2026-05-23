import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ReturnForm from './ReturnForm'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { id?: string }
}

export default async function ReturnPage({ searchParams }: Props) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = searchParams
  if (!id) redirect('/dashboard')

  const record = await prisma.record.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      machine: true,
      borrowAt: true,
      status: true,
      reports: true,
      createdAt: true,
    },
  })

  if (!record || record.status !== 'borrowing') redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar username={session.username} role={session.role} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-8">
        <div className="mb-5 sm:mb-8">
          <h1 className="font-display text-xl sm:text-3xl font-bold text-light">บันทึกการคืน</h1>
          <p className="text-muted text-sm mt-1">กรอกเวลาคืนและการชำระเงิน</p>
        </div>
        <div className="card shadow-xl shadow-black/30 !p-4 sm:!p-6">
          <ReturnForm record={record} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
