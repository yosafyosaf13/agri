import { NextResponse } from 'next/server'
import { createSession, verifyPassword } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: { username?: string; password?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'بيانات الدخول غير صحيحة.' },
      { status: 400 }
    )
  }
  const username = (body.username ?? '').trim()
  const password = body.password ?? ''

  if (!username || !password) {
    return NextResponse.json(
      { error: 'أدخل اسم المستخدم وكلمة السر.' },
      { status: 400 }
    )
  }

  // tiny brute-force timing mitigation (mirrors PHP usleep(500000))
  await new Promise((r) => setTimeout(r, 300))

  const user = await db.user.findUnique({ where: { username } })
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: 'بيانات الدخول غير صحيحة.' },
      { status: 401 }
    )
  }

  await createSession(user.id)
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  })
}
