import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { unlinkSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')

function isValidDate(s: string | null | undefined): boolean {
  if (!s) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const visitId = parseInt(id, 10)
    if (Number.isNaN(visitId)) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const visit = await db.visit.findFirst({
      where: { id: visitId, userId: user.id },
      include: {
        farm: true,
        crop: true,
        photos: { orderBy: { id: 'asc' } },
        treatments: {
          include: { crop: { include: { farm: true } } },
          orderBy: { id: 'asc' },
        },
      },
    })
    if (!visit) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    return NextResponse.json({ visit })
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
    const visitId = parseInt(id, 10)
    if (Number.isNaN(visitId)) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const existing = await db.visit.findFirst({
      where: { id: visitId, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const body = await req.json()
    let visitDate = (body.visitDate ?? '').toString()
    if (!isValidDate(visitDate)) {
      visitDate = existing.visitDate
    }
    let cropId = existing.cropId
    if (body.cropId === null || body.cropId === undefined || body.cropId === '') {
      cropId = null
    } else {
      const cid = Number(body.cropId)
      if (Number.isInteger(cid) && cid > 0) {
        // Verify crop belongs to same farm
        const c = await db.crop.findFirst({
          where: { id: cid, farmId: existing.farmId },
        })
        if (c) cropId = cid
      }
    }
    const notes =
      body.notes === undefined
        ? existing.notes
        : (body.notes ?? '').toString().trim() || null

    const visit = await db.visit.update({
      where: { id: visitId },
      data: { visitDate, cropId, notes },
    })
    return NextResponse.json({ ok: true, visit })
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
    const visitId = parseInt(id, 10)
    if (Number.isNaN(visitId)) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    const existing = await db.visit.findFirst({
      where: { id: visitId, userId: user.id },
      include: { photos: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
    }
    // Unlink photo files from disk before deleting
    for (const p of existing.photos) {
      try {
        unlinkSync(join(UPLOAD_DIR, p.photoPath))
      } catch {
        // ignore file-not-found errors
      }
    }
    await db.visit.delete({ where: { id: visitId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
