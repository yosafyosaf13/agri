'use client'

import { useOnlineStatus } from '@/hooks/use-online-status'

// ─── OfflineBanner — shows a warning banner when the app loses connectivity ───
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      className="sticky top-0 z-50 print:hidden"
      style={{ background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)' }}
      role="alert"
    >
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-white text-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="font-semibold">⚠️ لا يوجد اتصال بالإنترنت</span>
        <span className="text-white/80 hidden sm:inline">
          — تستخدم البيانات المخزّنة مؤقتاً. ستتعافى المزامنة تلقائياً عند عودة الاتصال.
        </span>
      </div>
    </div>
  )
}
