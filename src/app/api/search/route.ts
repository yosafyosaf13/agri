import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim()

    if (!q) {
      return NextResponse.json({
        farms: [],
        crops: [],
        visits: [],
        treatments: [],
        total: 0,
      })
    }

    const [farms, crops, visits, treatments] = await Promise.all([
      db.farm.findMany({
        where: {
          userId: user.id,
          OR: [
            { name: { contains: q } },
            { owner: { contains: q } },
            { location: { contains: q } },
          ],
        },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, owner: true, location: true },
      }),
      db.crop.findMany({
        where: {
          farm: { userId: user.id },
          OR: [{ name: { contains: q } }, { variety: { contains: q } }],
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          variety: true,
          farmId: true,
          farm: { select: { name: true } },
        },
      }),
      db.visit.findMany({
        where: {
          userId: user.id,
          OR: [
            { notes: { contains: q } },
            { farm: { name: { contains: q } } },
            { crop: { name: { contains: q } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          visitDate: true,
          notes: true,
          farm: { select: { name: true } },
          crop: { select: { name: true } },
        },
      }),
      db.treatment.findMany({
        where: {
          crop: { farm: { userId: user.id } },
          OR: [
            { product: { contains: q } },
            { notes: { contains: q } },
            { crop: { name: { contains: q } } },
          ],
        },
        orderBy: { nextDate: 'desc' },
        take: 30,
        select: {
          id: true,
          type: true,
          product: true,
          nextDate: true,
          crop: { select: { name: true, farm: { select: { name: true } } } },
        },
      }),
    ])

    const out = {
      farms: farms.map((f) => ({
        id: f.id,
        name: f.name,
        owner: f.owner,
        location: f.location,
      })),
      crops: crops.map((c) => ({
        id: c.id,
        name: c.name,
        variety: c.variety,
        farmId: c.farmId,
        farmName: c.farm.name,
      })),
      visits: visits.map((v) => ({
        id: v.id,
        visitDate: v.visitDate,
        notes: v.notes,
        farmName: v.farm.name,
        cropName: v.crop?.name ?? null,
      })),
      treatments: treatments.map((t) => ({
        id: t.id,
        type: t.type,
        product: t.product,
        nextDate: t.nextDate,
        cropName: t.crop.name,
        farmName: t.crop.farm.name,
      })),
      total:
        farms.length + crops.length + visits.length + treatments.length,
    }
    return NextResponse.json(out)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
