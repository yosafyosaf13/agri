import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, hashPassword } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await requireUser()
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المسؤول فقط' }, { status: 403 })
    }
    const users = await db.user.findMany({
      include: { team: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ users: users.map(u => ({
      id: u.id, username: u.username, fullName: u.fullName, role: u.role,
      phone: u.phone, specialty: u.specialty, teamId: u.teamId, active: u.active,
      teamName: u.team?.name, teamType: u.team?.type, createdAt: u.createdAt.toISOString(),
    })) })
  } catch (err) {
    return NextResponse.json({ error: 'فشل تحميل المستخدمين' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المسؤول فقط' }, { status: 403 })
    }
    const body = await req.json()
    const { username, password, fullName, role, phone, specialty, teamId } = body
    if (!username || !password || !fullName) {
      return NextResponse.json({ error: 'الحقول الأساسية مطلوبة' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم موجود' }, { status: 400 })
    }
    const created = await db.user.create({
      data: { username, passwordHash: hashPassword(password), fullName, role: role || 'engineer', phone, specialty, teamId: teamId || null },
    })
    return NextResponse.json({ ok: true, user: { id: created.id, username: created.username } })
  } catch (err) {
    return NextResponse.json({ error: 'فشل إنشاء المستخدم' }, { status: 500 })
  }
}
