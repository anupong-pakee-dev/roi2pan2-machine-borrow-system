import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { username, password, role } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'กรอกข้อมูลให้ครบ' }, { status: 400 })
  }
  if (!['staff', 'admin'].includes(role ?? '')) {
    return NextResponse.json({ error: 'role ไม่ถูกต้อง' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  try {
    const user = await prisma.user.create({
      data: { username, password: hashed, role: role ?? 'staff' },
      select: { id: true, username: true, role: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (e: unknown) {
    const isUnique = (e as { code?: string })?.code === 'P2002'
    return NextResponse.json(
      { error: isUnique ? 'Username นี้มีอยู่แล้ว' : 'สร้างผู้ใช้ไม่สำเร็จ' },
      { status: isUnique ? 409 : 500 }
    )
  }
}
