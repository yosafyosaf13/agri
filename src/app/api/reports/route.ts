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

// ─── GET /api/reports — comprehensive stats for the Reports view ───
export async function GET() {
  try {
    const user = await requireUser()
    const today = todayISO()

    const [
      farms,
      crops,
      visits,
      treatments,
      photos,
    ] = await Promise.all([
      db.farm.findMany({
        where: { userId: user.id },
        include: {
          _count: { select: { crops: true, visits: true } },
          crops: { select: { id: true, name: true, variety: true, status: true, area: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.crop.findMany({
        where: { farm: { userId: user.id } },
        include: { farm: { select: { name: true } } },
      }),
      db.visit.findMany({
        where: { userId: user.id },
        include: {
          farm: { select: { name: true } },
          crop: { select: { name: true } },
          _count: { select: { photos: true, treatments: true } },
        },
        orderBy: { visitDate: 'desc' },
      }),
      db.treatment.findMany({
        where: { crop: { farm: { userId: user.id } } },
        include: { crop: { include: { farm: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.visitPhoto.count({
        where: { visit: { userId: user.id } },
      }),
    ])

    // ─── Aggregations ───
    const totalArea = farms.reduce((s, f) => s + (f.area ?? 0), 0)
    const cropArea = crops.reduce((s, c) => s + (c.area ?? 0), 0)

    const visitsThisMonth = visits.filter((v) =>
      v.visitDate.startsWith(today.slice(0, 7))
    ).length
    const visitsThisYear = visits.filter((v) =>
      v.visitDate.startsWith(today.slice(0, 4))
    ).length

    const treatmentsDone = treatments.filter((t) => t.done).length
    const treatmentsPending = treatments.filter((t) => !t.done).length
    const treatmentsOverdue = treatments.filter(
      (t) => !t.done && t.nextDate && t.nextDate < today
    ).length

    const treatmentsByType = {
      spray: treatments.filter((t) => t.type === 'spray').length,
      fertilize: treatments.filter((t) => t.type === 'fertilize').length,
      control: treatments.filter((t) => t.type === 'control').length,
      other: treatments.filter((t) => t.type === 'other').length,
    }

    const cropStatus = {
      active: crops.filter((c) => c.status === 'active').length,
      harvested: crops.filter((c) => c.status === 'harvested').length,
      failed: crops.filter((c) => c.status === 'failed').length,
    }

    // Visits per farm
    const visitsPerFarm = farms.map((f) => ({
      farmName: f.name,
      visitCount: f._count.visits,
      cropCount: f._count.crops,
      area: f.area ?? 0,
    }))

    // Recent treatments (last 10)
    const recentTreatments = treatments.slice(0, 10).map((t) => ({
      id: t.id,
      type: t.type,
      product: t.product,
      dose: t.dose,
      nextDate: t.nextDate,
      done: t.done,
      cropName: t.crop.name,
      farmName: t.crop.farm.name,
      createdAt: t.createdAt.toISOString(),
    }))

    return NextResponse.json({
      meta: {
        generatedAt: new Date().toISOString(),
        user: { fullName: user.fullName, username: user.username, role: user.role },
      },
      summary: {
        totalFarms: farms.length,
        totalCrops: crops.length,
        totalVisits: visits.length,
        totalTreatments: treatments.length,
        totalPhotos: photos,
        totalAreaFeddans: Number(totalArea.toFixed(2)),
        cropAreaFeddans: Number(cropArea.toFixed(2)),
        visitsThisMonth,
        visitsThisYear,
        treatmentsDone,
        treatmentsPending,
        treatmentsOverdue,
        completionRate:
          treatments.length === 0
            ? 0
            : Math.round((treatmentsDone / treatments.length) * 100),
      },
      treatmentsByType,
      cropStatus,
      visitsPerFarm,
      recentTreatments,
      farms: farms.map((f) => ({
        id: f.id,
        name: f.name,
        owner: f.owner,
        area: f.area,
        location: f.location,
        cropCount: f._count.crops,
        visitCount: f._count.visits,
        crops: f.crops,
      })),
      // For PDF export — include visits list (truncated notes)
      visits: visits.slice(0, 50).map((v) => ({
        id: v.id,
        visitDate: v.visitDate,
        farmName: v.farm.name,
        cropName: v.crop?.name ?? null,
        notes: v.notes ? v.notes.slice(0, 200) : null,
        photoCount: v._count.photos,
        treatmentCount: v._count.treatments,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
