import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── GET /api/export — full JSON backup of the user's data ───
// Returns farms + crops + visits (with photos + treatments) as JSON.
// Useful for manual backups or migration.
export async function GET() {
  try {
    const user = await requireUser()

    const [farms, crops, visits, treatments, photos] = await Promise.all([
      db.farm.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
      db.crop.findMany({
        where: { farm: { userId: user.id } },
        include: { farm: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      db.visit.findMany({
        where: { userId: user.id },
        include: { farm: { select: { name: true } }, crop: { select: { name: true } } },
        orderBy: { visitDate: 'desc' },
      }),
      db.treatment.findMany({
        where: { crop: { farm: { userId: user.id } } },
        include: {
          crop: { select: { name: true } },
          visit: { select: { id: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      db.visitPhoto.findMany({
        where: { visit: { userId: user.id } },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const backup = {
      meta: {
        exportedAt: new Date().toISOString(),
        app: 'نظام إدارة العمل الميداني الزراعي',
        version: '2.0',
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
        counts: {
          farms: farms.length,
          crops: crops.length,
          visits: visits.length,
          treatments: treatments.length,
          photos: photos.length,
        },
      },
      farms,
      crops,
      visits,
      treatments,
      photos,
    }

    const filename = `agri-backup-${new Date().toISOString().slice(0, 10)}.json`
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
