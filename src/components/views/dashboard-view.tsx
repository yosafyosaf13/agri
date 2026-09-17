'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError, type DashboardData } from '@/lib/api'
import { TREATMENT_TYPES } from '@/lib/treatment-types'
import { formatDate, daysUntil, truncate } from '@/lib/format'
import { useViewStore } from '@/lib/view-store'
import {
  VisitsTrendChart,
  TreatmentsPieChart,
  CropStatusPieChart,
} from '@/components/dashboard-charts'

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const { toast } = useToast()
  const setActiveView = useViewStore((s) => s.setActiveView)

  const refresh = () => {
    ;(async () => {
      try {
        const d = await api.get<DashboardData>('/api/dashboard')
        setData(d)
      } catch (err) {
        toast({
          title: '⚠️ خطأ',
          description:
            err instanceof ApiError ? err.message : 'تعذّر تحديث اللوحة',
          variant: 'destructive',
        })
      }
    })()
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await api.get<DashboardData>('/api/dashboard')
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false)
          toast({
            title: '⚠️ خطأ',
            description:
              err instanceof ApiError ? err.message : 'تعذّر تحميل اللوحة',
            variant: 'destructive',
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toast])

  // Quick "mark done" from the dashboard alerts
  async function quickToggleDone(treatmentId: number) {
    setTogglingId(treatmentId)
    try {
      await api.patch(`/api/treatments/${treatmentId}/toggle`, { done: true })
      toast({ title: '✅ تمّت المعالجة' })
      refresh()
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'فشل التحديث',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl shimmer" />
          ))}
        </div>
        <div className="h-64 rounded-xl shimmer" />
        <div className="h-64 rounded-xl shimmer" />
      </div>
    )
  }

  // مهام اليوم — ترتيب حسب الأولوية
  const todayTasks = [
    ...(data.overdue > 0 ? [{ type: 'urgent', icon: '🔴', label: `${data.overdue} موعد فات`, action: 'مراجعة المعاملات الفائتة', view: 'visits' }] : []),
    ...(data.alertsNext7 > 0 ? [{ type: 'warning', icon: '🟡', label: `${data.alertsNext7} تنبيه قادم`, action: 'مراجعة المعاملات القادمة', view: 'calendar' }] : []),
    ...(data.visitsToday > 0 ? [{ type: 'info', icon: '📋', label: `${data.visitsToday} زيارة اليوم`, action: 'عرض الزيارات', view: 'visits' }] : [{ type: 'normal', icon: '📝', label: 'لا زيارات اليوم', action: 'تسجيل زيارة', view: 'visits' }]),
  ]

  const stats = [
    {
      icon: '📋',
      label: 'زيارات اليوم',
      value: data.visitsToday,
      color: 'default' as const,
      gradient: 'gradient-card-emerald',
    },
    {
      icon: '🔔',
      label: 'تنبيهات قادمة (7 أيام)',
      value: data.alertsNext7,
      color: data.alertsNext7 > 0 ? ('amber' as const) : ('default' as const),
      gradient: data.alertsNext7 > 0 ? 'gradient-card-amber' : 'gradient-card-emerald',
    },
    {
      icon: '⏰',
      label: 'مواعيد فاتت',
      value: data.overdue,
      color: data.overdue > 0 ? ('red' as const) : ('default' as const),
      gradient: data.overdue > 0 ? 'gradient-card-red' : 'gradient-card-emerald',
    },
    {
      icon: '🌾',
      label: 'مزارعك',
      value: data.farmsCount,
      color: 'default' as const,
      gradient: 'gradient-card-emerald',
    },
  ]

  return (
    <div className="space-y-6 fade-in-up">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const valueColor =
            s.color === 'amber'
              ? 'text-[#f59e0b]'
              : s.color === 'red'
                ? 'text-[#dc2626]'
                : 'text-[#1f3a26]'
          return (
            <Card
              key={i}
              className={`stat-card p-4 sm:p-5 gap-0 shadow-sm hover:shadow-lg ${s.gradient || 'gradient-card-emerald'}`}
            >
              <div className="text-2xl sm:text-3xl mb-1" aria-hidden>
                {s.icon}
              </div>
              <div className={`text-3xl sm:text-4xl font-bold ${valueColor}`}>
                {s.value}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">
                {s.label}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Today hero banner */}
      <Card
        className="overflow-hidden shadow-md border-0 text-white relative"
        style={{
          background:
            'linear-gradient(135deg, #1f3a26 0%, #4a7c59 60%, #6fa37c 100%)',
        }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm text-white/70 mb-1">
              {new Date().toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1">
              {data.visitsToday > 0
                ? `لديك ${data.visitsToday} زيارة اليوم`
                : 'لا توجد زيارات مجدولة اليوم'}
            </h2>
            <p className="text-sm text-white/85">
              {(data.alertsNext7 + data.overdue) > 0
                ? `${data.alertsNext7 + data.overdue} تنبيه نشط يحتاج اهتمامك`
                : 'كل معاملاتك تحت السيطرة ✅'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveView('calendar')}
              className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <span>📅</span>
              عرض التقويم
            </button>
            <button
              onClick={() => setActiveView('visits', { openVisitForm: true })}
              className="inline-flex items-center gap-1.5 bg-white text-[#1f3a26] hover:bg-emerald-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              <span>+</span>
              زيارة جديدة
            </button>
          </div>
        </div>
      </Card>

      {/* مهام اليوم — مرتبة حسب الأولوية */}
      <Card className="overflow-hidden shadow-sm">
        <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold">
            ✅ مهام اليوم — مرتبة حسب الأولوية
          </h2>
          <span className="text-xs bg-white/15 px-2 py-0.5 rounded">{todayTasks.length}</span>
        </div>
        <div className="p-3 space-y-2">
          {todayTasks.map((task, i) => (
            <div
              key={i}
              className={`stagger-item p-3 rounded-lg flex items-center justify-between gap-3 ${
                task.type === 'urgent' ? 'task-priority-high' :
                task.type === 'warning' ? 'task-priority-medium' :
                task.type === 'info' ? 'gradient-card-blue' :
                'task-priority-low'
              }`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl shrink-0">{task.icon}</span>
                <div>
                  <div className="font-bold text-sm text-[#1f3a26]">{task.label}</div>
                  <div className="text-xs text-gray-500">{task.action}</div>
                </div>
              </div>
              <button
                onClick={() => setActiveView(task.view as any, task.view === 'visits' && task.type === 'normal' ? { openVisitForm: true } : undefined)}
                className="text-xs px-3 py-1.5 rounded-full bg-[#4a7c59]/10 text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white font-semibold transition-colors shrink-0"
              >
                انتقال ←
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Analytics charts */}
      {data.visitsTrend && data.treatmentsByType && data.cropStatus && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="p-4 sm:p-5 shadow-sm lg:col-span-2">
            <VisitsTrendChart data={data.visitsTrend} />
          </Card>
          <Card className="p-4 sm:p-5 shadow-sm">
            <TreatmentsPieChart data={data.treatmentsByType} />
          </Card>
          <Card className="p-4 sm:p-5 shadow-sm lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CropStatusPieChart data={data.cropStatus} />
              <div className="flex flex-col justify-center gap-3">
                <h3 className="text-sm font-bold text-[#1f3a26] mb-1">
                  📊 ملخص النظام
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100">
                    <div className="text-xs text-gray-600">المزارع</div>
                    <div className="text-2xl font-bold text-[#1f3a26]">
                      {data.farmsCount}
                    </div>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
                    <div className="text-xs text-gray-600">تنبيهات نشطة</div>
                    <div className="text-2xl font-bold text-[#92400e]">
                      {data.alertsNext7 + data.overdue}
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100">
                    <div className="text-xs text-gray-600">زيارات اليوم</div>
                    <div className="text-2xl font-bold text-[#4a7c59]">
                      {data.visitsToday}
                    </div>
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 border border-red-100">
                    <div className="text-xs text-gray-600">مواعيد فاتت</div>
                    <div className="text-2xl font-bold text-[#dc2626]">
                      {data.overdue}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  💡 <span className="font-semibold text-[#1f3a26]">نصيحة:</span>{' '}
                  استخدم المساعد الذكي للسؤال عن حالتك أو طلب نصيحة زراعية فورية.
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Alerts section */}
      <Card className="overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold">
            🔔 التنبيهات — معاملات تحتاج موعد قريب
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('calendar')}
              className="text-xs bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded transition-colors"
              title="عرض التقويم"
            >
              📅 التقويم
            </button>
            <span className="text-xs bg-white/15 px-2 py-0.5 rounded">
              {data.alerts.length}
            </span>
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-2 max-h-[28rem] overflow-y-auto scroll-pretty">
          {data.alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-3xl mb-2">✅</div>
              <p>✅ لا توجد تنبيهات حالياً</p>
              <p className="text-xs mt-1 text-gray-400">
                جميع معاملاتك إما منجزة أو مؤجلة
              </p>
            </div>
          ) : (
            data.alerts.map((a) => {
              const isOverdue = a.isOverdue
              const days = a.daysLeft ?? 0
              const label = isOverdue
                ? `فات منذ ${Math.abs(days)} يوم`
                : `بعد ${days} يوم`
              const isToggling = togglingId === a.id
              return (
                <div
                  key={a.id}
                  className={`p-3 rounded-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-all hover:shadow-md ${
                    isOverdue ? 'bg-[#fef2f2]' : 'bg-white'
                  }`}
                  style={{
                    borderRight: `4px solid ${
                      isOverdue ? '#dc2626' : '#f59e0b'
                    }`,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#1f3a26]">
                        {a.cropName}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {TREATMENT_TYPES[a.type]}
                      </span>
                      {isOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold flex items-center gap-0.5">
                          ⚠️ عاجل
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {a.farmName}
                      {a.product ? ` — المنتَج: ${a.product}` : ''}
                      {a.dose ? ` (${a.dose})` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className="text-sm font-bold sm:text-left whitespace-nowrap"
                      style={{
                        color: isOverdue ? '#dc2626' : '#f59e0b',
                      }}
                    >
                      {label}
                      {a.nextDate && (
                        <div className="text-xs text-gray-500 font-normal">
                          {formatDate(a.nextDate)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => quickToggleDone(a.id)}
                      disabled={isToggling}
                      title="تعليم كمنجزة"
                      className="shrink-0 w-8 h-8 rounded-full bg-[#4a7c59] text-white hover:bg-[#1f3a26] disabled:opacity-60 disabled:cursor-wait flex items-center justify-center transition-colors shadow-sm"
                    >
                      {isToggling ? (
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Recent visits section */}
      <Card className="overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold">📋 آخر الزيارات</h2>
          <Button
            size="sm"
            onClick={() =>
              setActiveView('visits', { openVisitForm: true })
            }
            className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
          >
            + تسجيل زيارة جديدة
          </Button>
        </div>
        <div className="p-3 sm:p-4">
          {data.recentVisits.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <div className="text-4xl mb-3">📸</div>
              <h3 className="font-bold text-[#1f3a26] mb-1">
                📸 لم تسجّل أي زيارة بعد
              </h3>
              <p className="text-sm mb-4">
                ابدأ بتسجيل أول زيارة ميدانية من موبايلك.
              </p>
              <Button
                onClick={() =>
                  setActiveView('visits', { openVisitForm: true })
                }
                className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
              >
                سجّل أول زيارة الآن
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.recentVisits.map((v) => {
                const days = v.visitDate ? daysUntil(v.visitDate) : null
                return (
                  <button
                    key={v.id}
                    onClick={() =>
                      setActiveView('visits', { selectedVisitId: v.id })
                    }
                    className="text-right bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div
                      className="h-32 flex items-center justify-center"
                      style={{ background: '#f3f4f6' }}
                    >
                      {v.thumbPath ? (
                        <img
                          src={`/uploads/${v.thumbPath}`}
                          alt="زيارة"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl text-gray-400">📷</span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-bold text-[#1f3a26] truncate">
                        {v.farmName}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {v.cropName ?? 'زيارة عامة'} — {formatDate(v.visitDate)}
                      </div>
                      <div className="text-sm text-gray-700 mt-2 line-clamp-2">
                        {v.notes
                          ? truncate(v.notes, 90)
                          : 'بدون ملاحظات'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Activity feed timeline */}
      {data.activityFeed && data.activityFeed.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold">
              📜 آخر النشاطات
            </h2>
            <span className="text-xs bg-white/15 px-2 py-0.5 rounded">
              {data.activityFeed.length}
            </span>
          </div>
          <div className="p-4 sm:p-5">
            <ol className="relative border-r-2 border-emerald-100 space-y-4">
              {data.activityFeed.map((a) => {
                const isVisit = a.type === 'visit_created'
                const ago = timeAgo(a.createdAt)
                return (
                  <li
                    key={a.id}
                    className="relative pr-6 fade-in-up"
                  >
                    {/* timeline dot */}
                    <span
                      className={`absolute -right-[9px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                        isVisit ? 'bg-[#2563eb]' : 'bg-[#4a7c59]'
                      }`}
                    />
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-sm font-bold ${
                        isVisit ? 'text-[#2563eb]' : 'text-[#4a7c59]'
                      }`}>
                        {isVisit ? '📋 زيارة مسجّلة' : '💊 معالجة مُضافة'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {ago}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700">
                      {isVisit ? (
                        <>
                          زيارة لمزرعة{' '}
                          <span className="font-semibold text-[#1f3a26]">
                            {a.farmName}
                          </span>
                          {a.cropName && (
                            <>
                              {' '}— محصول{' '}
                              <span className="font-semibold text-[#1f3a26]">
                                {a.cropName}
                              </span>
                            </>
                          )}
                          {a.visitDate && (
                            <span className="text-gray-500">
                              {' '}بتاريخ {formatDate(a.visitDate)}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          معالجة{' '}
                          <span className="font-semibold text-[#1f3a26]">
                            {a.treatmentType && TREATMENT_TYPES[a.treatmentType as keyof typeof TREATMENT_TYPES] || a.treatmentType}
                          </span>
                          {' '}لمحصول{' '}
                          <span className="font-semibold text-[#1f3a26]">
                            {a.cropName}
                          </span>
                          {' '}في مزرعة{' '}
                          <span className="font-semibold text-[#1f3a26]">
                            {a.farmName}
                          </span>
                          {a.product && (
                            <span className="text-gray-500">
                              {' '}— {a.product}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Relative time formatter (Arabic) ───
function timeAgo(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.floor((now - then) / 1000) // seconds
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  const d = new Date(iso)
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
}
