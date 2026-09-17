import { cookies } from 'next/headers'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'

// ─── Password hashing (scrypt — Node built-in, no deps) ───
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  // Support both legacy bcrypt-style and our scrypt format
  if (stored.startsWith('scrypt:')) {
    const [, salt, hash] = stored.split(':')
    const hashBuf = Buffer.from(hash, 'hex')
    const testBuf = scryptSync(password, salt, 64)
    return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf)
  }
  // Fallback: plain (for seeded admin/admin123 if needed) — not recommended
  return password === stored
}

// ─── Session (signed cookie) ───
const SESSION_COOKIE = 'agri_session'
const SECRET = process.env.AUTH_SECRET || 'agri-field-work-secret-change-me'

function sign(payload: string): string {
  const { createHmac } = require('crypto')
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

function verify(token: string): string | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  const sig = parts.pop()!
  const payload = parts.join('.')
  const { createHmac } = require('crypto')
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex')
  if (sig.length !== expected.length) return null
  try {
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return payload
}

export async function createSession(userId: number) {
  const payload = String(userId)
  const token = sign(payload)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSessionUserId(): Promise<number | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = verify(token)
  if (!payload) return null
  const id = parseInt(payload, 10)
  return Number.isNaN(id) ? null : id
}

export async function getCurrentUser() {
  const id = await getSessionUserId()
  if (!id) return null
  const user = await db.user.findUnique({ where: { id } })
  return user
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}
