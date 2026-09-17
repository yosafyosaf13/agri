import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    const url = new URL(req.url)
    const farmId = url.searchParams.get('farmId')
    const where: any = {}
    if (farmId) where.farmId = Number(farmId)
    const points = await db.infectionPoint.findMany({
      where,
      include: {
        farm: { select: { name: true } },
        crop: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      points: points.map(p => ({
        id: p.id, farmId: p.farmId, cropId: p.cropId,
        latitude: p.latitude, longitude: p.longitude,
        type: p.type, severity: p.severity, description: p.description,
        status: p.status, teamId: p.teamId, reportedBy: p.reportedBy,
        treatedAt: p.treatedAt?.toISOString() || null,
        treatmentNotes: p.treatmentNotes,
        farmName: p.farm.name, cropName: p.crop?.name || null,
        createdAt: p.createdAt.toISOString(),
      }))
    })
  } catch (err) {
    return NextResponse.json({ error: 'فشل تحميل نقاط الإصابة' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    const body = await req.json()
    const { farmId, cropId, latitude, longitude, type, severity, description, teamId } = body
    if (!farmId || latitude === undefined || longitude === undefined || !type) {
      return NextResponse.json({ error: 'الحقول الأساسية مطلوبة' }, { status: 400 })
    }
    const point = await db.infectionPoint.create({
      data: {
        farmId: Number(farmId),
        cropId: cropId ? Number(cropId) : null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        type, severity: severity || 'medium',
        description: description || null,
        teamId: teamId ? Number(teamId) : null,
        reportedBy: user.id,
      }
    })
    return NextResponse.json({ ok: true, id: point.id })
  } catch (err) {
    return NextResponse.json({ error: 'فشل إنشاء نقطة الإصابة' }, { status: 500 })
  }
}
