import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// ─── PATCH /api/treatments/[id]/edit — update treatment fields inline ───
// Body: { nextDate?: string, product?: string, dose?: string, notes?: string }
// Only updates provided fields. Scoped to user via crop→farm join.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const { id } = await params
    const treatmentId = Number(id)
    if (!treatmentId) {
      return NextResponse.json(
        { error: 'معرّف المعالجة غير صحيح' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}

    // Validate + sanitize each provided field
    if (typeof body?.nextDate === 'string') {
      // Allow empty string to clear the date, or a YYYY-MM-DD date
      const d = body.nextDate.trim()
      if (d === '') {
        updates.nextDate = null
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        updates.nextDate = d
      } else {
        return NextResponse.json(
          { error: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' },
          { status: 400 }
        )
      }
    }
    if (typeof body?.product === 'string') {
      updates.product = body.product.trim().slice(0, 200) || null
    }
    if (typeof body?.dose === 'string') {
      updates.dose = body.dose.trim().slice(0, 200) || null
    }
    if (typeof body?.notes === 'string') {
      updates.notes = body.notes.trim().slice(0, 1000) || null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'لا توجد حقول للتحديث' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existing = await db.treatment.findFirst({
      where: {
        id: treatmentId,
        crop: { farm: { userId: user.id } },
      },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'المعالجة غير موجودة' },
        { status: 404 }
      )
    }

    const updated = await db.treatment.update({
      where: { id: treatmentId },
      data: updates,
    })

    return NextResponse.json({
      id: updated.id,
      nextDate: updated.nextDate,
      product: updated.product,
      dose: updated.dose,
      notes: updated.notes,
    })
  } catch (err) {
    console.error('[/api/treatments/[id]/edit] error:', err)
    return NextResponse.json(
      { error: 'فشل تحديث المعالجة' },
      { status: 500 }
    )
  }
}
