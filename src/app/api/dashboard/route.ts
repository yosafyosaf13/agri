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

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const today = new Date(`${todayISO()}T00:00:00Z`).getTime()
  const d = new Date(`${iso}T00:00:00Z`).getTime()
  return Math.round((d - today) / 86400000)
}

export async function GET() {
  try {
    const user = await requireUser()

    const today = todayISO()
    const todayPlus7 = addDays(today, 7)

    // ─── Stats (scope all by user_id via joins for correctness) ───
    const [visitsToday, farmsCount, alertsNext7, overdue] = await Promise.all([
      db.visit.count({
        where: { userId: user.id, visitDate: today },
      }),
      db.farm.count({ where: { userId: user.id } }),
      db.treatment.count({
        where: {
          done: false,
          nextDate: { not: null, gte: today, lte: todayPlus7 },
          crop: { farm: { userId: user.id } },
        },
      }),
      db.treatment.count({
        where: {
          done: false,
          nextDate: { not: null, lt: today },
          crop: { farm: { userId: user.id } },
        },
      }),
    ])

    // ─── Alerts list: pending treatments due within 7 days OR overdue ───
    const alertsRaw = await db.treatment.findMany({
      where: {
        done: false,
        nextDate: { not: null, lte: todayPlus7 },
        crop: { farm: { userId: user.id } },
      },
      include: {
        crop: { include: { farm: true } },
      },
      orderBy: { nextDate: 'asc' },
      take: 20,
    })

    const alerts = alertsRaw.map((t) => {
      const nextDate = t.nextDate
      const isOverdue = nextDate ? nextDate < today : false
      const daysLeft = daysUntil(nextDate)
      return {
        id: t.id,
        cropName: t.crop.name,
        farmName: t.crop.farm.name,
        type: t.type as 'spray' | 'fertilize' | 'control' | 'other',
        product: t.product,
        dose: t.dose,
        nextDate,
        isOverdue,
        daysLeft,
      }
    })

    // ─── Recent visits: last 8 ───
    const recentVisitsRaw = await db.visit.findMany({
      where: { userId: user.id },
      include: {
        farm: true,
        crop: true,
        photos: { take: 1, orderBy: { id: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })

    const recentVisits = recentVisitsRaw.map((v) => ({
      id: v.id,
      farmName: v.farm.name,
      cropName: v.crop?.name ?? null,
      visitDate: v.visitDate,
      notes: v.notes,
      thumbPath: v.photos[0]?.photoPath ?? null,
    }))

    // ─── Analytics: visits over last 14 days ───
    const fourteenDaysAgo = addDays(today, -13)
    const visitsForChart = await db.visit.findMany({
      where: {
        userId: user.id,
        visitDate: { gte: fourteenDaysAgo, lte: today },
      },
      select: { visitDate: true },
    })
    // Build a 14-day bucket
    const visitsTrend: { date: string; label: string; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today, -i)
      const dt = new Date(`${d}T00:00:00Z`)
      const label = `${dt.getUTCDate()}/${dt.getUTCMonth() + 1}`
      const count = visitsForChart.filter((v) => v.visitDate === d).length
      visitsTrend.push({ date: d, label, count })
    }

    // ─── Analytics: treatments by type (all-time, scoped) ───
    const treatmentsByTypeRaw = await db.treatment.groupBy({
      by: ['type'],
      where: { crop: { farm: { userId: user.id } } },
      _count: { _all: true },
    })
    const treatmentsByType = {
      spray: 0,
      fertilize: 0,
      control: 0,
      other: 0,
    }
    for (const row of treatmentsByTypeRaw) {
      const k = row.type as keyof typeof treatmentsByType
      if (k in treatmentsByType) treatmentsByType[k] = row._count._all
    }

    // ─── Analytics: crop status counts ───
    const cropStatusRaw = await db.crop.groupBy({
      by: ['status'],
      where: { farm: { userId: user.id } },
      _count: { _all: true },
    })
    const cropStatus = { active: 0, harvested: 0, failed: 0 }
    for (const row of cropStatusRaw) {
      const k = row.status as keyof typeof cropStatus
      if (k in cropStatus) cropStatus[k] = row._count._all
    }

    // ─── Activity feed: recent 8 actions (visits + treatments), merged + sorted ───
    const recentVisitsForFeed = await db.visit.findMany({
      where: { userId: user.id },
      include: { farm: { select: { name: true } }, crop: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    const recentTreatmentsForFeed = await db.treatment.findMany({
      where: { crop: { farm: { userId: user.id } } },
      include: { crop: { include: { farm: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    const activityFeed = [
      ...recentVisitsForFeed.map((v) => ({
        id: `visit-${v.id}`,
        type: 'visit_created' as const,
        createdAt: v.createdAt.toISOString(),
        farmName: v.farm.name,
        cropName: v.crop?.name ?? null,
        visitDate: v.visitDate,
      })),
      ...recentTreatmentsForFeed.map((t) => ({
        id: `treatment-${t.id}`,
        type: 'treatment_created' as const,
        createdAt: t.createdAt.toISOString(),
        farmName: t.crop.farm.name,
        cropName: t.crop.name,
        treatmentType: t.type,
        product: t.product,
      })),
    ]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 8)

    return NextResponse.json({
      visitsToday,
      alertsNext7,
      overdue,
      farmsCount,
      alerts,
      recentVisits,
      // Analytics
      visitsTrend,
      treatmentsByType,
      cropStatus,
      // Activity feed
      activityFeed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
