import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await requireUser()
    const farms = await db.farm.findMany({
      where: { userId: user.id },
      include: {
        _count: { select: { crops: true, visits: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ farms })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const name = (body.name ?? '').toString().trim()
    const owner = (body.owner ?? '').toString().trim() || null
    const areaRaw = body.area
    const location = (body.location ?? '').toString().trim() || null

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
    let area: number | null = null
    if (areaRaw !== '' && areaRaw !== null && areaRaw !== undefined) {
      const n = Number(areaRaw)
      if (!isNaN(n)) area = n
    }

    const farm = await db.farm.create({
      data: {
        userId: user.id,
        name,
        owner,
        area,
        location,
      },
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
