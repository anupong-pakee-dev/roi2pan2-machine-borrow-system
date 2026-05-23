import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function toISODate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().slice(0, 10)
}

function toThaiDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'buddhist' } as Intl.DateTimeFormatOptions)
}

function buildCSV(records: any[], label: string): string {
  const headers = ['เลขที่', 'เครื่อง', 'ยืม', 'คืน', 'นาที', 'บาท', 'คูปอง', 'ยอดค้าง', 'เงินที่จ่าย', 'สถานะ', 'หมายเหตุ', 'วันที่']
  const rows = records.map(r => [
    r.number,
    r.machine,
    r.borrowAt,
    r.returnAt,
    r.minutes,
    r.baht,
    r.coupon,
    r.debt,
    r.change,
    r.status === 'borrowing' ? 'ยังยืมอยู่' : 'คืนแล้ว',
    r.reports || '',
    toThaiDate(r.createdAt),
  ])

  const totalMinutes = records.reduce((s, r) => s + r.minutes, 0)
  const totalBaht = records.reduce((s, r) => s + r.baht, 0)
  const totalCoupon = records.reduce((s, r) => s + r.coupon, 0)
  const totalDebt = records.reduce((s, r) => s + r.debt, 0)

  rows.push([])
  rows.push(['', '', '', 'รวม', totalMinutes, totalBaht, totalCoupon, totalDebt, '', '', '', ''])

  return '\uFEFF' + [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') // 'daily' | 'monthly'
  const date = searchParams.get('date')  // YYYY-MM-DD for daily, YYYY-MM for monthly

  if (!mode || !date) {
    return NextResponse.json({ error: 'Missing mode or date' }, { status: 400 })
  }

  let records: any[]
  let filename: string

  if (mode === 'daily') {
    // Filter by exact date
    const start = new Date(date + 'T00:00:00.000Z')
    const end = new Date(date + 'T23:59:59.999Z')
    records = await prisma.record.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    })
    filename = `บันทึก-วันที่-${date}.csv`
  } else if (mode === 'monthly') {
    // date = YYYY-MM
    const [year, month] = date.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59, 999)
    records = await prisma.record.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    })
    filename = `บันทึก-เดือน-${date}.csv`
  } else {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const csv = buildCSV(records, date)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
