'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError, type Farm, type Crop } from '@/lib/api'
import { CROP_STATUS_BADGE, CROP_STATUSES } from '@/lib/treatment-types'
import { CropAutocomplete, VarietySuggestions } from '@/components/crop-autocomplete'
import { formatDate, truncate, todayISO } from '@/lib/format'
import { useViewStore } from '@/lib/view-store'
import { ChevronRight, Plus } from 'lucide-react'

export function FarmsView() {
  const viewParams = useViewStore((s) => s.viewParams)
  const setActiveView = useViewStore((s) => s.setActiveView)
  const patchViewParams = useViewStore((s) => s.patchViewParams)

  const [farms, setFarms] = useState<Farm[] | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // ─── selected farm detail ───
  const [farmDetail, setFarmDetail] = useState<Farm | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ─── create/edit form ───
  const [farmFormOpen, setFarmFormOpen] = useState(false)
  const [editFarmId, setEditFarmId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formOwner, setFormOwner] = useState('')
  const [formArea, setFormArea] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ─── crop form ───
  const [cropFormOpen, setCropFormOpen] = useState(false)
  const [cropEditId, setCropEditId] = useState<number | null>(null)
  const [cropFarmId, setCropFarmId] = useState<number | null>(null)
  const [cropName, setCropName] = useState('')
  const [cropVariety, setCropVariety] = useState('')
  const [varietySuggestions, setVarietySuggestions] = useState<string[]>([])
  const [cropPlantingDate, setCropPlantingDate] = useState(todayISO())
  const [cropArea, setCropArea] = useState('')
  const [cropStatus, setCropStatus] = useState<'active' | 'harvested' | 'failed'>('active')
  const [cropSubmitting, setCropSubmitting] = useState(false)

  // ─── delete confirm ───
  const [deleteTarget, setDeleteTarget] = useState<Farm | null>(null)
  const [deleting, setDeleting] = useState(false)
  // ─── delete crop confirm ───
  const [deleteCropTarget, setDeleteCropTarget] = useState<Crop | null>(null)

  const refreshFarms = useCallback(async () => {
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
    refreshFarms()
  }, [refreshFarms])

  // Open farm form when requested via viewParams (e.g. from another view)
  useEffect(() => {
    if (viewParams.openFarmForm && farms) {
      openFarmForm(viewParams.editFarmId ?? null)
      patchViewParams({ openFarmForm: false, editFarmId: undefined })
    }
  }, [viewParams.openFarmForm, farms])

  // Auto-open detail if requested
  useEffect(() => {
    if (viewParams.selectedFarmId && farms) {
      openFarmDetail(viewParams.selectedFarmId)
      patchViewParams({ selectedFarmId: undefined })
    }
  }, [viewParams.selectedFarmId, farms])

  // Open crop form via params
  useEffect(() => {
    if (viewParams.openCropForm && viewParams.cropFarmId && farms) {
      openCropForm(viewParams.cropFarmId, viewParams.editCropId ?? null)
      patchViewParams({
        openCropForm: false,
        cropFarmId: undefined,
        editCropId: undefined,
      })
    }
  }, [viewParams.openCropForm, viewParams.cropFarmId, farms])

  function openFarmForm(editId: number | null) {
    setEditFarmId(editId)
    if (editId && farms) {
      const f = farms.find((x) => x.id === editId)
      if (f) {
        setFormName(f.name)
        setFormOwner(f.owner ?? '')
        setFormArea(f.area !== null ? String(f.area) : '')
        setFormLocation(f.location ?? '')
      }
    } else {
      setFormName('')
      setFormOwner('')
      setFormArea('')
      setFormLocation('')
    }
    setFarmFormOpen(true)
  }

  async function submitFarmForm(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const body = {
        name: formName.trim(),
        owner: formOwner.trim(),
        area: formArea === '' ? null : formArea,
        location: formLocation.trim(),
      }
      if (editFarmId) {
        await api.put(`/api/farms/${editFarmId}`, body)
        toast({ title: '✅ تم الحفظ بنجاح' })
      } else {
        await api.post('/api/farms', body)
        toast({ title: '✅ تم الحفظ بنجاح' })
      }
      setFarmFormOpen(false)
      await refreshFarms()
      if (editFarmId) {
        // refresh detail if open
        setFarmDetail(null)
      }
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function openFarmDetail(id: number) {
    setDetailLoading(true)
    setFarmDetail(null)
    try {
      const res = await api.get<{ farm: Farm }>(`/api/farms/${id}`)
      setFarmDetail(res.farm)
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'تعذّر تحميل المزرعة',
        variant: 'destructive',
      })
    } finally {
      setDetailLoading(false)
    }
  }

  async function confirmDeleteFarm() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.del(`/api/farms/${deleteTarget.id}`)
      toast({ title: '✅ تم الحذف' })
      setDeleteTarget(null)
      if (farmDetail?.id === deleteTarget.id) {
        setFarmDetail(null)
      }
      await refreshFarms()
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'فشل الحذف',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  function openCropForm(fId: number, editId: number | null = null) {
    setCropFarmId(fId)
    setCropEditId(editId)
    if (editId && farmDetail?.crops) {
      const c = farmDetail.crops.find((x) => x.id === editId)
      if (c) {
        setCropName(c.name)
        setCropVariety(c.variety ?? '')
        setCropPlantingDate(c.plantingDate ?? todayISO())
        setCropArea(c.area !== null ? String(c.area) : '')
        setCropStatus(c.status)
      }
    } else {
      setCropName('')
      setCropVariety('')
      setCropPlantingDate(todayISO())
      setCropArea('')
      setCropStatus('active')
    }
    setCropFormOpen(true)
  }

  async function submitCropForm(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !cropFarmId) return
    setCropSubmitting(true)
    try {
      const body = {
        farmId: cropFarmId,
        name: cropName.trim(),
        variety: cropVariety.trim(),
        plantingDate: cropPlantingDate,
        area: cropArea === '' ? null : cropArea,
        status: cropStatus,
      }
      if (cropEditId) {
        await api.put(`/api/crops/${cropEditId}`, body)
      } else {
        await api.post('/api/crops', body)
      }
      toast({ title: '✅ تم الحفظ بنجاح' })
      setCropFormOpen(false)
      // Refresh detail if open
      if (farmDetail && farmDetail.id === cropFarmId) {
        await openFarmDetail(cropFarmId)
      }
      await refreshFarms()
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'فشل الحفظ',
        variant: 'destructive',
      })
    } finally {
      setCropSubmitting(false)
    }
  }

  async function confirmDeleteCrop() {
    if (!deleteCropTarget) return
    setDeleting(true)
    try {
      await api.del(`/api/crops/${deleteCropTarget.id}`)
      toast({ title: '✅ تم الحذف' })
      if (farmDetail) {
        await openFarmDetail(farmDetail.id)
      }
      await refreshFarms()
      setDeleteCropTarget(null)
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'فشل الحذف',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // ─── Detail view ───
  if (farmDetail || detailLoading) {
    if (detailLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )
    }
    const f = farmDetail!
    return (
      <div className="space-y-4 fade-in-up">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFarmDetail(null)}
          className="text-gray-600"
        >
          <ChevronRight className="size-4" />
          رجوع للمزارع
        </Button>

        {/* Header card */}
        <Card className="p-5 gap-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1f3a26]">
                🌾 {f.name}
              </h2>
              <div className="text-sm text-gray-600 mt-1">
                {f.owner && `👤 ${f.owner}`}
                {f.owner && f.area !== null && ' • '}
                {f.area !== null && `📐 ${f.area} فدان`}
              </div>
              {f.location && (
                <div className="text-xs text-gray-500 mt-1">
                  📍 {f.location}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => openCropForm(f.id)}
                className="bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a] border border-[#fde68a]"
              >
                🌱 + محصول
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  setActiveView('visits', {
                    openVisitForm: true,
                    selectedFarmId: f.id,
                  })
                }
                className="bg-[#dbeafe] text-[#1e40af] hover:bg-[#bfdbfe] border border-[#93c5fd]"
              >
                📋 تسجيل زيارة
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openFarmForm(f.id)}
                className="bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db]"
              >
                ✏️ تعديل
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteTarget(f)}
                className="bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca] border-[#fecaca]"
              >
                🗑️ حذف
              </Button>
            </div>
          </div>
        </Card>

        {/* Crops table */}
        <Card className="overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white">
            <h2 className="text-base font-bold">
              🌱 المحاصيل ({f.crops?.length ?? 0})
            </h2>
          </div>
          <div className="p-3 sm:p-4">
            {!f.crops || f.crops.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>🌿 لا توجد محاصيل مسجلة لهذه المزرعة بعد.</p>
                <Button
                  size="sm"
                  className="mt-3 bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
                  onClick={() => openCropForm(f.id)}
                >
                  أضف محصول →
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#1f3a26] text-white hover:bg-[#1f3a26]">
                      <TableHead className="text-white">اسم المحصول</TableHead>
                      <TableHead className="text-white">الصنف</TableHead>
                      <TableHead className="text-white">تاريخ الزراعة</TableHead>
                      <TableHead className="text-white">المساحة (فدان)</TableHead>
                      <TableHead className="text-white">الحالة</TableHead>
                      <TableHead className="text-white">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {f.crops.map((c) => (
                      <TableRow key={c.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-gray-600">
                          {c.variety || '—'}
                        </TableCell>
                        <TableCell>
                          {c.plantingDate ? formatDate(c.plantingDate) : '—'}
                        </TableCell>
                        <TableCell>{c.area !== null ? c.area : '—'}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${CROP_STATUS_BADGE[c.status]}`}
                          >
                            {CROP_STATUSES[c.status]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[#1e40af]"
                              onClick={() => openCropForm(f.id, c.id)}
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[#991b1b]"
                              onClick={() => setDeleteCropTarget(c)}
                            >
                              🗑️
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>

        {/* Recent visits table */}
        {f.visits && f.visits.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white">
              <h2 className="text-base font-bold">
                📅 آخر الزيارات ({f.visits.length})
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#1f3a26] text-white hover:bg-[#1f3a26]">
                      <TableHead className="text-white">التاريخ</TableHead>
                      <TableHead className="text-white">المحصول</TableHead>
                      <TableHead className="text-white">الملاحظات</TableHead>
                      <TableHead className="text-white">تفاصيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {f.visits.map((v) => (
                      <TableRow key={v.id} className="hover:bg-gray-50">
                        <TableCell>{formatDate(v.visitDate)}</TableCell>
                        <TableCell className="text-gray-600">
                          {v.crop?.name ?? 'زيارة عامة'}
                        </TableCell>
                        <TableCell className="text-gray-600 max-w-xs">
                          {v.notes ? truncate(v.notes, 60) : 'بدون ملاحظات'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[#1e40af]"
                            onClick={() =>
                              setActiveView('visits', {
                                selectedVisitId: v.id,
                              })
                            }
                          >
                            👁️
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        )}
      </div>
    )
  }

  // ─── Farms list ───
  return (
    <div className="space-y-4 fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1f3a26]">
          🌾 مزارعك ({farms?.length ?? 0})
        </h2>
        <Button
          onClick={() => openFarmForm(null)}
          className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
        >
          <Plus className="size-4" />
          + إضافة مزرعة
        </Button>
      </div>

      {/* Farms summary stats */}
      {farms && farms.length > 0 && (
        <Card className="p-4 gap-0 bg-gradient-to-bl from-emerald-50 to-white border-emerald-100 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#1f3a26]">
                {farms.length}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">إجمالي المزارع</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#4a7c59]">
                {farms.reduce((s, f) => s + (f._count?.crops ?? 0), 0)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">المحاصيل</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2563eb]">
                {farms.reduce((s, f) => s + (f._count?.visits ?? 0), 0)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">الزيارات</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#f59e0b]">
                {farms.reduce((s, f) => s + (f.area ?? 0), 0).toFixed(1)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">إجمالي الفدادين</div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !farms || farms.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <div className="text-5xl mb-3">🌱</div>
          <h3 className="text-lg font-bold text-[#1f3a26] mb-1">
            لا توجد مزارع بعد
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            ابدأ بإضافة مزرعتك الأولى — ستحتاجها لتسجيل الزيارات والمحاصيل.
          </p>
          <Button
            onClick={() => openFarmForm(null)}
            className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
          >
            <Plus className="size-4" />
            + إضافة مزرعة
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {farms.map((f) => {
            const cropCount = f._count?.crops ?? 0
            const visitCount = f._count?.visits ?? 0
            const isPrimary = cropCount > 0
            return (
            <Card
              key={f.id}
              className="p-4 gap-3 hover:shadow-md transition-all hover:-translate-y-0.5 border-t-4"
              style={{
                borderTopColor: isPrimary ? '#4a7c59' : '#e5e7eb',
              }}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => openFarmDetail(f.id)}
                    className="text-lg font-bold text-[#1f3a26] hover:underline text-right flex-1 min-w-0"
                  >
                    {f.name}
                  </button>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                      isPrimary
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isPrimary ? 'نشطة' : 'فارغة'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {f.owner && `👤 ${f.owner}`}
                  {f.owner && f.area !== null && ' • '}
                  {f.area !== null && `📐 ${f.area} فدان`}
                </div>
                {f.location && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    📍 {f.location}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Badge className="bg-[#dcfce7] text-[#166534] hover:bg-[#dcfce7]">
                  🌱 {cropCount} محصول
                </Badge>
                <Badge className="bg-[#dbeafe] text-[#1e40af] hover:bg-[#dbeafe]">
                  📋 {visitCount} زيارة
                </Badge>
              </div>
              {/* Visual progress bar: visits vs crops */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>النشاط</span>
                  <span>{cropCount + visitCount} إجمالي</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden flex">
                  <div
                    className="h-full bg-[#4a7c59]"
                    style={{
                      width: `${
                        cropCount + visitCount === 0
                          ? 0
                          : (cropCount / (cropCount + visitCount)) * 100
                      }%`,
                    }}
                  />
                  <div
                    className="h-full bg-[#2563eb]"
                    style={{
                      width: `${
                        cropCount + visitCount === 0
                          ? 0
                          : (visitCount / (cropCount + visitCount)) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap border-t pt-3">
                <Button
                  size="sm"
                  onClick={() => openCropForm(f.id)}
                  className="bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a] border border-[#fde68a] h-7 px-2 text-xs"
                >
                  🌱 محصول
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setActiveView('visits', {
                      openVisitForm: true,
                      selectedFarmId: f.id,
                    })
                  }
                  className="bg-[#dbeafe] text-[#1e40af] hover:bg-[#bfdbfe] border border-[#93c5fd] h-7 px-2 text-xs"
                >
                  📋 زيارة
                </Button>
                <Button
                  size="sm"
                  onClick={() => openFarmDetail(f.id)}
                  className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white h-7 px-2 text-xs"
                >
                  👁️
                </Button>
                <Button
                  size="sm"
                  onClick={() => openFarmForm(f.id)}
                  className="bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db] h-7 px-2 text-xs"
                >
                  ✏️
                </Button>
                <Button
                  size="sm"
                  onClick={() => setDeleteTarget(f)}
                  className="bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca] border border-[#fecaca] h-7 px-2 text-xs"
                >
                  🗑️
                </Button>
              </div>
            </Card>
            )
          })}
        </div>
      )}

      {/* Farm create/edit dialog */}
      <Dialog open={farmFormOpen} onOpenChange={setFarmFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editFarmId ? 'تعديل مزرعة' : 'إضافة مزرعة جديدة'}
            </DialogTitle>
            <DialogDescription>أدخل بيانات المزرعة</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitFarmForm} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="farm-name">اسم المزرعة</Label>
              <Input
                id="farm-name"
                required
                autoFocus
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مزرعة النور"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="farm-owner">المالك</Label>
              <Input
                id="farm-owner"
                value={formOwner}
                onChange={(e) => setFormOwner(e.target.value)}
                placeholder="سيد محمود"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="farm-area">المساحة (فدان)</Label>
              <Input
                id="farm-area"
                type="number"
                step="0.01"
                value={formArea}
                onChange={(e) => setFormArea(e.target.value)}
                placeholder="2.5"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="farm-location">الموقع</Label>
              <Textarea
                id="farm-location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="شمال القرية - 3كم من الطريق الرئيسي"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFarmFormOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
              >
                {submitting ? '⏳ جارٍ...' : '💾 حفظ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Crop create/edit dialog */}
      <Dialog open={cropFormOpen} onOpenChange={setCropFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cropEditId ? 'تعديل محصول' : '🌱 إضافة محصول'}
            </DialogTitle>
            <DialogDescription>بيانات المحصول للمزرعة</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCropForm} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="crop-name">اسم المحصول</Label>
              <CropAutocomplete
                id="crop-name"
                value={cropName}
                onChange={setCropName}
                onVarietySuggest={(vs) => setVarietySuggestions(vs)}
                placeholder="طماطم / قمح / بطاطس"
              />
              {varietySuggestions.length > 0 && (
                <VarietySuggestions
                  suggestions={varietySuggestions}
                  onPick={setCropVariety}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crop-variety">الصنف</Label>
              <Input
                id="crop-variety"
                value={cropVariety}
                onChange={(e) => setCropVariety(e.target.value)}
                placeholder="سوبر استرين"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crop-date">تاريخ الزراعة</Label>
              <Input
                id="crop-date"
                type="date"
                value={cropPlantingDate}
                onChange={(e) => setCropPlantingDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crop-area">المساحة (فدان)</Label>
              <Input
                id="crop-area"
                type="number"
                step="0.01"
                value={cropArea}
                onChange={(e) => setCropArea(e.target.value)}
                placeholder="1.5"
              />
            </div>
            {cropEditId && (
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select
                  value={cropStatus}
                  onValueChange={(v) =>
                    setCropStatus(v as 'active' | 'harvested' | 'failed')
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">قائم</SelectItem>
                    <SelectItem value="harvested">محصود</SelectItem>
                    <SelectItem value="failed">متعثر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCropFormOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={cropSubmitting}
                className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
              >
                {cropSubmitting ? '⏳ جارٍ...' : '💾 حفظ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Farm delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#dc2626]">
              🗑️ تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                `هل أنت متأكد من حذف "${deleteTarget.name}"؟ سيتم حذف محاصيلها وزياراتها أيضاً.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                confirmDeleteFarm()
              }}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {deleting ? '⏳ جارٍ...' : 'نعم، احذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Crop delete confirm */}
      <AlertDialog
        open={!!deleteCropTarget}
        onOpenChange={(o) => !o && setDeleteCropTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#dc2626]">
              🗑️ تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription>
              حذف هذا المحصول؟ سيتم حذف معاملاته أيضاً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                confirmDeleteCrop()
              }}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {deleting ? '⏳ جارٍ...' : 'نعم، احذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
