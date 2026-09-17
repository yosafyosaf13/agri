import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const farmId = parseInt(id, 10)
    if (Number.isNaN(farmId)) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const farm = await db.farm.findFirst({
      where: { id: farmId, userId: user.id },
      include: {
        crops: { orderBy: { createdAt: 'desc' } },
        visits: {
          include: {
            crop: true,
            photos: { take: 1, orderBy: { id: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })
    if (!farm) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    return NextResponse.json({ farm })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const farmId = parseInt(id, 10)
    if (Number.isNaN(farmId)) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const existing = await db.farm.findFirst({
      where: { id: farmId, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const body = await req.json()
    const name = (body.name ?? '').toString().trim()
    if (!name) {
      return NextResponse.json(
        { error: 'اسم المزرعة مطلوب' },
        { status: 400 }
      )
    }
    if (name.length > 128) {
      return NextResponse.json(
        { error: 'اسم المزرعة طويل جداً' },
        { status: 400 }
      )
    }
    const owner = (body.owner ?? '').toString().trim() || null
    const location = (body.location ?? '').toString().trim() || null
    let area: number | null = null
    if (body.area !== '' && body.area !== null && body.area !== undefined) {
      const n = Number(body.area)
      if (!isNaN(n)) area = n
    }
    const farm = await db.farm.update({
      where: { id: farmId },
      data: { name, owner, area, location },
    })
    return NextResponse.json({ ok: true, farm })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const farmId = parseInt(id, 10)
    if (Number.isNaN(farmId)) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const existing = await db.farm.findFirst({
      where: { id: farmId, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    // Cascade delete handled by Prisma schema (onDelete: Cascade on crops, visits)
    await db.farm.delete({ where: { id: farmId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
