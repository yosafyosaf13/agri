'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError, type Farm } from '@/lib/api'
import { useViewStore } from '@/lib/view-store'
import { getCropEmoji } from '@/lib/crop-database'
import { MapPin, Sprout, ClipboardList, ExternalLink, Grid3x3 } from 'lucide-react'

export function FarmMapView() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const setActiveView = useViewStore((s) => s.setActiveView)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ farms: Farm[] }>('/api/farms')
      setFarms(res.farms)
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'تعذّر تحميل المزارع',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (farms.length === 0) {
    return (
      <div className="space-y-4 fade-in-up">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-6 w-6 text-[#4a7c59]" />
          <h2 className="text-xl font-bold text-[#1f3a26]">خريطة المزارع</h2>
        </div>
        <Card className="p-10 text-center border-2 border-dashed border-gray-200">
          <div className="text-5xl mb-3">🗺️</div>
          <h3 className="text-lg font-bold text-[#1f3a26] mb-1">
            لا توجد مزارع لعرضها
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            ابدأ بإضافة مزرعة لعرضها على الخريطة المرئية.
          </p>
          <Button
            onClick={() => setActiveView('farms')}
            className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
          >
            إضافة مزرعة
          </Button>
        </Card>
      </div>
    )
  }

  // Compute layout: assign each farm a pseudo-position in a grid based on its index
  // (since we don't have GPS coordinates, we use a deterministic visual layout)
  const cols = 3
  const totalArea = farms.reduce((s, f) => s + (f.area ?? 0), 0)
  const totalCrops = farms.reduce((s, f) => s + (f._count?.crops ?? 0), 0)
  const totalVisits = farms.reduce((s, f) => s + (f._count?.visits ?? 0), 0)

  return (
    <div className="space-y-4 fade-in-up">
      {/* Header */}
      <Card className="p-4 sm:p-5 gap-0 shadow-sm bg-gradient-to-bl from-emerald-50 to-white border-emerald-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-6 w-6 text-[#4a7c59]" />
            <div>
              <h2 className="text-xl font-bold text-[#1f3a26]">خريطة المزارع</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                تخطيط مرئي للمزارع ({farms.length}) — بدون إحداثيات GPS، مرتّبة حسب الإضافة
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-[#dcfce7] text-[#166534] hover:bg-[#dcfce7]">
              🌾 {farms.length} مزرعة
            </Badge>
            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">
              🌱 {totalCrops} محصول
            </Badge>
            <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">
              📋 {totalVisits} زيارة
            </Badge>
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              📐 {totalArea.toFixed(1)} فدان
            </Badge>
          </div>
        </div>
      </Card>

      {/* Visual map grid */}
      <Card className="p-4 sm:p-6 gap-0 shadow-sm relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' }}>
        {/* Decorative grid background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(74,124,89,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(74,124,89,0.15) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Decorative "fields" pattern */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-sm"
              style={{
                left: `${(i * 17) % 100}%`,
                top: `${(i * 23) % 100}%`,
                width: `${8 + (i % 4) * 4}%`,
                height: `${6 + (i % 3) * 3}%`,
                background: i % 2 === 0 ? '#4a7c59' : '#6fa37c',
                transform: `rotate(${(i * 13) % 45}deg)`,
              }}
            />
          ))}
        </div>
        <div className="relative">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(cols, farms.length)}, minmax(0, 1fr))`,
            }}
          >
            {farms.map((f, idx) => {
              const cropCount = f._count?.crops ?? 0
              const visitCount = f._count?.visits ?? 0
              const isActive = cropCount > 0
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveView('farms', { selectedFarmId: f.id })}
                  className="group text-right relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all hover:-translate-y-1 border-2"
                  style={{
                    borderColor: isActive ? '#4a7c59' : '#e5e7eb',
                  }}
                >
                  {/* Farm "header" with emoji + number */}
                  <div
                    className="relative p-4 text-white"
                    style={{
                      background: `linear-gradient(135deg, ${
                        isActive ? '#1f3a26' : '#6b7280'
                      } 0%, ${isActive ? '#4a7c59' : '#9ca3af'} 100%)`,
                    }}
                  >
                    <div className="absolute top-2 right-2 text-2xl opacity-30">
                      {getCropEmoji(f.crops?.[0]?.name || '') || '🌾'}
                    </div>
                    <div className="relative">
                      <div className="text-[10px] opacity-80 mb-0.5">
                        مزرعة #{idx + 1}
                      </div>
                      <div className="text-base font-bold truncate">
                        {f.name}
                      </div>
                      <div className="text-[11px] opacity-80 mt-0.5">
                        {f.area ?? '?'} فدان
                      </div>
                    </div>
                  </div>
                  {/* Farm body */}
                  <div className="p-3 space-y-2">
                    {f.owner && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <span>👤</span>
                        <span className="truncate">{f.owner}</span>
                      </div>
                    )}
                    {f.location && (
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{f.location}</span>
                      </div>
                    )}
                    {/* Stats row */}
                    <div className="flex gap-1.5 pt-1">
                      <span className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        <Sprout className="h-3 w-3" />
                        {cropCount}
                      </span>
                      <span className="flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        <ClipboardList className="h-3 w-3" />
                        {visitCount}
                      </span>
                    </div>
                    {/* Hover CTA */}
                    <div className="pt-1 flex items-center justify-end text-[10px] text-[#4a7c59] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="flex items-center gap-0.5">
                        <ExternalLink className="h-3 w-3" />
                        عرض التفاصيل
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Legend / help */}
      <div className="text-center text-xs text-gray-500">
        💡 اضغط أي مزرعة لعرض تفاصيلها. التخطيط ترتيبي (حسب تاريخ الإضافة) — لا توجد إحداثيات GPS فعلية.
      </div>
    </div>
  )
}
