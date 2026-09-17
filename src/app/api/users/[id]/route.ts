import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, hashPassword } from '@/lib/auth'

export const runtime = 'nodejs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser()
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المسؤول فقط' }, { status: 403 })
    }
    const { id } = await params
    const uid = Number(id)
    const body = await req.json()
    const data: any = {}
    if (body.fullName) data.fullName = body.fullName
    if (body.role) data.role = body.role
    if (body.phone !== undefined) data.phone = body.phone || null
    if (body.specialty !== undefined) data.specialty = body.specialty || null
    if (body.teamId !== undefined) data.teamId = body.teamId || null
    if (body.active !== undefined) data.active = body.active
    if (body.password) data.passwordHash = hashPassword(body.password)
    const updated = await db.user.update({ where: { id: uid }, data })
    return NextResponse.json({ ok: true, id: updated.id })
  } catch (err) {
    return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser()
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'صلاحية المسؤول فقط' }, { status: 403 })
    }
    const { id } = await params
    const uid = Number(id)
    if (uid === currentUser.id) {
      return NextResponse.json({ error: 'لا يمكن حذف حسابك' }, { status: 400 })
    }
    await db.user.delete({ where: { id: uid } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'فشل الحذف' }, { status: 500 })
  }
}
