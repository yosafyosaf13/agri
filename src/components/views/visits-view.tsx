'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
import {
  api,
  ApiError,
  type VisitListItem,
  type Farm,
  type Crop,
} from '@/lib/api'
import {
  TREATMENT_TYPE_LIST,
  TREATMENT_TYPES,
} from '@/lib/treatment-types'
import { TREATMENT_TEMPLATES, getTemplates, type TreatmentTemplate } from '@/lib/treatment-templates'
import { formatDate, daysUntil, truncate, todayISO } from '@/lib/format'
import { useViewStore } from '@/lib/view-store'
import { useDictation } from '@/hooks/use-dictation'
import { ChevronRight, ChevronLeft, Plus, X, Camera, ImagePlus } from 'lucide-react'

type TreatmentFormRow = {
  type: 'spray' | 'fertilize' | 'control' | 'other' | ''
  product: string
  dose: string
  nextDate: string
  notes: string
}

interface VisitFormData {
  farmId: number | null
  cropId: number | null
  visitDate: string
  notes: string
  photos: string[] // data URLs
  treatments: TreatmentFormRow[]
}

export function VisitsView() {
  const viewParams = useViewStore((s) => s.viewParams)
  const setActiveView = useViewStore((s) => s.setActiveView)
  const patchViewParams = useViewStore((s) => s.patchViewParams)

  const [visits, setVisits] = useState<VisitListItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // detail
  const [visitDetail, setVisitDetail] = useState<VisitListItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // create/edit form
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<VisitFormData>({
    farmId: null,
    cropId: null,
    visitDate: todayISO(),
    notes: '',
    photos: [],
    treatments: [],
  })

  // farms + crops for form
  const [farmsList, setFarmsList] = useState<Farm[]>([])
  const [cropsForFarm, setCropsForFarm] = useState<Crop[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<VisitListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // gallery dialog — stores the photo object (for navigation + AI diagnosis display)
  const [galleryPhoto, setGalleryPhoto] = useState<string | null>(null)
  const [galleryIndex, setGalleryIndex] = useState<number>(0)

  // AI vision analysis
  const [analyzingPhotoId, setAnalyzingPhotoId] = useState<number | null>(null)
  const [togglingTreatmentId, setTogglingTreatmentId] = useState<number | null>(null)

  // Inline edit for treatment nextDate
  const [editingNextDate, setEditingNextDate] = useState<number | null>(null)
  const [editNextDateValue, setEditNextDateValue] = useState('')
  const [savingNextDate, setSavingNextDate] = useState(false)

  // Inline edit for treatment text fields (product/dose/notes)
  type EditableField = 'product' | 'dose' | 'notes'
  const [editingField, setEditingField] = useState<{ id: number; field: EditableField } | null>(null)
  const [editFieldValue, setEditFieldValue] = useState('')
  const [savingField, setSavingField] = useState(false)

  // Visit notes speech-to-text dictation (browser Web Speech API)
  const dictation = useDictation('ar-EG')

  // AI notes summarization
  const [notesSummary, setNotesSummary] = useState<string | null>(null)
  const [summarizing, setSummarizing] = useState(false)

  // AI notes translation (Arabic → English)
  const [notesTranslation, setNotesTranslation] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)

  // AI notes sentiment analysis (detect urgency)
  interface SentimentResult {
    level: string
    levelArabic: string
    levelClass: string
    emoji: string
    color: string
    reason: string
  }
  const [notesSentiment, setNotesSentiment] = useState<SentimentResult | null>(null)
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false)

  // AI recommended actions (next-step suggestions)
  const [notesActions, setNotesActions] = useState<string | null>(null)
  const [generatingActions, setGeneratingActions] = useState(false)

  async function summarizeNotes() {
    if (!visitDetail?.notes) return
    setSummarizing(true)
    try {
      const res = await api.post<{ summary: string }>(
        '/api/ai/summarize',
        { text: visitDetail.notes }
      )
      setNotesSummary(res.summary)
      toast({ title: '✨ تم التلخيص', description: 'راجع الملخص أسفل الملاحظات' })
    } catch (err) {
      toast({
        title: '⚠️ فشل التلخيص',
        description: err instanceof ApiError ? err.message : 'تعذّر تلخيص الملاحظات',
        variant: 'destructive',
      })
    } finally {
      setSummarizing(false)
    }
  }

  async function translateNotes(target: string = 'English') {
    if (!visitDetail?.notes) return
    setTranslating(true)
    try {
      const res = await api.post<{ translation: string }>(
        '/api/ai/translate',
        { text: visitDetail.notes, target }
      )
      setNotesTranslation(res.translation)
      const langLabel: Record<string, string> = {
        English: 'الإنجليزية',
        French: 'الفرنسية',
        Spanish: 'الإسبانية',
      }
      toast({ title: '🌐 تمت الترجمة', description: `راجع الترجمة ${langLabel[target] || target} أسفل الملاحظات` })
    } catch (err) {
      toast({
        title: '⚠️ فشل الترجمة',
        description: err instanceof ApiError ? err.message : 'تعذّر ترجمة الملاحظات',
        variant: 'destructive',
      })
    } finally {
      setTranslating(false)
    }
  }

  async function analyzeSentiment() {
    if (!visitDetail?.notes) return
    setAnalyzingSentiment(true)
    try {
      const res = await api.post<SentimentResult>(
        '/api/ai/sentiment',
        { text: visitDetail.notes }
      )
      setNotesSentiment(res)
      toast({ title: `${res.emoji} ${res.levelArabic}`, description: res.reason })
    } catch (err) {
      toast({
        title: '⚠️ فشل التحليل',
        description: err instanceof ApiError ? err.message : 'تعذّر تحليل المشاعر',
        variant: 'destructive',
      })
    } finally {
      setAnalyzingSentiment(false)
    }
  }

  async function generateActions() {
    if (!visitDetail?.notes) return
    setGeneratingActions(true)
    try {
      const res = await api.post<{ actions: string }>(
        '/api/ai/actions',
        { notes: visitDetail.notes, aiResult: visitDetail.aiResult ?? '' }
      )
      setNotesActions(res.actions)
      toast({ title: '🎯 تم توليد التوصيات', description: 'راجع الإجراءات المقترحة أسفل الملاحظات' })
    } catch (err) {
      toast({
        title: '⚠️ فشل توليد التوصيات',
        description: err instanceof ApiError ? err.message : 'تعذّر توليد التوصيات',
        variant: 'destructive',
      })
    } finally {
      setGeneratingActions(false)
    }
  }

  const refreshVisits = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ visits: VisitListItem[] }>('/api/visits')
      setVisits(res.visits)
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'تعذّر تحميل الزيارات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    refreshVisits()
  }, [refreshVisits])

  // Load farms list when form opens
  useEffect(() => {
    if (formOpen) {
      ;(async () => {
        try {
          const res = await api.get<{ farms: Farm[] }>('/api/farms')
          setFarmsList(res.farms)
        } catch (err) {
          toast({
            title: '⚠️ خطأ',
            description: 'تعذّر تحميل المزارع',
            variant: 'destructive',
          })
        }
      })()
    }
  }, [formOpen, toast])

  // Open form via viewParams
  useEffect(() => {
    if (viewParams.openVisitForm && !loading) {
      const preFarm = viewParams.selectedFarmId
      openVisitForm(null, typeof preFarm === 'number' ? preFarm : null)
      patchViewParams({ openVisitForm: false })
    }
  }, [viewParams.openVisitForm, loading])

  // Open detail via viewParams
  useEffect(() => {
    if (viewParams.selectedVisitId && !loading) {
      openVisitDetail(viewParams.selectedVisitId)
      patchViewParams({ selectedVisitId: undefined })
    }
  }, [viewParams.selectedVisitId, loading])

  function openVisitForm(editId: number | null, preFarmId: number | null = null) {
    setEditId(editId)
    if (editId && visits) {
      const v = visits.find((x) => x.id === editId)
      if (v) {
        setFormData({
          farmId: v.farmId,
          cropId: v.cropId,
          visitDate: v.visitDate,
          notes: v.notes ?? '',
          photos: [],
          treatments:
            v.treatments?.map((t) => ({
              type: t.type as TreatmentFormRow['type'],
              product: t.product ?? '',
              dose: t.dose ?? '',
              nextDate: t.nextDate ?? '',
              notes: t.notes ?? '',
            })) ?? [],
        })
        // load crops for this farm
        if (v.farmId) {
          loadCropsForFarm(v.farmId)
        }
        setFormOpen(true)
        return
      }
    }
    // new visit
    setFormData({
      farmId: preFarmId,
      cropId: null,
      visitDate: todayISO(),
      notes: '',
      photos: [],
      treatments: [],
    })
    if (preFarmId) {
      loadCropsForFarm(preFarmId)
    }
    setFormOpen(true)
  }

  async function loadCropsForFarm(farmId: number) {
    try {
      const res = await api.get<{ farm: Farm }>(`/api/farms/${farmId}`)
      setCropsForFarm(res.farm.crops ?? [])
    } catch {
      setCropsForFarm([])
    }
  }

  function onFarmChange(farmId: number) {
    setFormData((d) => ({ ...d, farmId, cropId: null }))
    loadCropsForFarm(farmId)
  }

  // ─── Photo compression helpers ───
  function compressImage(
    file: File,
    maxDim = 1280,
    quality = 0.85
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          let { width, height } = img
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('canvas'))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', quality)
          resolve(dataUrl)
        }
        img.onerror = () => reject(new Error('img'))
      }
      reader.onerror = () => reject(new Error('reader'))
      reader.readAsDataURL(file)
    })
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const newPhotos: string[] = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      try {
        const dataUrl = await compressImage(file)
        newPhotos.push(dataUrl)
      } catch {
        // ignore
      }
    }
    setFormData((d) => ({
      ...d,
      photos: [...d.photos, ...newPhotos].slice(0, 12),
    }))
    // reset file input value to allow reselecting the same file
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removePhoto(idx: number) {
    setFormData((d) => ({
      ...d,
      photos: d.photos.filter((_, i) => i !== idx),
    }))
  }

  function addTreatmentRow() {
    setFormData((d) => ({
      ...d,
      treatments: [
        ...d.treatments,
        { type: '', product: '', dose: '', nextDate: '', notes: '' },
      ],
    }))
  }

  function applyTemplate(template: TreatmentTemplate) {
    const nextDate =
      template.daysUntilNext != null
        ? new Date(Date.now() + template.daysUntilNext * 86400000)
            .toISOString()
            .slice(0, 10)
        : ''
    setFormData((d) => ({
      ...d,
      treatments: [
        ...d.treatments,
        {
          type: template.category,
          product: template.product,
          dose: template.dose,
          nextDate,
          notes: template.notes ?? '',
        },
      ],
    }))
  }

  function removeTreatmentRow(idx: number) {
    setFormData((d) => ({
      ...d,
      treatments: d.treatments.filter((_, i) => i !== idx),
    }))
  }

  function updateTreatmentRow(idx: number, patch: Partial<TreatmentFormRow>) {
    setFormData((d) => ({
      ...d,
      treatments: d.treatments.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }))
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!formData.farmId) {
      toast({
        title: '⚠️ خطأ',
        description: 'اختر المزرعة',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      // Filter out empty treatments (no type selected)
      const treatments = formData.treatments
        .filter((t) => t.type !== '')
        .map((t) => ({
          type: t.type as 'spray' | 'fertilize' | 'control' | 'other',
          product: t.product,
          dose: t.dose,
          nextDate: t.nextDate,
          notes: t.notes,
        }))

      if (editId) {
        await api.put(`/api/visits/${editId}`, {
          farmId: formData.farmId,
          cropId: formData.cropId,
          visitDate: formData.visitDate,
          notes: formData.notes,
        })
        toast({ title: '✅ تم الحفظ بنجاح' })
      } else {
        await api.post('/api/visits', {
          farmId: formData.farmId,
          cropId: formData.cropId,
          visitDate: formData.visitDate,
          notes: formData.notes,
          photos: formData.photos,
          treatments,
        })
        toast({ title: '✅ تم الحفظ بنجاح' })
      }
      setFormOpen(false)
      setVisitDetail(null)
      await refreshVisits()
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

  async function openVisitDetail(id: number) {
    setDetailLoading(true)
    setVisitDetail(null)
    try {
      const res = await api.get<{ visit: VisitListItem }>(`/api/visits/${id}`)
      setVisitDetail(res.visit)
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'تعذّر تحميل الزيارة',
        variant: 'destructive',
      })
    } finally {
      setDetailLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.del(`/api/visits/${deleteTarget.id}`)
      toast({ title: '✅ تم الحذف' })
      setDeleteTarget(null)
      if (visitDetail?.id === deleteTarget.id) setVisitDetail(null)
      await refreshVisits()
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

  // ─── AI Vision analysis on a visit photo ───
  async function analyzePhoto(photoId: number) {
    if (!visitDetail) return
    setAnalyzingPhotoId(photoId)
    try {
      const res = await api.post<{
        aiResult: string
        visitId: number
        photoId: number
      }>('/api/ai/vision', { visitId: visitDetail.id, photoId })
      // Update BOTH the per-photo aiResult AND the visit-level aiResult
      setVisitDetail((vd) => {
        if (!vd) return vd
        return {
          ...vd,
          aiResult: res.aiResult,
          photos: (vd.photos ?? []).map((p) =>
            p.id === res.photoId
              ? {
                  ...p,
                  aiResult: res.aiResult,
                  aiAnalyzedAt: new Date().toISOString(),
                }
              : p
          ),
        }
      })
      toast({
        title: '🤖 تم التحليل بالـ AI',
        description: 'راجع شارة التشخيص على الصورة + التقرير أسفلها',
      })
    } catch (err) {
      toast({
        title: '⚠️ فشل التحليل',
        description: err instanceof ApiError ? err.message : 'تعذّر تحليل الصورة',
        variant: 'destructive',
      })
    } finally {
      setAnalyzingPhotoId(null)
    }
  }

  // ─── Toggle a treatment's done flag ───
  async function toggleTreatment(treatmentId: number, currentDone: boolean) {
    setTogglingTreatmentId(treatmentId)
    try {
      const res = await api.patch<{ id: number; done: boolean }>(
        `/api/treatments/${treatmentId}/toggle`,
        { done: !currentDone }
      )
      setVisitDetail((vd) => {
        if (!vd || !vd.treatments) return vd
        return {
          ...vd,
          treatments: vd.treatments.map((t) =>
            t.id === res.id ? { ...t, done: res.done } : t
          ),
        }
      })
      toast({
        title: res.done ? '✅ تمّت المعالجة' : '↩️ أُعيدت للحالة المعلّقة',
      })
    } catch (err) {
      toast({
        title: '⚠️ خطأ',
        description: err instanceof ApiError ? err.message : 'فشل التحديث',
        variant: 'destructive',
      })
    } finally {
      setTogglingTreatmentId(null)
    }
  }

  // ─── Inline edit treatment nextDate ───
  function startEditNextDate(treatmentId: number, currentValue: string | null) {
    setEditingNextDate(treatmentId)
    setEditNextDateValue(currentValue ?? '')
  }

  function cancelEditNextDate() {
    setEditingNextDate(null)
    setEditNextDateValue('')
  }

  async function saveNextDate(treatmentId: number) {
    setSavingNextDate(true)
    try {
      const res = await api.patch<{ id: number; nextDate: string | null }>(
        `/api/treatments/${treatmentId}/edit`,
        { nextDate: editNextDateValue }
      )
      setVisitDetail((vd) => {
        if (!vd || !vd.treatments) return vd
        return {
          ...vd,
          treatments: vd.treatments.map((t) =>
            t.id === res.id ? { ...t, nextDate: res.nextDate } : t
          ),
        }
      })
      toast({ title: '✅ تم تحديث الموعد' })
      setEditingNextDate(null)
      setEditNextDateValue('')
    } catch (err) {
      toast({
        title: '⚠️ فشل التحديث',
        description: err instanceof ApiError ? err.message : 'فشل تحديث الموعد',
        variant: 'destructive',
      })
    } finally {
      setSavingNextDate(false)
    }
  }

  // ─── Inline edit treatment text fields (product/dose/notes) ───
  function startEditField(treatmentId: number, field: EditableField, currentValue: string | null) {
    setEditingField({ id: treatmentId, field })
    setEditFieldValue(currentValue ?? '')
  }

  function cancelEditField() {
    setEditingField(null)
    setEditFieldValue('')
  }

  async function saveField() {
    if (!editingField) return
    const { id, field } = editingField
    setSavingField(true)
    try {
      const res = await api.patch<{ id: number; product: string | null; dose: string | null; notes: string | null }>(
        `/api/treatments/${id}/edit`,
        { [field]: editFieldValue }
      )
      setVisitDetail((vd) => {
        if (!vd || !vd.treatments) return vd
        return {
          ...vd,
          treatments: vd.treatments.map((t) =>
            t.id === res.id
              ? {
                  ...t,
                  product: res.product,
                  dose: res.dose,
                  notes: res.notes,
                }
              : t
          ),
        }
      })
      toast({ title: '✅ تم التحديث' })
      setEditingField(null)
      setEditFieldValue('')
    } catch (err) {
      toast({
        title: '⚠️ فشل التحديث',
        description: err instanceof ApiError ? err.message : 'فشل التحديث',
        variant: 'destructive',
      })
    } finally {
      setSavingField(false)
    }
  }

  // ─── Detail view ───
  if (visitDetail || detailLoading) {
    if (detailLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )
    }
    const v = visitDetail!
    return (
      <div className="space-y-4 fade-in-up">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVisitDetail(null)}
          className="text-gray-600"
        >
          <ChevronRight className="size-4" />
          رجوع للزيارات
        </Button>

        {/* Header */}
        <Card className="p-5 gap-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1f3a26]">
                📅 زيارة {formatDate(v.visitDate)}
              </h2>
              <div className="text-sm text-gray-600 mt-1">
                🌾 {v.farmName}
                {v.crop?.name && ` • 🌱 ${v.crop.name}`}
                {v.crop?.variety && ` (${v.crop.variety})`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setVisitDetail(null)
                  openVisitForm(v.id)
                }}
                className="bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db]"
              >
                ✏️ تعديل
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDeleteTarget(v)}
                className="bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca] border-[#fecaca]"
              >
                🗑️ حذف
              </Button>
            </div>
          </div>
        </Card>

        {/* Notes */}
        {v.notes && (
          <Card className="p-5 gap-0">
            <div className="flex items-center justify-between border-b pb-2 mb-3 flex-wrap gap-2">
              <h2 className="text-base font-bold text-[#1f3a26]">
                📝 الملاحظات الميدانية
              </h2>
              {v.notes.length >= 20 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={summarizeNotes}
                    disabled={summarizing}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition-colors bg-[#4a7c59]/10 text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white disabled:opacity-60 disabled:cursor-wait"
                    title="تلخيص الملاحظات بالـ AI"
                  >
                    {summarizing ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        يلخّص...
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        تلخيص AI
                      </>
                    )}
                  </button>
                  <Select
                    value=""
                    disabled={translating}
                    onValueChange={(v) => translateNotes(v)}
                  >
                    <SelectTrigger
                      className="h-7 text-xs w-32 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-full"
                      disabled={translating}
                    >
                      {translating ? (
                        <span className="flex items-center gap-1">
                          <span className="inline-block w-3 h-3 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
                          يترجم...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span>🌐</span>
                          ترجمة
                        </span>
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">🇬🇧 إنجليزية (EN)</SelectItem>
                      <SelectItem value="French">🇫🇷 فرنسية (FR)</SelectItem>
                      <SelectItem value="Spanish">🇪🇸 إسبانية (ES)</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    onClick={analyzeSentiment}
                    disabled={analyzingSentiment}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition-colors bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white disabled:opacity-60 disabled:cursor-wait border border-amber-100"
                    title="تحليل مستوى الإلحاح بالـ AI"
                  >
                    {analyzingSentiment ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        يحلّل...
                      </>
                    ) : (
                      <>
                        <span>🩺</span>
                        تحليل إلحاح
                      </>
                    )}
                  </button>
                  <button
                    onClick={generateActions}
                    disabled={generatingActions}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white disabled:opacity-60 disabled:cursor-wait border border-indigo-100"
                    title="توليد توصيات إجراءات قابلة للتنفيذ بالـ AI"
                  >
                    {generatingActions ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        يولّد...
                      </>
                    ) : (
                      <>
                        <span>🎯</span>
                        توصيات إجراءات
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {v.notes}
            </div>
            {notesSummary && (
              <div className="mt-3 pt-3 border-t border-emerald-100 bg-gradient-to-bl from-emerald-50 to-blue-50 -mx-5 -mb-5 px-5 py-4 rounded-b-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#4a7c59] text-white text-xs">✨</span>
                  <h3 className="text-sm font-bold text-[#1f3a26]">
                    ملخص الملاحظات بالذكاء الاصطناعي
                  </h3>
                  <button
                    onClick={() => setNotesSummary(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 mr-auto"
                  >
                    ✕ إخفاء
                  </button>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {notesSummary}
                </div>
              </div>
            )}
            {notesTranslation && (
              <div className="mt-3 pt-3 border-t border-blue-100 bg-gradient-to-bl from-blue-50 to-indigo-50 -mx-5 px-5 py-4 rounded-b-lg" style={{ direction: 'ltr', textAlign: 'left' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs">🌐</span>
                  <h3 className="text-sm font-bold text-[#1e3a8a]">
                    English Translation
                  </h3>
                  <button
                    onClick={() => setNotesTranslation(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
                  >
                    ✕ Hide
                  </button>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
                  {notesTranslation}
                </div>
              </div>
            )}
            {notesSentiment && (
              <div className={`mt-3 pt-3 border-t -mx-5 px-5 py-4 rounded-b-lg border ${notesSentiment.levelClass}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold" style={{ background: notesSentiment.color, color: 'white' }}>
                    {notesSentiment.emoji}
                  </span>
                  <h3 className="text-sm font-bold">
                    🩺 تحليل مستوى الإلحاح
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${notesSentiment.levelClass}`}>
                    {notesSentiment.levelArabic}
                  </span>
                  <button
                    onClick={() => setNotesSentiment(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 mr-auto"
                  >
                    ✕ إخفاء
                  </button>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {notesSentiment.reason}
                </p>
              </div>
            )}
            {notesActions && (
              <div className="mt-3 pt-3 border-t border-indigo-100 bg-gradient-to-bl from-indigo-50 to-purple-50 -mx-5 px-5 py-4 rounded-b-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-sm">🎯</span>
                  <h3 className="text-sm font-bold text-[#3730a3]">
                    توصيات الإجراءات القابلة للتنفيذ
                  </h3>
                  <button
                    onClick={() => setNotesActions(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 mr-auto"
                  >
                    ✕ إخفاء
                  </button>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {notesActions}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Photos */}
        {v.photos && v.photos.length > 0 && (
          <Card className="p-5 gap-0">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h2 className="text-base font-bold text-[#1f3a26]">
                📷 الصور ({v.photos.length})
              </h2>
              <span className="text-xs text-gray-500">
                اضغط صورة لتكبيرها · زر 🤖 لتحليلها بالـ AI
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {v.photos.map((p) => {
                const isAnalyzing = analyzingPhotoId === p.id
                const hasDiagnosis = !!p.aiResult
                return (
                  <div
                    key={p.id}
                    className={`group relative overflow-hidden rounded-lg bg-gray-100 border-2 transition-colors ${
                      hasDiagnosis
                        ? 'border-[#4a7c59]'
                        : 'border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setGalleryIndex(v.photos!.indexOf(p))
                        setGalleryPhoto(p.photoPath)
                      }}
                      className="block w-full aspect-square hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={`/uploads/${p.photoPath}`}
                        alt="صورة الزيارة"
                        className="w-full h-full object-cover"
                      />
                    </button>
                    {/* Diagnosis badge top-right */}
                    {hasDiagnosis && (
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-[#4a7c59] text-white text-[10px] font-bold shadow-md flex items-center gap-0.5">
                        🤖 تم التحليل
                      </span>
                    )}
                    <button
                      onClick={() => analyzePhoto(p.id)}
                      disabled={isAnalyzing}
                      title="تحليل الصورة بالذكاء الاصطناعي"
                      className="absolute bottom-1.5 left-1.5 right-1.5 mx-auto w-fit px-2 py-1 rounded-full bg-[#4a7c59] text-white text-[11px] font-semibold shadow-md hover:bg-[#1f3a26] disabled:opacity-60 disabled:cursor-wait flex items-center gap-1 transition-colors"
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          يحلّل...
                        </>
                      ) : hasDiagnosis ? (
                        <>
                          <span>🔄</span>
                          إعادة التحليل
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          تحليل AI
                        </>
                      )}
                    </button>
                    {/* Per-photo diagnosis preview (expandable) */}
                    {hasDiagnosis && (
                      <details className="bg-emerald-50 border-t border-emerald-200 px-3 py-2">
                        <summary className="text-xs font-semibold text-[#1f3a26] cursor-pointer hover:text-[#4a7c59] transition-colors list-none flex items-center gap-1">
                          <span>📄</span>
                          <span>عرض التشخيص</span>
                        </summary>
                        <div className="mt-2 text-[11px] text-gray-700 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto scroll-pretty">
                          {p.aiResult}
                        </div>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Treatments */}
        {v.treatments && v.treatments.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b bg-[#1f3a26] text-white">
              <h2 className="text-base font-bold">
                🧪 المعاملات ({v.treatments.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#1f3a26] text-white hover:bg-[#1f3a26]">
                    <TableHead className="text-white">النوع</TableHead>
                    <TableHead className="text-white">المنتَج</TableHead>
                    <TableHead className="text-white">الجرعة</TableHead>
                    <TableHead className="text-white">الموعد القادم</TableHead>
                    <TableHead className="text-white">الحالة</TableHead>
                    <TableHead className="text-white">ملاحظات</TableHead>
                    <TableHead className="text-white">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {v.treatments.map((t) => {
                    const days = t.nextDate ? daysUntil(t.nextDate) : null
                    let statusLabel = '—'
                    let statusClass = 'bg-gray-100 text-gray-600'
                    if (t.done) {
                      statusLabel = 'تم'
                      statusClass = 'bg-[#dcfce7] text-[#166534]'
                    } else if (days === null || t.nextDate === null) {
                      statusLabel = '—'
                    } else if (days < 0) {
                      statusLabel = `فات منذ ${Math.abs(days)} يوم`
                      statusClass = 'bg-[#fee2e2] text-[#991b1b]'
                    } else {
                      statusLabel = `بعد ${days} يوم`
                      statusClass = 'bg-[#fef3c7] text-[#92400e]'
                    }
                    return (
                      <TableRow key={t.id} className="hover:bg-gray-50">
                        <TableCell className="font-bold text-[#1f3a26]">
                          {TREATMENT_TYPES[t.type as keyof typeof TREATMENT_TYPES] ?? t.type}
                        </TableCell>
                        <TableCell>
                          {editingField?.id === t.id && editingField.field === 'product' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editFieldValue}
                                onChange={(e) => setEditFieldValue(e.target.value)}
                                className="px-1.5 py-0.5 text-xs border border-emerald-200 rounded focus:outline-none focus:ring-1 focus:ring-[#4a7c59] w-28"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveField()
                                  if (e.key === 'Escape') cancelEditField()
                                }}
                              />
                              <button onClick={saveField} disabled={savingField} className="w-5 h-5 rounded-full bg-[#4a7c59] text-white hover:bg-[#1f3a26] disabled:opacity-60 flex items-center justify-center transition-colors" title="حفظ">
                                {savingField ? <span className="inline-block w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </button>
                              <button onClick={cancelEditField} disabled={savingField} className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-60 flex items-center justify-center transition-colors text-[10px]" title="إلغاء">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => startEditField(t.id, 'product', t.product)} className="group inline-flex items-center gap-1 hover:bg-emerald-50/50 rounded px-1 py-0.5 transition-colors" title="تعديل المنتَج">
                              <span className={t.product ? '' : 'text-gray-400'}>{t.product || '—'}</span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400">✏️</span>
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingField?.id === t.id && editingField.field === 'dose' ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editFieldValue}
                                onChange={(e) => setEditFieldValue(e.target.value)}
                                className="px-1.5 py-0.5 text-xs border border-emerald-200 rounded focus:outline-none focus:ring-1 focus:ring-[#4a7c59] w-28"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveField()
                                  if (e.key === 'Escape') cancelEditField()
                                }}
                              />
                              <button onClick={saveField} disabled={savingField} className="w-5 h-5 rounded-full bg-[#4a7c59] text-white hover:bg-[#1f3a26] disabled:opacity-60 flex items-center justify-center transition-colors" title="حفظ">
                                {savingField ? <span className="inline-block w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                              </button>
                              <button onClick={cancelEditField} disabled={savingField} className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-60 flex items-center justify-center transition-colors text-[10px]" title="إلغاء">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => startEditField(t.id, 'dose', t.dose)} className="group inline-flex items-center gap-1 hover:bg-emerald-50/50 rounded px-1 py-0.5 transition-colors" title="تعديل الجرعة">
                              <span className={t.dose ? '' : 'text-gray-400'}>{t.dose || '—'}</span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400">✏️</span>
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingNextDate === t.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={editNextDateValue}
                                onChange={(e) => setEditNextDateValue(e.target.value)}
                                className="px-1.5 py-0.5 text-xs border border-emerald-200 rounded focus:outline-none focus:ring-1 focus:ring-[#4a7c59]"
                                autoFocus
                              />
                              <button
                                onClick={() => saveNextDate(t.id)}
                                disabled={savingNextDate}
                                className="w-6 h-6 rounded-full bg-[#4a7c59] text-white hover:bg-[#1f3a26] disabled:opacity-60 flex items-center justify-center transition-colors"
                                title="حفظ"
                              >
                                {savingNextDate ? (
                                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                )}
                              </button>
                              <button
                                onClick={cancelEditNextDate}
                                disabled={savingNextDate}
                                className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-60 flex items-center justify-center transition-colors"
                                title="إلغاء"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditNextDate(t.id, t.nextDate)}
                              className="group inline-flex items-center gap-1 text-right hover:bg-emerald-50/50 rounded px-1 py-0.5 transition-colors"
                              title="تعديل الموعد"
                            >
                              <span className={t.nextDate ? '' : 'text-gray-400'}>
                                {t.nextDate ? formatDate(t.nextDate) : '—'}
                              </span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400">
                                ✏️
                              </span>
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600 max-w-xs">
                          {editingField?.id === t.id && editingField.field === 'notes' ? (
                            <div className="flex flex-col gap-1">
                              <textarea
                                value={editFieldValue}
                                onChange={(e) => setEditFieldValue(e.target.value)}
                                className="px-1.5 py-0.5 text-xs border border-emerald-200 rounded focus:outline-none focus:ring-1 focus:ring-[#4a7c59] w-44 resize-y"
                                autoFocus
                                rows={2}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) saveField()
                                  if (e.key === 'Escape') cancelEditField()
                                }}
                              />
                              <div className="flex items-center gap-1">
                                <button onClick={saveField} disabled={savingField} className="w-5 h-5 rounded-full bg-[#4a7c59] text-white hover:bg-[#1f3a26] disabled:opacity-60 flex items-center justify-center transition-colors" title="حفظ (Ctrl+Enter)">
                                  {savingField ? <span className="inline-block w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </button>
                                <button onClick={cancelEditField} disabled={savingField} className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-60 flex items-center justify-center transition-colors text-[10px]" title="إلغاء">✕</button>
                                <span className="text-[9px] text-gray-400">Ctrl+Enter للحفظ</span>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => startEditField(t.id, 'notes', t.notes)} className="group inline-flex items-center gap-1 hover:bg-emerald-50/50 rounded px-1 py-0.5 transition-colors text-right" title="تعديل الملاحظات">
                              <span className={t.notes ? '' : 'text-gray-400'}>{t.notes ? truncate(t.notes, 60) : '—'}</span>
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400 shrink-0">✏️</span>
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => toggleTreatment(t.id, t.done)}
                            disabled={togglingTreatmentId === t.id}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-wait ${
                              t.done
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-[#4a7c59] text-white hover:bg-[#1f3a26]'
                            }`}
                            title={t.done ? 'إعادة للمعالجة المعلّقة' : 'تعليم كمنجزة'}
                          >
                            {togglingTreatmentId === t.id ? (
                              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : t.done ? (
                              '↩️ إعادة'
                            ) : (
                              '✓ تم'
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* AI vision diagnosis result */}
        {v.aiResult ? (
          <Card className="p-5 gap-0 bg-gradient-to-bl from-emerald-50 to-blue-50 border-emerald-200" style={{ borderRight: '4px solid #4a7c59' }}>
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2 mb-3">
              <h2 className="text-base font-bold text-[#1f3a26] flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#4a7c59] text-white text-sm">🤖</span>
                تقرير تشخيص الصور بالذكاء الاصطناعي
              </h2>
              <Badge className="bg-[#4a7c59] text-white">VLM</Badge>
            </div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {v.aiResult}
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-200 text-xs text-gray-500 flex items-center gap-2">
              <span>💡</span>
              <span>التحليل يُولَّد بالـ AI وقد لا يكون دقيقاً 100%. راجع خبيراً للتأكيد.</span>
            </div>
          </Card>
        ) : (
          <Card
            className="p-4 gap-0 bg-[#f0fdf4] border border-emerald-200"
            style={{ borderRight: '4px solid #4a7c59' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🤖</span>
              <div className="text-sm text-[#1f3a26]">
                <strong>تحليل الصور بالـ AI متاح الآن!</strong>
                <p className="mt-1 text-gray-600">
                  اضغط زر «🤖 تحليل AI» على أي صورة بالأعلى للحصول على تشخيص
                  مرئي فوري للأعراض والآفات المحتملة وتوصية علاجية. تُحفظ النتيجة
                  في زيارتك لمراجعتها لاحقاً.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    )
  }

  // ─── Visits list ───
  return (
    <div className="space-y-4 fade-in-up">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1f3a26]">
          الزيارات ({visits?.length ?? 0})
        </h2>
        <Button
          onClick={() => openVisitForm(null)}
          className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
        >
          <Plus className="size-4" />
          + تسجيل زيارة
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !visits || visits.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="text-lg font-bold text-[#1f3a26] mb-1">لا توجد زيارات</h3>
          <p className="text-gray-500 text-sm mb-4">
            ابدأ بتسجيل أول زيارة ميدانية.
          </p>
          <Button
            onClick={() => openVisitForm(null)}
            className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
          >
            <Plus className="size-4" />
            + تسجيل زيارة
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visits.map((v) => (
            <Card
              key={v.id}
              className="overflow-hidden hover:shadow-md transition-shadow p-0 gap-0"
            >
              <button
                onClick={() => openVisitDetail(v.id)}
                className="block w-full text-right"
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
                    {v.photoCount ? ` • ${v.photoCount} 📷` : ''}
                  </div>
                  <div className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {v.notes ? truncate(v.notes, 90) : 'بدون ملاحظات'}
                  </div>
                </div>
              </button>
              <div className="flex gap-1 border-t p-2 bg-gray-50">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[#1e40af]"
                  onClick={() => openVisitDetail(v.id)}
                >
                  👁️ عرض
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[#92400e]"
                  onClick={() => openVisitForm(v.id)}
                >
                  ✏️ تعديل
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[#991b1b]"
                  onClick={() => setDeleteTarget(v)}
                >
                  🗑️ حذف
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Visit form dialog ─── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-pretty">
          <DialogHeader>
            <DialogTitle>
              {editId ? 'تعديل زيارة' : 'تسجيل زيارة جديدة'}
            </DialogTitle>
            <DialogDescription>
              سجّل ملاحظاتك الميدانية + الصور + المعالجة الاختيارية
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitForm} className="space-y-5">
            {/* Card 1: farm + crop + date + notes */}
            <div className="space-y-3 p-4 rounded-lg border bg-white">
              <h3 className="font-bold text-[#1f3a26]">📍 المزرعة</h3>
              <div className="space-y-1.5">
                <Label>المزرعة *</Label>
                <Select
                  value={formData.farmId ? String(formData.farmId) : undefined}
                  onValueChange={(v) => onFarmChange(Number(v))}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="— اختر المزرعة —" />
                  </SelectTrigger>
                  <SelectContent>
                    {farmsList.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>المحصول</Label>
                <Select
                  value={
                    formData.cropId ? String(formData.cropId) : undefined
                  }
                  onValueChange={(v) =>
                    setFormData((d) => ({ ...d, cropId: Number(v) }))
                  }
                  disabled={!formData.farmId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="— اختر المحصول —" />
                  </SelectTrigger>
                  <SelectContent>
                    {cropsForFarm
                      .filter((c) => c.status === 'active')
                      .map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                          {c.variety ? ` (${c.variety})` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visit-date">تاريخ الزيارة</Label>
                <Input
                  id="visit-date"
                  type="date"
                  required
                  value={formData.visitDate}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, visitDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="visit-notes">الملاحظات الميدانية</Label>
                  <button
                    type="button"
                    onClick={() =>
                      dictation.toggle((text) => {
                        setFormData((d) => ({
                          ...d,
                          notes: (d.notes ? d.notes + ' ' : '') + text.trim(),
                        }))
                      })
                    }
                    className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold transition-colors ${
                      dictation.isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-[#4a7c59]/10 text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white'
                    }`}
                    title={
                      dictation.isListening
                        ? 'إيقاف الإملاء'
                        : 'بدء الإملاء الصوتي'
                    }
                  >
                    {dictation.isListening ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        يستمع...
                      </>
                    ) : (
                      <>
                        <span>🎙️</span>
                        إملاء صوتي
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Textarea
                    id="visit-notes"
                    rows={4}
                    value={
                      dictation.isListening && dictation.interimText
                        ? formData.notes + ' ' + dictation.interimText
                        : formData.notes
                    }
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, notes: e.target.value }))
                    }
                    placeholder="مثال: لاحظت اصفرار أوراق في الجزء الشمالي..."
                    className={dictation.isListening ? 'ring-2 ring-[#4a7c59]/40' : ''}
                  />
                  {dictation.isListening && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-[#4a7c59] bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      يسجل الآن
                    </div>
                  )}
                </div>
                {dictation.isListening && (
                  <p className="text-[11px] text-gray-500">
                    💡 تحدث بوضوح. سيُضاف النص تلقائياً عند توقفك. يمكنك تعديله يدوياً بعد ذلك.
                  </p>
                )}
              </div>
            </div>

            {/* Card 2: photos (create only) */}
            {!editId && (
              <div className="space-y-3 p-4 rounded-lg border bg-white">
                <h3 className="font-bold text-[#1f3a26]">📸 الصور</h3>
                <label
                  htmlFor="photo-input"
                  className="block cursor-pointer border-2 border-dashed rounded-lg py-5 text-center text-[#4a7c59] hover:bg-[#f0fdf4] transition-colors"
                  style={{ borderColor: 'var(--green, #4a7c59)' }}
                >
                  <Camera className="mx-auto mb-1 size-6" />
                  <span className="text-sm font-medium">
                    📷 التقط صورة أو اختر من المعرض
                  </span>
                  <input
                    ref={fileInputRef}
                    id="photo-input"
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={onFilesSelected}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500">
                  حد أقصى 5MB لكل صورة. سيتم ضغطها تلقائياً قبل الرفع.
                </p>
                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {formData.photos.map((p, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-md overflow-hidden bg-gray-100"
                      >
                        <img
                          src={p}
                          alt={`صورة ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-0.5 left-0.5 bg-black/60 text-white rounded-full size-5 flex items-center justify-center text-xs hover:bg-black/80"
                          aria-label="حذف الصورة"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Card 3: treatments (repeatable, create only) */}
            {!editId && (
              <div className="space-y-3 p-4 rounded-lg border bg-white">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-bold text-[#1f3a26]">🧪 المعالجة</h3>
                  <div className="flex items-center gap-2">
                    {/* Templates quick-add dropdown */}
                    <Select
                      value=""
                      onValueChange={(id) => {
                        const tmpl = TREATMENT_TEMPLATES.find((t) => t.id === id)
                        if (tmpl) applyTemplate(tmpl)
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-44 border-amber-200 bg-amber-50">
                        <SelectValue placeholder="⚡ قوالب جاهزة" />
                      </SelectTrigger>
                      <SelectContent>
                        {TREATMENT_TEMPLATES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="text-xs">
                              {TREATMENT_TYPES[t.category]} · {t.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addTreatmentRow}
                      className="h-7 text-xs"
                    >
                      <Plus className="size-3" />
                      معالجة فارغة
                    </Button>
                  </div>
                </div>
                {formData.treatments.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed border-amber-200 rounded-md bg-amber-50/50">
                    <p className="text-xs text-gray-600 mb-2">
                      💡 ابدأ بقالب جاهز أو أضف معالجة فارغة
                    </p>
                    <p className="text-[11px] text-gray-500">
                      القوالب تساعدك على الإدخال السريع للمعالجات الشائعة
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.treatments.map((t, i) => (
                      <div
                        key={i}
                        className="rounded-md border p-3 bg-gray-50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">
                            معالجة #{i + 1}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[#991b1b]"
                            onClick={() => removeTreatmentRow(i)}
                          >
                            <X className="size-3" />
                            حذف
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          <Label>نوع المعالجة</Label>
                          <Select
                            value={t.type || undefined}
                            onValueChange={(v) =>
                              updateTreatmentRow(i, {
                                type: v as TreatmentFormRow['type'],
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="— بدون معالجة —" />
                            </SelectTrigger>
                            <SelectContent>
                              {TREATMENT_TYPE_LIST.map((tt) => (
                                <SelectItem key={tt.value} value={tt.value}>
                                  {tt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label>المنتَج</Label>
                            <Input
                              value={t.product}
                              onChange={(e) =>
                                updateTreatmentRow(i, { product: e.target.value })
                              }
                              placeholder="المنتَج"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>الجرعة</Label>
                            <Input
                              value={t.dose}
                              onChange={(e) =>
                                updateTreatmentRow(i, { dose: e.target.value })
                              }
                              placeholder="الجرعة"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>📅 موعد التدخل القادم</Label>
                          <Input
                            type="date"
                            value={t.nextDate}
                            onChange={(e) =>
                              updateTreatmentRow(i, { nextDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>ملاحظات المعالجة</Label>
                          <Textarea
                            rows={2}
                            value={t.notes}
                            onChange={(e) =>
                              updateTreatmentRow(i, { notes: e.target.value })
                            }
                            placeholder="ملاحظات المعالجة (اختياري)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white"
              >
                {submitting ? '⏳ جارٍ...' : '💾 احفظ الزيارة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
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
                `حذف هذه الزيارة؟ ${formatDate(deleteTarget.visitDate)} — ${deleteTarget.farmName}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white"
            >
              {deleting ? '⏳ جارٍ...' : 'نعم، احذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo gallery lightbox with navigation + AI diagnosis */}
      <Dialog
        open={!!galleryPhoto}
        onOpenChange={(o) => !o && setGalleryPhoto(null)}
      >
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black/95">
          {(() => {
            const photos = visitDetail?.photos ?? []
            const current = photos[galleryIndex]
            const hasPrev = galleryIndex > 0
            const hasNext = galleryIndex < photos.length - 1
            const hasDiagnosis = !!current?.aiResult
            const isAnalyzing = current ? analyzingPhotoId === current.id : false
            return (
              <div className="relative">
                {galleryPhoto && (
                  <img
                    src={`/uploads/${galleryPhoto}`}
                    alt="صورة الزيارة"
                    className="w-full max-h-[70vh] object-contain bg-black"
                  />
                )}
                {/* Navigation arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        if (hasPrev) {
                          setGalleryIndex(galleryIndex - 1)
                          setGalleryPhoto(photos[galleryIndex - 1].photoPath)
                        }
                      }}
                      disabled={!hasPrev}
                      className="absolute top-1/2 right-2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 disabled:opacity-20 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                      aria-label="السابق"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                    <button
                      onClick={() => {
                        if (hasNext) {
                          setGalleryIndex(galleryIndex + 1)
                          setGalleryPhoto(photos[galleryIndex + 1].photoPath)
                        }
                      }}
                      disabled={!hasNext}
                      className="absolute top-1/2 left-2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 disabled:opacity-20 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                      aria-label="التالي"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                  </>
                )}
                {/* Counter + AI badge */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {photos.length > 1 && (
                    <span className="bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                      {galleryIndex + 1} / {photos.length}
                    </span>
                  )}
                  {hasDiagnosis && (
                    <span className="bg-[#4a7c59] text-white text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                      🤖 تشخيص متاح
                    </span>
                  )}
                </div>
                {/* AI analysis button overlay */}
                {current && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                    <button
                      onClick={() => analyzePhoto(current.id)}
                      disabled={isAnalyzing}
                      className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-lg disabled:opacity-60 disabled:cursor-wait flex items-center gap-1.5 transition-colors"
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          يحلّل...
                        </>
                      ) : hasDiagnosis ? (
                        <>
                          <span>🔄</span>
                          إعادة التحليل
                        </>
                      ) : (
                        <>
                          <span>🤖</span>
                          تحليل AI
                        </>
                      )}
                    </button>
                  </div>
                )}
                {/* AI diagnosis panel (if current photo has one) */}
                {hasDiagnosis && current?.aiResult && (
                  <div className="bg-gradient-to-t from-[#1f3a26] to-[#4a7c59] text-white p-4 max-h-[30vh] overflow-y-auto scroll-pretty">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-sm">🤖</span>
                      <h3 className="text-sm font-bold">تقرير التشخيص بالذكاء الاصطناعي</h3>
                    </div>
                    <div className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
                      {current.aiResult}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
