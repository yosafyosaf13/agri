'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api'
import { TREATMENT_TYPES, CROP_STATUSES } from '@/lib/treatment-types'
import { formatDate, truncate } from '@/lib/format'
import {
  FileText,
  Printer,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sprout,
  Calendar,
} from 'lucide-react'

interface ReportData {
  meta: {
    generatedAt: string
    user: { fullName: string; username: string; role: string }
  }
  summary: {
    totalFarms: number
    totalCrops: number
    totalVisits: number
    totalTreatments: number
    totalPhotos: number
    totalAreaFeddans: number
    cropAreaFeddans: number
    visitsThisMonth: number
    visitsThisYear: number
    treatmentsDone: number
    treatmentsPending: number
    treatmentsOverdue: number
    completionRate: number
  }
  treatmentsByType: Record<string, number>
  cropStatus: Record<string, number>
  visitsPerFarm: Array<{
    farmName: string
    visitCount: number
    cropCount: number
    area: number
  }>
  recentTreatments: Array<{
    id: number
    type: string
    product: string | null
    dose: string | null
    nextDate: string | null
    done: boolean
    cropName: string
    farmName: string
    createdAt: string
  }>
  farms: Array<{
    id: number
    name: string
    owner: string | null
    area: number | null
    location: string | null
    cropCount: number
    visitCount: number
    crops: Array<{ id: number; name: string; variety: string | null; status: string; area: number | null }>
  }>
  visits: Array<{
    id: number
    visitDate: string
    farmName: string
    cropName: string | null
    notes: string | null
    photoCount: number
    treatmentCount: number
  }>
}

