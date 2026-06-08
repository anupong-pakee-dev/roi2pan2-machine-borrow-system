import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DEFAULT_MACHINES = Array.from({ length: 29 }, (_, i) => `S${i + 1}`)

/** Seed ถ้าตารางว่าง */
async function ensureSeeded() {
  const count = await prisma.machine.count()
  if (count === 0) {
    await prisma.machine.createMany({
      data: DEFAULT_MACHINES.map(name => ({ name })),
      skipDuplicates: true,
    })
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureSeeded()
  const machines = await prisma.machine.findMany({
    orderBy: { name: 'asc' },
    select: { name: true },
  })
  // sort by numeric suffix
  machines.sort((a, b) => {
    const na = parseInt(a.name.replace(/\D/g, '')) || 0
    const nb = parseInt(b.name.replace(/\D/g, '')) || 0
    return na - nb || a.name.localeCompare(b.name)
  })
  return NextResponse.json(machines.map(m => m.name))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'กรุณาระบุชื่อเครื่อง' }, { status: 400 })

  try {
    await prisma.machine.create({ data: { name: name.trim().toUpperCase() } })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'ชื่อเครื่องซ้ำ' }, { status: 409 })
  }
}
