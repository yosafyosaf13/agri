import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// ─── PATCH /api/treatments/[id]/toggle — flip the done flag ───
// Body: { done?: boolean } — if omitted, toggles current value.
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
    const explicitDone = typeof body?.done === 'boolean' ? body.done : null

    // Find the treatment, scoped to the current user via crop→farm
    const treatment = await db.treatment.findFirst({
      where: {
        id: treatmentId,
        crop: { farm: { userId: user.id } },
      },
    })
    if (!treatment) {
      return NextResponse.json(
        { error: 'المعالجة غير موجودة' },
        { status: 404 }
      )
    }

    const newDone = explicitDone !== null ? explicitDone : !treatment.done

    const updated = await db.treatment.update({
      where: { id: treatmentId },
      data: { done: newDone },
    })

    return NextResponse.json({
      id: updated.id,
      done: updated.done,
    })
  } catch (err) {
    console.error('[/api/treatments/[id]/toggle] error:', err)
    return NextResponse.json(
      { error: 'فشل تحديث حالة المعالجة' },
      { status: 500 }
    )
  }
}
