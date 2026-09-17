import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

function todayISO(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`
}

// ─── GET /api/calendar?month=YYYY-MM ───
// Returns all pending treatments + visits for the given month (default: current).
// Used by the Calendar view to render treatment due dates + visit days.
export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const url = new URL(req.url)
    const monthParam = url.searchParams.get('month') // YYYY-MM
    let year: number
    let month: number // 0-indexed
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split('-').map(Number)
      year = y
      month = m - 1
    } else {
      const now = new Date()
      year = now.getUTCFullYear()
      month = now.getUTCMonth()
    }

    // First and last day of the month
    const firstDay = new Date(Date.UTC(year, month, 1))
    const lastDay = new Date(Date.UTC(year, month + 1, 0))
    const firstISO = firstDay.toISOString().slice(0, 10)
    const lastISO = lastDay.toISOString().slice(0, 10)
    const today = todayISO()

    // Pending treatments due in this month (or earlier = overdue carried in)
    const treatmentsRaw = await db.treatment.findMany({
      where: {
        done: false,
        nextDate: { not: null, lte: lastISO },
        crop: { farm: { userId: user.id } },
      },
      include: { crop: { include: { farm: true } } },
      orderBy: { nextDate: 'asc' },
    })
    const treatments = treatmentsRaw.map((t) => ({
      id: t.id,
      type: t.type,
      product: t.product,
      nextDate: t.nextDate,
      cropName: t.crop.name,
      farmName: t.crop.farm.name,
      isOverdue: t.nextDate ? t.nextDate < today : false,
    }))

    // Visits in this month
    const visitsRaw = await db.visit.findMany({
      where: {
        userId: user.id,
        visitDate: { gte: firstISO, lte: lastISO },
      },
      include: { farm: true, crop: true },
      orderBy: { visitDate: 'asc' },
    })
    const visits = visitsRaw.map((v) => ({
      id: v.id,
      visitDate: v.visitDate,
      farmName: v.farm.name,
      cropName: v.crop?.name ?? null,
    }))

    return NextResponse.json({
      year,
      month: month + 1, // 1-indexed for client
      today,
      treatments,
      visits,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
