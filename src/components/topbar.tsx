'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useState } from 'react'
import { useViewStore, type ViewName } from '@/lib/view-store'
import { USER_ROLES } from '@/lib/treatment-types'
import { formatDate, todayISO } from '@/lib/format'
import { api, ApiError, type AuthUser } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Menu, LogOut, Search, Settings, Sprout, ClipboardList, LayoutDashboard, CalendarDays, FileText, Map, Users, Satellite } from 'lucide-react'

interface TopbarProps {
  user: AuthUser
  onLogout: () => void
}

interface NavItem {
  view: ViewName
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { view: 'dashboard', label: 'لوحة اليوم', icon: <LayoutDashboard className="size-4" /> },
  { view: 'farms', label: 'المزارع', icon: <Sprout className="size-4" /> },
  { view: 'visits', label: 'الزيارات', icon: <ClipboardList className="size-4" /> },
  { view: 'calendar', label: 'التقويم', icon: <CalendarDays className="size-4" /> },
  { view: 'sat-map', label: 'الأقمار', icon: <Satellite className="size-4" /> },
  { view: 'farm-map', label: 'الخريطة', icon: <Map className="size-4" /> },
  { view: 'team', label: 'الفريق', icon: <Users className="size-4" /> },
  { view: 'reports', label: 'تقارير', icon: <FileText className="size-4" /> },
  { view: 'search', label: 'بحث', icon: <Search className="size-4" /> },
  { view: 'settings', label: 'إعدادات', icon: <Settings className="size-4" /> },
]

export function Topbar({ user, onLogout }: TopbarProps) {
  const activeView = useViewStore((s) => s.activeView)
  const setActiveView = useViewStore((s) => s.setActiveView)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { toast } = useToast()

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await api.post('/api/auth/logout')
      onLogout()
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description:
          err instanceof ApiError ? err.message : 'فشل تسجيل الخروج',
        variant: 'destructive',
      })
    } finally {
      setLoggingOut(false)
    }
  }

  function navTo(view: ViewName) {
    setActiveView(view)
    setMobileOpen(false)
  }

  return (
    <header
      className="sticky top-0 z-40 text-white shadow-md"
      style={{ background: '#1f3a26' }}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Right (RTL start): app name + version */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navTo('dashboard')}
            className="font-bold text-base sm:text-lg truncate hover:opacity-90 transition-opacity"
          >
            <span className="text-xl ml-1" aria-hidden>
              🌱
            </span>
            إدارة العمل الميداني الزراعي
          </button>
          <Badge className="bg-white/15 text-white text-[10px] hover:bg-white/15 hidden sm:inline-flex">
            2.0
          </Badge>
        </div>

        {/* Center nav (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => navTo(item.view)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${
                activeView === item.view
                  ? 'nav-active'
                  : 'text-white/85 hover:bg-white/10'
              }`}
              style={
                activeView === item.view
                  ? { background: '#4a7c59' }
                  : undefined
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Left (RTL end): welcome + logout (desktop) */}
        <div className="hidden md:flex items-center gap-2 text-sm">
          <span className="text-white/90">
            مرحباً {user.fullName} 👋
          </span>
          <Badge className="bg-white/15 text-white hover:bg-white/15">
            {USER_ROLES[user.role as keyof typeof USER_ROLES] ?? user.role}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-white hover:bg-white/15 hover:text-white h-8"
          >
            <LogOut className="size-4" />
            تسجيل الخروج
          </Button>
        </div>

        {/* Mobile menu button */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden text-white hover:bg-white/15"
              aria-label="القائمة"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72" style={{ background: '#1f3a26' }}>
            <SheetHeader>
              <SheetTitle className="text-white">
                <span className="text-xl ml-1" aria-hidden>
                  🌱
                </span>
                إدارة العمل الميداني الزراعي
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 py-2 text-white/90 text-sm">
              مرحباً {user.fullName} 👋
              <Badge className="bg-white/15 text-white mr-2">
                {USER_ROLES[user.role as keyof typeof USER_ROLES] ?? user.role}
              </Badge>
            </div>
            <div className="px-2 pb-2 text-white/70 text-xs">
              📅 {formatDate(todayISO())}
            </div>
            <nav className="flex flex-col gap-1 px-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.view}
                  onClick={() => navTo(item.view)}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                    activeView === item.view
                      ? 'text-white'
                      : 'text-white/85 hover:bg-white/10'
                  }`}
                  style={
                    activeView === item.view
                      ? { background: '#4a7c59' }
                      : undefined
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-auto p-3 border-t border-white/10">
              <Button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full bg-white/15 hover:bg-white/25 text-white"
              >
                <LogOut className="size-4" />
                تسجيل الخروج
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
