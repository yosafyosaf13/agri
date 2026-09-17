import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export const runtime = 'nodejs'

// ─── POST /api/backup — creates a JSON snapshot in /backups/ dir ───
// Triggers a manual backup. Can also be called by a cron job.
// Returns the backup file path + meta.
export async function POST() {
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
        include: {
          farm: { select: { name: true } },
          crop: { select: { name: true } },
        },
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

    // Ensure /backups/ dir exists (project root)
    const backupsDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19)
    const filename = `agri-backup-${timestamp}.json`
    const filepath = path.join(backupsDir, filename)

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8')

    // Clean backups older than 30 days
    try {
      const files = fs.readdirSync(backupsDir)
      const now = Date.now()
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      for (const f of files) {
        if (!f.startsWith('agri-backup-')) continue
        const stat = fs.statSync(path.join(backupsDir, f))
        if (now - stat.mtimeMs > thirtyDays) {
          fs.unlinkSync(path.join(backupsDir, f))
        }
      }
    } catch {
      // ignore cleanup errors
    }

    return NextResponse.json({
      ok: true,
      filename,
      path: filepath,
      size: fs.statSync(filepath).size,
      meta: backup.meta,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    console.error('[/api/backup] error:', err)
    return NextResponse.json(
      { error: 'فشل إنشاء النسخة الاحتياطية' },
      { status: 500 }
    )
  }
}

// ─── GET /api/backup — lists existing backups ───
export async function GET() {
  try {
    await requireUser()
    const backupsDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [] })
    }
    const files = fs.readdirSync(backupsDir)
      .filter((f) => f.startsWith('agri-backup-') && f.endsWith('.json'))
      .map((f) => {
        const stat = fs.statSync(path.join(backupsDir, f))
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    return NextResponse.json({ backups: files })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'UNKNOWN'
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
