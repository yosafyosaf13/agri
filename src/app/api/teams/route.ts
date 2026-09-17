import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await requireUser()
    const teams = await db.team.findMany({
      include: { _count: { select: { members: true } }, leader: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ teams: teams.map(t => ({
      id: t.id, name: t.name, type: t.type, leaderId: t.leaderId,
      leaderName: t.leader?.fullName, memberCount: t._count.members, createdAt: t.createdAt.toISOString(),
    })) })
  } catch (err) {
    return NextResponse.json({ error: 'فشل تحميل الفرق' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المسؤول فقط' }, { status: 403 })
    }
    const body = await req.json()
    const { name, type, leaderId } = body
    if (!name || !type) {
      return NextResponse.json({ error: 'الاسم والنوع مطلوبان' }, { status: 400 })
    }
    const created = await db.team.create({ data: { name, type, leaderId: leaderId || null } })
    return NextResponse.json({ ok: true, id: created.id })
  } catch (err) {
    return NextResponse.json({ error: 'فشل إنشاء الفريق' }, { status: 500 })
  }
}
