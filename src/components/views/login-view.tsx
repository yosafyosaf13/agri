'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api'

export function LoginView({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      await api.post('/api/auth/login', { username, password })
      onLogin()
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'بيانات الدخول غير صحيحة.'
      toast({
        title: '⚠️ خطأ',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'linear-gradient(135deg, #4a7c59 0%, #1f3a26 100%)',
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 fade-in-up">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2" aria-hidden>
            🌱
          </div>
          <h1 className="text-2xl font-bold text-[#1f3a26] mb-1">
            إدارة العمل الميداني الزراعي
          </h1>
          <p className="text-sm text-gray-600">
            نظام إدارة الزيارات الميدانية والمحاصيل
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">اسم المستخدم</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة السر</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="h-11"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-base font-bold"
            style={{
              background: '#4a7c59',
              color: '#fff',
            }}
          >
            {loading ? '⏳ جارٍ...' : 'دخول'}
          </Button>
        </form>

        <div
          className="mt-6 p-3 rounded-md text-sm"
          style={{
            background: '#fef3c7',
            borderRight: '4px solid #f59e0b',
            color: '#92400e',
          }}
        >
          الحساب الافتراضي: admin / admin123
        </div>
      </div>
    </div>
  )
}
