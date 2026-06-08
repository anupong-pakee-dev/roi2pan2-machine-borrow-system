import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    if (body.confirm !== 'ยืนยันลบข้อมูลทั้งหมด') {
      return NextResponse.json({ error: 'รหัสยืนยันไม่ถูกต้อง' }, { status: 400 })
    }

    const { from, to } = body
    const where: { createdAt?: { gte?: Date; lte?: Date } } = {}
    if (from) {
      where.createdAt = { ...where.createdAt, gte: new Date(from + 'T00:00:00+07:00') }
    }
    if (to) {
      where.createdAt = { ...where.createdAt, lte: new Date(to + 'T23:59:59+07:00') }
    }

    const { count } = await prisma.record.deleteMany({ where })
    return NextResponse.json({ deleted: count })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'ล้างข้อมูลไม่สำเร็จ' }, { status: 500 })
  }
}
