import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

function isValidDate(s: string | null | undefined): boolean {
  if (!s) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

const VALID_STATUSES = new Set(['active', 'harvested', 'failed'])

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const cropId = parseInt(id, 10)
    if (Number.isNaN(cropId)) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const existing = await db.crop.findFirst({
      where: { id: cropId, farm: { userId: user.id } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const body = await req.json()
    const name = (body.name ?? '').toString().trim()
    if (!name) {
      return NextResponse.json(
        { error: 'اسم المحصول مطلوب' },
        { status: 400 }
      )
    }
    const variety = (body.variety ?? '').toString().trim() || null
    const plantingDate = isValidDate(body.plantingDate)
      ? body.plantingDate
      : null
    let area: number | null = null
    if (body.area !== '' && body.area !== null && body.area !== undefined) {
      const n = Number(body.area)
      if (!isNaN(n)) area = n
    }
    let status = existing.status
    if (typeof body.status === 'string') {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json(
          { error: 'حالة غير صالحة' },
          { status: 400 }
        )
      }
      status = body.status
    }

    const crop = await db.crop.update({
      where: { id: cropId },
      data: { name, variety, plantingDate, area, status },
    })
    return NextResponse.json({ ok: true, crop })
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
    const cropId = parseInt(id, 10)
    if (Number.isNaN(cropId)) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const existing = await db.crop.findFirst({
      where: { id: cropId, farm: { userId: user.id } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    // Cascade delete: treatments deleted via onDelete: Cascade
    // Visits referencing this crop get SET NULL
    await db.crop.delete({ where: { id: cropId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
