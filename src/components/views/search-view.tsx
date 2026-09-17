'use client'

import { useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError, type SearchResults } from '@/lib/api'
import { TREATMENT_TYPES } from '@/lib/treatment-types'
import { formatDate, truncate } from '@/lib/format'
import { useViewStore } from '@/lib/view-store'
import { Search as SearchIcon } from 'lucide-react'

export function SearchView() {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const setActiveView = useViewStore((s) => s.setActiveView)
  const inputRef = useRef<HTMLInputElement>(null)

  // autofocus
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!debounced) {
      setResults(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const r = await api.get<SearchResults>(
          `/api/search?q=${encodeURIComponent(debounced)}`
        )
        if (!cancelled) {
          setResults(r)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false)
          toast({
            title: '⚠️ خطأ',
            description:
              err instanceof ApiError ? err.message : 'فشل البحث',
            variant: 'destructive',
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debounced, toast])

  const hasQuery = debounced.length > 0
  const noResults =
    hasQuery &&
    !loading &&
    results &&
    results.farms.length === 0 &&
    results.crops.length === 0 &&
    results.visits.length === 0 &&
    results.treatments.length === 0

  return (
    <div className="space-y-4 fade-in-up">
      <h2 className="text-xl sm:text-2xl font-bold text-[#1f3a26]">بحث</h2>

      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث في المزارع والمحاصيل والزيارات والمعاملات..."
            className="pr-9 h-11"
          />
        </div>
      </div>

      {/* States */}
      {!hasQuery && (
        <Card className="p-10 text-center border-2 border-dashed">
          <div className="text-5xl mb-3">🔍</div>
          <h3 className="font-bold text-[#1f3a26] mb-1">بحث</h3>
          <p className="text-gray-500 text-sm">
            ابحث في كل المزارع والمحاصيل والزيارات والمعاملات — مكان واحد للوصول
            لكل شيء.
          </p>
        </Card>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      )}

      {noResults && (
        <Card className="p-10 text-center border-2 border-dashed">
          <div className="text-5xl mb-3">🔍</div>
          <h3 className="font-bold text-[#1f3a26] mb-1">لا توجد نتائج مطابقة</h3>
          <p className="text-gray-500 text-sm">
            جرّب كلمة مختلفة أو تحقق من الإملاء.
          </p>
        </Card>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            النتائج ({results.total}) —{' '}
            <span className="font-bold">{debounced}</span>
          </div>

          {results.farms.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b bg-[#1f3a26] text-white flex items-center justify-between">
                <h3 className="font-bold">🌾 المزارع</h3>
                <span className="text-xs bg-white/15 px-2 py-0.5 rounded">
                  {results.farms.length}
                </span>
              </div>
              <ul className="divide-y">
                {results.farms.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() =>
                        setActiveView('farms', { selectedFarmId: f.id })
                      }
                      className="w-full text-right p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-bold text-[#1f3a26]">{f.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {f.owner && `👤 ${f.owner}`}
                        {f.owner && f.location && ' • '}
                        {f.location && `📍 ${f.location}`}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {results.crops.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b bg-[#1f3a26] text-white flex items-center justify-between">
                <h3 className="font-bold">🌱 المحاصيل</h3>
                <span className="text-xs bg-white/15 px-2 py-0.5 rounded">
                  {results.crops.length}
                </span>
              </div>
              <ul className="divide-y">
                {results.crops.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() =>
                        setActiveView('farms', { selectedFarmId: c.farmId })
                      }
                      className="w-full text-right p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-bold text-[#1f3a26]">
                        {c.name}
                        {c.variety && (
                          <span className="text-gray-500 font-normal">
                            {' '}
                            ({c.variety})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        — {c.farmName}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {results.visits.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b bg-[#1f3a26] text-white flex items-center justify-between">
                <h3 className="font-bold">📅 الزيارات</h3>
                <span className="text-xs bg-white/15 px-2 py-0.5 rounded">
                  {results.visits.length}
                </span>
              </div>
              <ul className="divide-y">
                {results.visits.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={() =>
                        setActiveView('visits', { selectedVisitId: v.id })
                      }
                      className="w-full text-right p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-bold text-[#1e40af]">
                        📅 {formatDate(v.visitDate)}
                      </div>
                      <div className="text-sm mt-0.5">
                        <span className="font-bold text-[#1f3a26]">
                          {v.farmName}
                        </span>
                        {v.cropName && ` — ${v.cropName}`}
                      </div>
                      {v.notes && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          {truncate(v.notes, 100)}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {results.treatments.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b bg-[#1f3a26] text-white flex items-center justify-between">
                <h3 className="font-bold">🧪 المعاملات</h3>
                <span className="text-xs bg-white/15 px-2 py-0.5 rounded">
                  {results.treatments.length}
                </span>
              </div>
              <ul className="divide-y">
                {results.treatments.map((t) => (
                  <li
                    key={t.id}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-bold text-[#1f3a26]">
                      {TREATMENT_TYPES[
                        t.type as keyof typeof TREATMENT_TYPES
                      ] ?? t.type}{' '}
                      — {t.cropName}{' '}
                      <span className="text-gray-500 font-normal">
                        ({t.farmName})
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {t.product && `${t.product}`}
                      {t.nextDate && ` • موعد: ${formatDate(t.nextDate)}`}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
