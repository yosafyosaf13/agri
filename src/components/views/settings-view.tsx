'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError, type AuthUser } from '@/lib/api'
import { USER_ROLES } from '@/lib/treatment-types'
import { Download, Database, HardDrive, RefreshCw, FileJson, Trash2 } from 'lucide-react'

interface BackupEntry {
  filename: string
  size: number
  createdAt: string
}

export function SettingsView({ user }: { user: AuthUser }) {
  const [fullName, setFullName] = useState(user.fullName)
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [loadingBackups, setLoadingBackups] = useState(false)
  const { toast } = useToast()

  const refreshBackups = useCallback(async () => {
    setLoadingBackups(true)
    try {
      const res = await api.get<{ backups: BackupEntry[] }>('/api/backup')
      setBackups(res.backups)
    } catch (err) {
      // silent — backups may not exist yet
      console.warn('Failed to load backups', err)
    } finally {
      setLoadingBackups(false)
    }
  }, [])

  useEffect(() => {
    refreshBackups()
  }, [refreshBackups])

  async function createBackup() {
    if (creatingBackup) return
    setCreatingBackup(true)
    try {
      const res = await api.post<{ ok: boolean; filename: string; size: number; meta: any }>(
        '/api/backup'
      )
      toast({
        title: '✅ تم إنشاء نسخة احتياطية',
        description: `${res.filename} (${(res.size / 1024).toFixed(1)} KB)`,
      })
      await refreshBackups()
    } catch (err) {
      toast({
        title: '⚠️ فشل النسخ الاحتياطي',
        description: err instanceof ApiError ? err.message : 'تعذّر إنشاء النسخة',
        variant: 'destructive',
      })
    } finally {
      setCreatingBackup(false)
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (savingProfile) return
    setSavingProfile(true)
    try {
      await api.put('/api/settings', { fullName })
      toast({ title: '✅ تم الحفظ بنجاح' })
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (savingPass) return
    if (newPass !== confirmPass) {
      toast({
        title: '⚠️ خطأ',
        description: 'كلمتا السر غير متطابقتين',
        variant: 'destructive',
      })
      return
    }
    if (newPass.length < 6) {
      toast({
        title: '⚠️ خطأ',
        description: 'كلمة السر الجديدة قصيرة جداً (6 أحرف على الأقل)',
        variant: 'destructive',
      })
      return
    }
    setSavingPass(true)
    try {
      await api.put('/api/settings', {
        currentPassword: currentPass,
        newPassword: newPass,
        confirmPassword: confirmPass,
      })
      toast({ title: '✅ تم تحديث كلمة السر بنجاح' })
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'فشل تحديث كلمة السر',
        variant: 'destructive',
      })
    } finally {
      setSavingPass(false)
    }
  }

  async function exportData() {
    if (exporting) return
    setExporting(true)
    try {
      const res = await fetch('/api/export', { credentials: 'same-origin' })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `agri-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({
        title: '✅ تم تصدير البيانات',
        description: 'حُفظ ملف JSON يحتوي كل مزارعك ومحاصيلك وزياراتك',
      })
    } catch (err) {
      toast({
        title: '⚠️ فشل التصدير',
        description: err instanceof Error ? err.message : 'خطأ غير معروف',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4 fade-in-up max-w-3xl">
      <h2 className="text-xl sm:text-2xl font-bold text-[#1f3a26]">
        ⚙️ الإعدادات
      </h2>

      {/* Account info */}
      <Card className="p-5 gap-0">
        <div className="border-b pb-3 mb-3">
          <h3 className="font-bold text-[#1f3a26]">{user.fullName}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">👤 اسم المستخدم</span>
            <div className="font-bold mt-0.5">{user.username}</div>
          </div>
          <div>
            <span className="text-gray-500">🎭 الصلاحية</span>
            <div className="font-bold mt-0.5">
              {USER_ROLES[user.role as keyof typeof USER_ROLES] ?? user.role}
            </div>
          </div>
        </div>
      </Card>

      {/* Profile form */}
      <Card className="p-5 gap-0">
        <div className="border-b pb-3 mb-4">
          <h3 className="font-bold text-[#1f3a26]">الملف الشخصي</h3>
        </div>
        <form onSubmit={saveProfile} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="full-name">الاسم الكامل</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="المهندس التجريبي"
            />
          </div>
          <Button
            type="submit"
            disabled={savingProfile}
            className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
          >
            {savingProfile ? '⏳ جارٍ...' : '💾 حفظ'}
          </Button>
        </form>
      </Card>

      {/* Change password */}
      <Card className="p-5 gap-0">
        <div className="border-b pb-3 mb-4">
          <h3 className="font-bold text-[#1f3a26]">تغيير كلمة السر</h3>
        </div>
        <form onSubmit={changePassword} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cur-pass">كلمة السر الحالية</Label>
            <Input
              id="cur-pass"
              type="password"
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pass">كلمة السر الجديدة</Label>
            <Input
              id="new-pass"
              type="password"
              required
              minLength={6}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-500">6 أحرف على الأقل</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pass">تأكيد كلمة السر</Label>
            <Input
              id="confirm-pass"
              type="password"
              required
              minLength={6}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            disabled={savingPass}
            className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
          >
            {savingPass ? '⏳ جارٍ...' : '💾 حفظ'}
          </Button>
        </form>
      </Card>

      {/* Data export */}
      <Card className="p-5 gap-0 bg-gradient-to-bl from-emerald-50 to-white border-emerald-200">
        <h3 className="font-bold text-[#1f3a26] flex items-center gap-2 border-b border-emerald-100 pb-2 mb-3">
          <Database className="h-5 w-5 text-[#4a7c59]" />
          تصدير البيانات والنسخ الاحتياطي
        </h3>
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          صدّر كل بياناتك (المزارع، المحاصيل، الزيارات، الصور، المعاملات) كملف JSON
          واحد. مفيد للنسخ الاحتياطي أو النقل لجهاز آخر.
        </p>
        <Button
          onClick={exportData}
          disabled={exporting}
          className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
        >
          {exporting ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جارٍ التصدير...
            </>
          ) : (
            <>
              <Download className="size-4" />
              تصدير JSON
            </>
          )}
        </Button>
      </Card>

      {/* Server backups (saved on disk) */}
      <Card className="p-5 gap-0 bg-gradient-to-bl from-blue-50 to-white border-blue-200">
        <div className="flex items-center justify-between border-b border-blue-100 pb-2 mb-3">
          <h3 className="font-bold text-[#1f3a26] flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-blue-600" />
            النسخ الاحتياطية على الخادم
          </h3>
          <button
            onClick={refreshBackups}
            disabled={loadingBackups}
            className="text-xs text-blue-700 hover:text-blue-900 disabled:opacity-60 flex items-center gap-1 transition-colors"
            title="تحديث القائمة"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          أنشئ نسخة احتياطية على القرص (تُحفظ تلقائياً في مجلد <code className="bg-blue-50 px-1 rounded">/backups/</code>).
          تُحذف النسخ الأقدم من 30 يوماً تلقائياً. نسخة يومية مجدولة تلقائياً كل يوم 03:00 بتوقيت القاهرة.
        </p>
        <Button
          onClick={createBackup}
          disabled={creatingBackup}
          className="bg-blue-600 hover:bg-blue-700 text-white mb-4"
        >
          {creatingBackup ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              جارٍ الإنشاء...
            </>
          ) : (
            <>
              <HardDrive className="size-4" />
              إنشاء نسخة احتياطية الآن
            </>
          )}
        </Button>

        {/* Backups list */}
        {loadingBackups ? (
          <div className="text-center py-4 text-sm text-gray-400">
            <RefreshCw className="h-5 w-5 mx-auto mb-1 animate-spin" />
            جارٍ تحميل القائمة...
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-4 text-sm text-gray-400 border border-dashed border-blue-200 rounded-lg">
            <FileJson className="h-8 w-8 mx-auto mb-2 opacity-50" />
            لا توجد نسخ احتياطية بعد
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto scroll-pretty">
            {backups.map((b) => (
              <div
                key={b.filename}
                className="flex items-center gap-3 p-2 rounded-md bg-white border border-blue-100 hover:border-blue-200 transition-colors"
              >
                <FileJson className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#1f3a26] truncate" title={b.filename}>
                    {b.filename}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {(b.size / 1024).toFixed(1)} KB · {new Date(b.createdAt).toLocaleString('ar-EG')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
