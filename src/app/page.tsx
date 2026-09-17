'use client'

import { useEffect, useState } from 'react'
import { LoginView } from '@/components/views/login-view'
import { AppShell } from '@/components/app-shell'
import { api, ApiError, type AuthUser } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<{ user: AuthUser }>('/api/auth/me')
        if (!cancelled) {
          setUser(res.user)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function onLogin() {
    setLoading(true)
    ;(async () => {
      try {
        const res = await api.get<{ user: AuthUser }>('/api/auth/me')
        setUser(res.user)
        setLoading(false)
      } catch {
        setUser(null)
        setLoading(false)
      }
    })()
  }

  function onLogout() {
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="w-full max-w-md p-8 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginView onLogin={onLogin} />
  }

  return <AppShell user={user} onLogout={onLogout} />
}