export function ReportsView() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.get<ReportData>('/api/reports')
      setData(d)
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'تعذّر تحميل التقرير',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  function handlePrint() {
    window.print()
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  const { summary: s } = data
  const maxFarmVisits = Math.max(1, ...data.visitsPerFarm.map((f) => f.visitCount))

  return (
    <div className="space-y-4 fade-in-up">
      {/* Header — hidden on print, replaced by print header below */}
      <Card className="p-4 sm:p-5 gap-0 shadow-sm print:hidden" data-print-hide>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#4a7c59]" />
            <div>
              <h2 className="text-xl font-bold text-[#1f3a26]">
                التقارير والإحصائيات
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                تقرير شامل عن نشاطك الزراعي — يُولّد في{' '}
                {formatDate(data.meta.generatedAt.slice(0, 10))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="h-9"
            >
              <RefreshCw className="size-4" />
              تحديث
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white h-9"
            >
              <Printer className="size-4" />
              طباعة / PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Print-only header */}
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-2xl font-bold">
          تقرير نشاط نظام إدارة العمل الميداني الزراعي
        </h1>
        <p className="text-sm mt-1">
          المستخدم: {data.meta.user.fullName} ({data.meta.user.username}) —{' '}
          {formatDate(data.meta.generatedAt.slice(0, 10))}
        </p>
      </div>

      {/* Summary stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<Sprout className="h-5 w-5" />}
          label="المزارع"
          value={s.totalFarms}
          sub={`${s.totalAreaFeddans} فدان`}
          color="emerald"
        />
        <StatTile
          icon={<TrendingUp className="h-5 w-5" />}
          label="المحاصيل"
          value={s.totalCrops}
          sub={`${s.cropAreaFeddans} فدان مزروعة`}
          color="blue"
        />
        <StatTile
          icon={<Calendar className="h-5 w-5" />}
          label="إجمالي الزيارات"
          value={s.totalVisits}
          sub={`${s.visitsThisMonth} هذا الشهر`}
          color="amber"
        />
        <StatTile
          icon={<FileText className="h-5 w-5" />}
          label="إجمالي المعاملات"
          value={s.totalTreatments}
          sub={`${s.treatmentsDone} منجزة`}
          color="emerald"
        />
        <StatTile
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="معدل الإنجاز"
          value={`${s.completionRate}%`}
          sub={`${s.treatmentsDone}/${s.totalTreatments} معالجة`}
          color="emerald"
        />
        <StatTile
          icon={<AlertCircle className="h-5 w-5" />}
          label="معاملات معلّقة"
          value={s.treatmentsPending}
          sub={`${s.treatmentsOverdue} فائتة`}
          color={s.treatmentsOverdue > 0 ? 'red' : 'amber'}
        />
        <StatTile
          icon={<Calendar className="h-5 w-5" />}
          label="زيارات هذا العام"
          value={s.visitsThisYear}
          sub={`${s.visitsThisMonth} هذا الشهر`}
          color="blue"
        />
        <StatTile
          icon={<FileText className="h-5 w-5" />}
          label="الصور المرفوعة"
          value={s.totalPhotos}
          sub="موثّقة في الزيارات"
          color="emerald"
        />
      </div>

      {/* Two-column: treatments breakdown + crop status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Treatments by type */}
        <Card className="p-4 sm:p-5 gap-0 shadow-sm">
          <h3 className="text-sm font-bold text-[#1f3a26] mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#4a7c59]/10 text-[#4a7c59]">
              💊
            </span>
            توزيع المعاملات حسب النوع
          </h3>
          <div className="space-y-2">
            {Object.entries(data.treatmentsByType).map(([type, count]) => {
              const total = s.totalTreatments || 1
              const pct = Math.round((count / total) * 100)
              const colors: Record<string, string> = {
                spray: '#4a7c59',
                fertilize: '#f59e0b',
                control: '#dc2626',
                other: '#2563eb',
              }
              return (
                <div key={type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-700">
                      {TREATMENT_TYPES[type as keyof typeof TREATMENT_TYPES] ?? type}
                    </span>
                    <span className="text-gray-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: colors[type] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Crop status */}
        <Card className="p-4 sm:p-5 gap-0 shadow-sm">
          <h3 className="text-sm font-bold text-[#1f3a26] mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#4a7c59]/10 text-[#4a7c59]">
              🌱
            </span>
            حالة المحاصيل
          </h3>
          <div className="space-y-2">
            {Object.entries(data.cropStatus).map(([status, count]) => {
              const total = s.totalCrops || 1
              const pct = Math.round((count / total) * 100)
              const colors: Record<string, string> = {
                active: '#4a7c59',
                harvested: '#f59e0b',
                failed: '#dc2626',
              }
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-700">
                      {CROP_STATUSES[status as keyof typeof CROP_STATUSES] ?? status}
                    </span>
                    <span className="text-gray-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: colors[status] }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Visits per farm (bar chart) */}
      {data.visitsPerFarm.length > 0 && (
        <Card className="p-4 sm:p-5 gap-0 shadow-sm">
          <h3 className="text-sm font-bold text-[#1f3a26] mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#4a7c59]/10 text-[#4a7c59]">
              📊
            </span>
            الزيارات لكل مزرعة
          </h3>
          <div className="space-y-3">
            {data.visitsPerFarm.map((f) => {
              const pct = Math.round((f.visitCount / maxFarmVisits) * 100)
              return (
                <div key={f.farmName}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-700">
                      {f.farmName}
                      <span className="text-gray-400 font-normal mr-1">
                        ({f.cropCount} محصول، {f.area} فدان)
                      </span>
                    </span>
                    <span className="font-bold text-[#1f3a26]">
                      {f.visitCount} زيارة
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-gradient-to-l from-[#4a7c59] to-[#1f3a26]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Farms detail table */}
      <Card className="overflow-hidden shadow-sm">
        <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white">
          <h3 className="text-base font-bold">🌾 تفاصيل المزارع والمحاصيل</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right p-3 font-bold text-[#1f3a26]">المزرعة</th>
                <th className="text-right p-3 font-bold text-[#1f3a26]">المالك</th>
                <th className="text-right p-3 font-bold text-[#1f3a26]">المساحة</th>
                <th className="text-right p-3 font-bold text-[#1f3a26]">المحاصيل</th>
                <th className="text-right p-3 font-bold text-[#1f3a26]">الزيارات</th>
              </tr>
            </thead>
            <tbody>
              {data.farms.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3 font-bold text-[#1f3a26]">{f.name}</td>
                  <td className="p-3 text-gray-700">{f.owner ?? '—'}</td>
                  <td className="p-3 text-gray-700">{f.area ?? '—'} فدان</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {f.crops.length === 0 ? (
                        <span className="text-gray-400 text-xs">لا توجد محاصيل</span>
                      ) : (
                        f.crops.map((c) => (
                          <Badge
                            key={c.id}
                            className={`text-[10px] ${
                              c.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : c.status === 'harvested'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {c.name}
                            {c.variety ? ` (${c.variety})` : ''}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-3 font-bold text-[#4a7c59]">{f.visitCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent treatments */}
      {data.recentTreatments.length > 0 && (
        <Card className="overflow-hidden shadow-sm">
          <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white">
            <h3 className="text-base font-bold">🧪 آخر المعاملات (10)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-right p-3 font-bold text-[#1f3a26]">النوع</th>
                  <th className="text-right p-3 font-bold text-[#1f3a26]">المحصول</th>
                  <th className="text-right p-3 font-bold text-[#1f3a26]">المزرعة</th>
                  <th className="text-right p-3 font-bold text-[#1f3a26]">المنتَج</th>
                  <th className="text-right p-3 font-bold text-[#1f3a26]">الموعد</th>
                  <th className="text-right p-3 font-bold text-[#1f3a26]">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTreatments.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3">
                      <Badge className="bg-gray-100 text-gray-700 text-[10px]">
                        {TREATMENT_TYPES[t.type as keyof typeof TREATMENT_TYPES] ?? t.type}
                      </Badge>
                    </td>
                    <td className="p-3 font-bold text-[#1f3a26]">{t.cropName}</td>
                    <td className="p-3 text-gray-700">{t.farmName}</td>
                    <td className="p-3 text-gray-700">{t.product ?? '—'}</td>
                    <td className="p-3 text-gray-700">
                      {t.nextDate ? formatDate(t.nextDate) : '—'}
                    </td>
                    <td className="p-3">
                      {t.done ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                          ✓ تم
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                          معلّقة
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-gray-500 mt-6 pt-4 border-t">
        © {new Date().getFullYear()} نظام إدارة العمل الميداني الزراعي — الإصدار 2.0
      </div>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub: string
  color: 'emerald' | 'amber' | 'red' | 'blue'
}) {
  const colors = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      icon: 'bg-[#4a7c59]/10 text-[#4a7c59]',
      value: 'text-[#1f3a26]',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      icon: 'bg-amber-100 text-amber-700',
      value: 'text-[#92400e]',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-100',
      icon: 'bg-red-100 text-red-700',
      value: 'text-[#dc2626]',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      icon: 'bg-blue-100 text-blue-700',
      value: 'text-[#1e3a8a]',
    },
  }[color]

  return (
    <Card
      className={`p-4 gap-0 shadow-sm border ${colors.border} ${colors.bg} print:break-inside-avoid`}
    >
      <div
        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${colors.icon} mb-2`}
      >
        {icon}
      </div>
      <div className={`text-2xl font-bold ${colors.value}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-0.5">{label}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
    </Card>
  )
}
