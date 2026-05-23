import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 })
    }

    const text = await file.text()
    // Remove BOM if present
    const cleaned = text.replace(/^\uFEFF/, '')
    const lines = cleaned.split('\n').filter(l => l.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'ไฟล์ไม่มีข้อมูล' }, { status: 400 })
    }

    const headers = parseCSVLine(lines[0])
    // Expected: id, number, machine, borrowAt, returnAt, status, minutes, baht, coupon, debt, change, reports, createdAt
    const isBackupFormat = headers.includes('id') && headers.includes('createdAt')

    if (!isBackupFormat) {
      return NextResponse.json({ error: 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์ backup ที่ export จากระบบ' }, { status: 400 })
    }

    const idx = (col: string) => headers.indexOf(col)

    let imported = 0
    let skipped = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      if (cols.length < 5) continue

      const id = cols[idx('id')]
      if (!id) continue

      // Check if record already exists
      const existing = await prisma.record.findUnique({ where: { id } })
      if (existing) {
        skipped++
        continue
      }

      const createdAtRaw = cols[idx('createdAt')]
      const createdAt = createdAtRaw ? new Date(createdAtRaw) : new Date()

      await prisma.record.create({
        data: {
          id,
          number: parseInt(cols[idx('number')]) || 0,
          machine: cols[idx('machine')] || '',
          borrowAt: cols[idx('borrowAt')] || '',
          returnAt: cols[idx('returnAt')] || '',
          status: cols[idx('status')] || 'completed',
          minutes: parseInt(cols[idx('minutes')]) || 0,
          baht: parseInt(cols[idx('baht')]) || 0,
          coupon: parseInt(cols[idx('coupon')]) || 0,
          debt: parseInt(cols[idx('debt')]) || 0,
          change: parseInt(cols[idx('change')]) || 0,
          reports: cols[idx('reports')] || null,
          createdAt,
        },
      })
      imported++
    }

    return NextResponse.json({ imported, skipped, total: imported + skipped })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'นำเข้าข้อมูลไม่สำเร็จ' }, { status: 500 })
  }
}
