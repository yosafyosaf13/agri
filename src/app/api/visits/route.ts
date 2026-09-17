import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')
const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // 5 MiB

function isValidDate(s: string | null | undefined): boolean {
  if (!s) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

const VALID_TREATMENT_TYPES = new Set(['spray', 'fertilize', 'control', 'other'])

interface TreatmentInput {
  type: string
  product?: string | null
  dose?: string | null
  nextDate?: string | null
  notes?: string | null
}

function todayISO(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`
}

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

function savePhotoFromDataUrl(dataUrl: string, index: number): string {
  // Expected: data:image/jpeg;base64,<base64>
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!match) {
    throw new Error(`الصورة #${index + 1} — صيغة data URL غير صالحة`)
  }
  const subtype = match[1].toLowerCase()
  const b64 = match[2]
  if (subtype !== 'jpeg' && subtype !== 'jpg') {
    throw new Error(`الصورة #${index + 1} — يجب أن تكون JPEG`)
  }
  let buf: Buffer
  try {
    buf = Buffer.from(b64, 'base64')
  } catch {
    throw new Error(
      `الصورة #${index + 1} — فك تشفير فاشل أو حجم يتجاوز 5MB`
    )
  }
  if (buf.length === 0 || buf.length > MAX_PHOTO_BYTES) {
    throw new Error(
      `الصورة #${index + 1} — فك تشفير فاشل أو حجم يتجاوز 5MB`
    )
  }
  // JPEG magic bytes: 0xFF 0xD8 0xFF
  if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) {
    throw new Error(`الصورة #${index + 1} — محتوى ليس JPEG صالح`)
  }
  ensureUploadDir()
  const name = `${randomBytes(8).toString('hex')}.jpg`
  const filepath = join(UPLOAD_DIR, name)
  try {
    writeFileSync(filepath, buf)
  } catch {
    throw new Error(`فشل حفظ الصورة #${index + 1}`)
  }
  return name
}

// ─── GET /api/visits ───────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const farmFilter = parseInt(searchParams.get('farm_id') || '0', 10)
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const q = (searchParams.get('q') || '').trim()

    const where: Record<string, unknown> = { userId: user.id }
    if (Number.isInteger(farmFilter) && farmFilter > 0) {
      where.farmId = farmFilter
    }
    if (isValidDate(from)) where.visitDate = { ...(where.visitDate as object), gte: from }
    if (isValidDate(to)) {
      where.visitDate = {
        ...((where.visitDate as object) || {}),
        lte: to,
      }
    }
    if (q) {
      where.OR = [
        { notes: { contains: q } },
        { farm: { name: { contains: q } } },
        { crop: { name: { contains: q } } },
      ]
    }

    const visits = await db.visit.findMany({
      where,
      include: {
        farm: true,
        crop: true,
        photos: { orderBy: { id: 'asc' } },
        treatments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const out = visits.map((v) => ({
      id: v.id,
      farmId: v.farmId,
      cropId: v.cropId,
      userId: v.userId,
      visitDate: v.visitDate,
      notes: v.notes,
      aiResult: v.aiResult,
      createdAt: v.createdAt.toISOString(),
      farmName: v.farm.name,
      cropName: v.crop?.name ?? null,
      thumbPath: v.photos[0]?.photoPath ?? null,
      photoCount: v.photos.length,
      photos: v.photos.map((p) => ({
        id: p.id,
        visitId: p.visitId,
        photoPath: p.photoPath,
        aiResult: p.aiResult,
        aiAnalyzedAt: p.aiAnalyzedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
      treatments: v.treatments.map((t) => ({
        id: t.id,
        cropId: t.cropId,
        visitId: t.visitId,
        type: t.type,
        product: t.product,
        dose: t.dose,
        nextDate: t.nextDate,
        notes: t.notes,
        done: t.done,
        createdAt: t.createdAt.toISOString(),
      })),
    }))

    return NextResponse.json({ visits: out })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST /api/visits ──────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()

    const farmId = Number(body.farmId)
    let cropId = body.cropId ? Number(body.cropId) : null
    let visitDate = (body.visitDate ?? '').toString()
    const notes = (body.notes ?? '').toString().trim() || null
    const photos: string[] = Array.isArray(body.photos) ? body.photos : []
    const treatments: TreatmentInput[] = Array.isArray(body.treatments)
      ? body.treatments
      : []

    if (!Number.isInteger(farmId) || farmId <= 0) {
      return NextResponse.json({ error: 'اختر المزرعة' }, { status: 400 })
    }
    if (!isValidDate(visitDate)) {
      visitDate = todayISO()
    }
    // Validate farm belongs to user
    const farm = await db.farm.findFirst({
      where: { id: farmId, userId: user.id },
    })
    if (!farm) {
      return NextResponse.json({ error: 'مزرعة غير صالحة' }, { status: 400 })
    }
    // If cropId provided, validate it belongs to this farm
    if (cropId) {
      const crop = await db.crop.findFirst({
        where: { id: cropId, farmId },
      })
      if (!crop) {
        cropId = null
      }
    }

    // Validate treatments
    for (const t of treatments) {
      if (!VALID_TREATMENT_TYPES.has(t.type)) {
        return NextResponse.json(
          { error: 'نوع معالجة غير صالح' },
          { status: 400 }
        )
      }
      if (!cropId) {
        return NextResponse.json(
          { error: 'اختر محصولاً عند تسجيل معالجة' },
          { status: 400 }
        )
      }
    }

    // Process photos first (before transaction)
    const savedPhotos: string[] = []
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i]
      if (typeof p !== 'string' || !p.startsWith('data:image/')) {
        continue
      }
      const name = savePhotoFromDataUrl(p, i)
      savedPhotos.push(name)
    }

    // Create visit + photos + treatments in a transaction
    const result = await db.$transaction(async (tx) => {
      const visit = await tx.visit.create({
        data: {
          farmId,
          cropId,
          userId: user.id,
          visitDate,
          notes,
        },
      })
      if (savedPhotos.length > 0) {
        await tx.visitPhoto.createMany({
          data: savedPhotos.map((p) => ({ visitId: visit.id, photoPath: p })),
        })
      }
      for (const t of treatments) {
        const nextDate = isValidDate(t.nextDate) ? t.nextDate : null
        const product = (t.product ?? '').toString().trim() || null
        const dose = (t.dose ?? '').toString().trim() || null
        const tnotes = (t.notes ?? '').toString().trim() || null
        await tx.treatment.create({
          data: {
            cropId: cropId!,
            visitId: visit.id,
            type: t.type,
            product,
            dose,
            nextDate,
            notes: tnotes,
            done: false,
          },
        })
      }
      return visit
    })

    return NextResponse.json({ ok: true, id: result.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
