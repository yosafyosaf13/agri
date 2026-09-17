import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    const { id } = await params
    const body = await req.json()
    const data: any = {}
    if (body.status) data.status = body.status
    if (body.treatmentNotes) data.treatmentNotes = body.treatmentNotes
    if (body.status === 'treated' || body.status === 'resolved') {
      data.treatedAt = new Date()
    }
    const updated = await db.infectionPoint.update({
      where: { id: Number(id) },
      data,
    })
    return NextResponse.json({ ok: true, id: updated.id, status: updated.status })
  } catch (err) {
    return NextResponse.json({ error: 'فشل التحديث' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    const { id } = await params
    await db.infectionPoint.delete({ where: { id: Number(id) } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'فشل الحذف' }, { status: 500 })
  }
}
