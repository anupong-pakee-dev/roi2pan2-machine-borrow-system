import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function toThaiDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', calendar: 'buddhist' } as Intl.DateTimeFormatOptions)
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const records = await prisma.record.findMany({ orderBy: { createdAt: 'asc' } })

  // Full backup CSV with all fields including id and createdAt (ISO) for re-import
  const headers = [
    'id', 'number', 'machine', 'borrowAt', 'returnAt', 'status',
    'minutes', 'baht', 'coupon', 'debt', 'change', 'reports', 'createdAt'
  ]

  const rows = records.map(r => [
    r.id,
    r.number,
    r.machine,
    r.borrowAt,
    r.returnAt,
    r.status,
    r.minutes,
    r.baht,
    r.coupon,
    r.debt,
    r.change,
    r.reports || '',
    r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  ])

  const csv = '\uFEFF' + [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const now = new Date().toISOString().slice(0, 10)
  const filename = `backup-${now}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
