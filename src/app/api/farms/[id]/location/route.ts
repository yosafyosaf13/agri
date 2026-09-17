import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    const { id } = await params
    const farmId = Number(id)
    const body = await req.json()
    const data: any = {}
    if (typeof body.latitude === 'number') data.latitude = body.latitude
    if (typeof body.longitude === 'number') data.longitude = body.longitude
    if (typeof body.boundary === 'string') data.boundary = body.boundary || null
    const updated = await db.farm.update({ where: { id: farmId }, data })
    return NextResponse.json({ ok: true, latitude: updated.latitude, longitude: updated.longitude })
  } catch (err) {
    return NextResponse.json({ error: 'فشل تحديث الموقع' }, { status: 500 })
  }
}
