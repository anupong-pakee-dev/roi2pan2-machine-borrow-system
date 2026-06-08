import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const records = await prisma.record.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { number, machine, borrowAt, status, customCreatedAt } = body

    if (!number || !machine || !borrowAt) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // validate customCreatedAt ไม่ให้อยู่ในอนาคต
    let createdAtDate: Date | undefined = undefined
    if (customCreatedAt) {
      const parsed = new Date(customCreatedAt)
      if (!isNaN(parsed.getTime()) && parsed <= new Date()) {
        createdAtDate = parsed
      }
    }

    if (status === 'borrowing') {
      const record = await prisma.record.create({
        data: {
          number:   parseInt(number),
          machine:  String(machine),
          borrowAt: String(borrowAt),
          returnAt: '',
          status:       'borrowing',
          minutes:      0,
          baht:         0,
          coupon:       0,
          debt:         0,
          change:       0,
          reports:      body.reports || null,
          ...(createdAtDate ? { createdAt: createdAtDate } : {}),
        },
      })
      return NextResponse.json(record, { status: 201 })
    }

    // "completed" = บันทึกทั้งยืมและคืนพร้อมกัน
    const { returnAt, minutes, baht, coupon, debt, change, reports } = body
    if (!returnAt) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    const record = await prisma.record.create({
      data: {
        number:   parseInt(number),
        machine:  String(machine),
        borrowAt: String(borrowAt),
        returnAt: String(returnAt),
        status:       'completed',
        minutes:  parseInt(minutes) || 0,
        baht:     parseInt(baht) || 0,
        coupon:   parseInt(coupon) || 0,
        debt:     parseInt(debt) || 0,
        change:   parseInt(change) || 0,
        reports:  reports || null,
        ...(createdAtDate ? { createdAt: createdAtDate } : {}),
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'บันทึกไม่สำเร็จ' }, { status: 500 })
  }
}
