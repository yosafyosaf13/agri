import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

function isValidDate(s: string | null | undefined): boolean {
  if (!s) return false
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const farmId = Number(body.farmId)
    const name = (body.name ?? '').toString().trim()
    const variety = (body.variety ?? '').toString().trim() || null
    const plantingDate = isValidDate(body.plantingDate)
      ? body.plantingDate
      : null
    let area: number | null = null
    if (body.area !== '' && body.area !== null && body.area !== undefined) {
      const n = Number(body.area)
      if (!isNaN(n)) area = n
    }

    if (!Number.isInteger(farmId) || farmId <= 0) {
      return NextResponse.json(
        { error: 'المزرعة غير صالحة' },
        { status: 400 }
      )
    }
    if (!name) {
      return NextResponse.json(
        { error: 'اسم المحصول مطلوب' },
        { status: 400 }
      )
    }

    // Validate farm belongs to user
    const farm = await db.farm.findFirst({
      where: { id: farmId, userId: user.id },
    })
    if (!farm) {
      return NextResponse.json(
        { error: 'المزرعة غير صالحة' },
        { status: 400 }
      )
    }

    const crop = await db.crop.create({
      data: {
        farmId,
        name,
        variety,
        plantingDate,
        area,
        status: 'active',
      },
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
