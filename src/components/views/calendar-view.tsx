'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api'
import { TREATMENT_TYPES } from '@/lib/treatment-types'
import { useViewStore } from '@/lib/view-store'
import {
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react'

interface CalTreatment {
  id: number
  type: 'spray' | 'fertilize' | 'control' | 'other'
  product: string | null
  nextDate: string | null
  cropName: string
  farmName: string
  isOverdue: boolean
}
interface CalVisit {
  id: number
  visitDate: string
  farmName: string
  cropName: string | null
}
interface CalendarData {
  year: number
  month: number
  today: string
  treatments: CalTreatment[]
  visits: CalVisit[]
}

const MONTH_NAMES = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]
const WEEKDAY_NAMES = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function CalendarView() {
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const { toast } = useToast()
  const setActiveView = useViewStore((s) => s.setActiveView)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.get<CalendarData>(`/api/calendar?month=${cursor}`)
      setData(d)
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'تعذّر تحميل التقويم',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [cursor, toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Parse cursor
  const [cYear, cMonth] = useMemo(() => {
    const [y, m] = cursor.split('-').map(Number)
    return [y, m - 1] as const
  }, [cursor])

  // Build the calendar grid (6 rows x 7 cols, RTL so Sunday on the right)
  const days = useMemo(() => {
    if (!data) return []
    const firstDay = new Date(Date.UTC(cYear, cMonth, 1))
    const startWeekday = firstDay.getUTCDay() // 0=Sun
    const daysInMonth = new Date(Date.UTC(cYear, cMonth + 1, 0)).getUTCDate()
    const cells: Array<{
      day: number | null
      iso: string | null
      isToday: boolean
      treatments: CalTreatment[]
      visits: CalVisit[]
    }> = []
    // Leading empty cells (RTL: prepend so they appear on the right)
    for (let i = 0; i < startWeekday; i++) {
      cells.push({
        day: null,
        iso: null,
        isToday: false,
        treatments: [],
        visits: [],
      })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${cYear}-${pad(cMonth + 1)}-${pad(d)}`
      cells.push({
        day: d,
        iso,
        isToday: iso === data.today,
        treatments: data.treatments.filter((t) => t.nextDate === iso),
        visits: data.visits.filter((v) => v.visitDate === iso),
      })
    }
    // Trailing empty cells to fill 6 rows (42 cells)
    while (cells.length % 7 !== 0) {
      cells.push({
        day: null,
        iso: null,
        isToday: false,
        treatments: [],
        visits: [],
      })
    }
    return cells
  }, [data, cYear, cMonth])

  function prevMonth() {
    const d = new Date(Date.UTC(cYear, cMonth, 1))
    d.setUTCMonth(d.getUTCMonth() - 1)
    setCursor(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`)
    setSelectedDay(null)
  }
  function nextMonth() {
    const d = new Date(Date.UTC(cYear, cMonth, 1))
    d.setUTCMonth(d.getUTCMonth() + 1)
    setCursor(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`)
    setSelectedDay(null)
  }
  function goToday() {
    const now = new Date()
    setCursor(`${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`)
    setSelectedDay(null)
  }

  // Stats for the month
  const monthStats = useMemo(() => {
    if (!data) return { overdue: 0, upcoming: 0, visits: 0 }
    const inMonthTreatments = data.treatments.filter((t) => {
      if (!t.nextDate) return false
      const m = Number(t.nextDate.slice(5, 7))
      const y = Number(t.nextDate.slice(0, 4))
      return y === cYear && m === cMonth + 1
    })
    return {
      overdue: inMonthTreatments.filter((t) => t.isOverdue).length,
      upcoming: inMonthTreatments.filter((t) => !t.isOverdue).length,
      visits: data.visits.length,
    }
  }, [data, cYear, cMonth])

  // Selected day details
  const selectedDetails = useMemo(() => {
    if (!selectedDay || !data) return null
    const treatments = data.treatments.filter((t) => t.nextDate === selectedDay)
    const visits = data.visits.filter((v) => v.visitDate === selectedDay)
    return { treatments, visits }
  }, [selectedDay, data])

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 fade-in-up">
      {/* Header + nav */}
      <Card className="p-4 sm:p-5 gap-0 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#4a7c59]" />
            <h2 className="text-xl font-bold text-[#1f3a26]">
              تقويم الزيارات والمواعيد
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              aria-label="الشهر السابق"
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToday}
              className="h-9 px-3 text-xs"
            >
              اليوم
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              aria-label="الشهر التالي"
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-2 text-lg font-semibold text-[#4a7c59]">
          {MONTH_NAMES[cMonth]} {cYear}
        </div>
        {/* Mini stats */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-red-50 border border-red-100 p-2">
            <div className="text-xs text-gray-600">مواعيد فاتت</div>
            <div className="text-xl font-bold text-[#dc2626]">
              {monthStats.overdue}
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-2">
            <div className="text-xs text-gray-600">قادمة هذا الشهر</div>
            <div className="text-xl font-bold text-[#f59e0b]">
              {monthStats.upcoming}
            </div>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2">
            <div className="text-xs text-gray-600">زيارات هذا الشهر</div>
            <div className="text-xl font-bold text-[#4a7c59]">
              {monthStats.visits}
            </div>
          </div>
        </div>
      </Card>

      {/* Calendar grid */}
      <Card className="p-3 sm:p-4 gap-0 shadow-sm overflow-hidden">
        {/* Weekday header (RTL: Sun on the right) */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAY_NAMES.map((w) => (
            <div
              key={w}
              className="text-center text-[11px] sm:text-xs font-bold text-[#1f3a26] py-1"
            >
              {w}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((cell, i) => {
            if (!cell.iso) {
              return (
                <div
                  key={i}
                  className="aspect-square sm:aspect-[4/3] rounded-md bg-gray-50"
                />
              )
            }
            const hasOverdue = cell.treatments.some((t) => t.isOverdue)
            const hasUpcoming =
              cell.treatments.length > 0 && !hasOverdue
            const hasVisit = cell.visits.length > 0
            const isSelected = selectedDay === cell.iso
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(cell.iso)}
                className={`relative aspect-square sm:aspect-[4/3] rounded-md p-1 sm:p-1.5 text-right transition-all border ${
                  isSelected
                    ? 'border-[#4a7c59] ring-2 ring-[#4a7c59]/30 bg-emerald-50'
                    : cell.isToday
                    ? 'border-[#4a7c59] bg-[#4a7c59]/10'
                    : 'border-gray-100 hover:border-[#4a7c59]/40 hover:bg-emerald-50/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-semibold ${
                      cell.isToday
                        ? 'inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#4a7c59] text-white text-[11px]'
                        : 'text-[#1f3a26]'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {/* Dot indicators */}
                  <div className="flex gap-0.5">
                    {hasOverdue && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#dc2626]"
                        title="موعد فات"
                      />
                    )}
                    {hasUpcoming && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"
                        title="موعد قادم"
                      />
                    )}
                    {hasVisit && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"
                        title="زيارة"
                      />
                    )}
                  </div>
                </div>
                {/* Count badges on larger screens */}
                {(cell.treatments.length > 0 || cell.visits.length > 0) && (
                  <div className="mt-1 hidden sm:flex flex-col gap-0.5">
                    {cell.treatments.length > 0 && (
                      <span
                        className={`text-[9px] px-1 py-0.5 rounded-full font-semibold ${
                          hasOverdue
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {cell.treatments.length} معالجة
                      </span>
                    )}
                    {cell.visits.length > 0 && (
                      <span className="text-[9px] px-1 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
                        {cell.visits.length} زيارة
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
            موعد فات
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            موعد قادم
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
            زيارة
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded-full bg-[#4a7c59] text-white text-[9px] text-center leading-4">
              •
            </span>
            اليوم
          </span>
        </div>
      </Card>

      {/* Selected day details */}
      {selectedDetails && (
        <Card className="p-4 sm:p-5 gap-0 shadow-sm fade-in-up">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <h3 className="text-base font-bold text-[#1f3a26]">
              📅 تفاصيل اليوم{' '}
              <span className="text-[#4a7c59]">{selectedDay}</span>
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              إغلاق ✕
            </button>
          </div>
          {selectedDetails.treatments.length === 0 &&
          selectedDetails.visits.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-[#4a7c59]" />
              <p className="text-sm">لا توجد معاملات أو زيارات في هذا اليوم</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Treatments due */}
              {selectedDetails.treatments.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-[#1f3a26] mb-2 flex items-center gap-1">
                    <Clock className="h-4 w-4 text-[#f59e0b]" />
                    معاملات مستحقة ({selectedDetails.treatments.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDetails.treatments.map((t) => (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-md border ${
                          t.isOverdue
                            ? 'bg-red-50 border-red-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                        style={{
                          borderRight: `3px solid ${
                            t.isOverdue ? '#dc2626' : '#f59e0b'
                          }`,
                        }}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={`text-[10px] ${
                              t.isOverdue
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {TREATMENT_TYPES[t.type]}
                          </Badge>
                          <span className="font-bold text-sm text-[#1f3a26]">
                            {t.cropName}
                          </span>
                          {t.isOverdue && (
                            <span className="text-[10px] text-red-600 flex items-center gap-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              فات الموعد
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {t.farmName}
                          {t.product ? ` — ${t.product}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Visits */}
              {selectedDetails.visits.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-[#1f3a26] mb-2 flex items-center gap-1">
                    <CalendarDays className="h-4 w-4 text-[#2563eb]" />
                    زيارات في هذا اليوم ({selectedDetails.visits.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedDetails.visits.map((v) => (
                      <button
                        key={v.id}
                        onClick={() =>
                          setActiveView('visits', { selectedVisitId: v.id })
                        }
                        className="w-full text-right p-2.5 rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <div className="font-bold text-sm text-[#1f3a26]">
                          {v.farmName}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {v.cropName ?? 'زيارة عامة'} — اضغط للعرض
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
