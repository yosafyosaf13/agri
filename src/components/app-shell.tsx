'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Topbar } from '@/components/topbar'
import { AppFooter } from '@/components/app-footer'
import { DashboardView } from '@/components/views/dashboard-view'
import { FarmsView } from '@/components/views/farms-view'
import { VisitsView } from '@/components/views/visits-view'
import { SearchView } from '@/components/views/search-view'
import { SettingsView } from '@/components/views/settings-view'
import { CalendarView } from '@/components/views/calendar-view'
import { ReportsView } from '@/components/views/reports-view'
import { FarmMapView } from '@/components/views/farm-map-view'
import { TeamView } from '@/components/views/team-view'

// Leaflet requires client-side only (no SSR)
const SatMapView = dynamic(() => import('@/components/views/sat-map-view').then(m => m.SatMapView), {
  ssr: false,
  loading: () => <div className="h-96 flex items-center justify-center text-gray-400">تحميل الخريطة...</div>,
})
import { useViewStore } from '@/lib/view-store'
import { useKeyboardShortcuts, SHORTCUT_HELP } from '@/hooks/use-keyboard-shortcuts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Keyboard } from 'lucide-react'
import { OfflineBanner } from '@/components/offline-banner'
import type { AuthUser } from '@/lib/api'

interface AppShellProps {
  user: AuthUser
  onLogout: () => void
}

export function AppShell({ user, onLogout }: AppShellProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )
  const activeView = useViewStore((s) => s.activeView)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Wire global keyboard shortcuts (g + key)
  useKeyboardShortcuts()

  // '?' opens the shortcuts help
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (
        t.tagName === 'INPUT' ||
        t.tagName === 'TEXTAREA' ||
        t.isContentEditable
      ) {
        return
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setShortcutsOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
        <OfflineBanner />
        <div className="print:hidden">
          <Topbar user={user} onLogout={onLogout} />
        </div>
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'farms' && <FarmsView />}
          {activeView === 'visits' && <VisitsView />}
          {activeView === 'search' && <SearchView />}
          {activeView === 'calendar' && <CalendarView />}
          {activeView === 'reports' && <ReportsView />}
          {activeView === 'farm-map' && <FarmMapView />}
          {activeView === 'sat-map' && <SatMapView />}
          {activeView === 'team' && <TeamView user={user} />}
          {activeView === 'settings' && <SettingsView user={user} />}
        </main>
        <div className="print:hidden">
          <AppFooter />
        </div>

        {/* Floating keyboard shortcut hint button */}
        <button
          onClick={() => setShortcutsOpen(true)}
          className="hidden md:flex fixed bottom-4 right-4 print:hidden z-30 items-center gap-1.5 bg-white/80 backdrop-blur-sm text-[#1f3a26] text-xs px-3 py-2 rounded-full shadow-md border border-emerald-100 hover:bg-white transition-colors items-center"
          title="اختصارات لوحة المفاتيح (?)"
        >
          <Keyboard className="h-3.5 w-3.5" />
          <span>اختصارات</span>
          <kbd className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-mono">?</kbd>
        </button>

        {/* Keyboard shortcuts help dialog */}
        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#1f3a26]">
                <Keyboard className="h-5 w-5 text-[#4a7c59]" />
                اختصارات لوحة المفاتيح
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 text-sm">
              {SHORTCUT_HELP.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-emerald-50/50 transition-colors"
                >
                  <span className="text-gray-700">{s.action}</span>
                  <span className="flex items-center gap-1">
                    {s.keys.split(' ').map((k, i) => (
                      <kbd
                        key={i}
                        className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono font-semibold border border-gray-200"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <div className="flex items-center justify-between py-1.5 px-2">
                  <span className="text-gray-700">عرض هذه القائمة</span>
                  <kbd className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono font-semibold border border-gray-200">
                    ?
                  </kbd>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                اضغط <kbd className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">g</kbd>{' '}
                ثم حرف الشاشة للانتقال السريع. يعمل فقط عند عدم الكتابة في حقل نصي.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </QueryClientProvider>
  )
}
