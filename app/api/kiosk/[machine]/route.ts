import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { machine: string } }
) {
  const machine = params.machine.toUpperCase()

  try {
    const active = await prisma.record.findFirst({
      where: { machine, status: 'borrowing' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        machine: true,
        borrowAt: true,
        createdAt: true,
      },
    })

    if (!active) {
      return NextResponse.json({ active: false })
    }

    return NextResponse.json({
      active: true,
      recordId: active.id,
      machine: active.machine,
      borrowAt: active.borrowAt,
      createdAt: active.createdAt.toISOString(),
    })
  } catch {
    return NextResponse.json({ active: false }, { status: 500 })
  }
}
