import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // อนุญาตทั้ง admin และ user ให้ลบได้
  if (!session.role || !['admin', 'user'].includes(session.role)) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์ลบข้อมูล' }, { status: 403 })
  }

  try {
    await prisma.record.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'ลบไม่สำเร็จ' }, { status: 500 })
  }
}

// PATCH — อัปเดตการคืน (เปลี่ยน status จาก borrowing → completed)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { returnAt, minutes, baht, coupon, debt, change, reports } = body

    if (!returnAt) {
      return NextResponse.json({ error: 'กรุณาระบุเวลาคืน' }, { status: 400 })
    }

    const record = await prisma.record.update({
      where: { id: params.id },
      data: {
        returnAt: String(returnAt),
        status: 'completed',
        minutes: parseInt(minutes) || 0,
        baht: parseInt(baht) || 0,
        coupon: parseInt(coupon) || 0,
        debt: parseInt(debt) || 0,
        change: parseInt(change) || 0,
        reports: reports !== undefined ? (reports || null) : undefined,
      },
    })

    return NextResponse.json(record)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'อัปเดตไม่สำเร็จ' }, { status: 500 })
  }
}

// PUT — เปลี่ยนเครื่อง (อนุญาตทั้ง admin และ user)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { machine } = body

    if (!machine) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อเครื่อง' }, { status: 400 })
    }

    const record = await prisma.record.update({
      where: { id: params.id },
      data: { machine: String(machine) },
    })

    return NextResponse.json(record)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'เปลี่ยนเครื่องไม่สำเร็จ' }, { status: 500 })
  }
}
