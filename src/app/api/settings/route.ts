import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, hashPassword, verifyPassword } from '@/lib/auth'

export const runtime = 'nodejs'

export async function PUT(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const updates: { fullName?: string; passwordHash?: string } = {}

    if (typeof body.fullName === 'string') {
      const fn = body.fullName.trim()
      if (fn) updates.fullName = fn
    }

    if (body.newPassword) {
      // Password change requires current password
      const current = body.currentPassword ?? ''
      if (!current) {
        return NextResponse.json(
          { error: 'كلمة السر الحالية غير صحيحة' },
          { status: 400 }
        )
      }
      if (!verifyPassword(current, user.passwordHash)) {
        return NextResponse.json(
          { error: 'كلمة السر الحالية غير صحيحة' },
          { status: 400 }
        )
      }
      const np = body.newPassword.toString()
      if (np.length < 6) {
        return NextResponse.json(
          { error: 'كلمة السر الجديدة قصيرة جداً (6 أحرف على الأقل)' },
          { status: 400 }
        )
      }
      if (body.confirmPassword !== body.newPassword) {
        return NextResponse.json(
          { error: 'كلمتا السر غير متطابقتين' },
          { status: 400 }
        )
      }
      updates.passwordHash = hashPassword(np)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true, user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role } })
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: updates,
    })
    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        username: updated.username,
        fullName: updated.fullName,
        role: updated.role,
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
