'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { api, ApiError } from '@/lib/api'
import {
  MapPin, Satellite, Crosshair, AlertTriangle, CheckCircle2,
  Map as MapIcon, Layers, Bug, Leaf, Droplet, Zap,
} from 'lucide-react'

// Fix Leaflet icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom icons for infection points
const infectionIcon = L.divIcon({
  html: '<div style="background:#dc2626;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>',
  className: 'infection-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
})

const treatedIcon = L.divIcon({
  html: '<div style="background:#4a7c59;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>',
  className: 'treated-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
})

// Esri World Imagery (free satellite tiles)
const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

interface InfectionPoint {
  id: number
  farmId: number
  cropId: number | null
  latitude: number
  longitude: number
  type: string
  severity: string
  description: string | null
  status: string
  farmName: string
  cropName: string | null
  treatmentNotes: string | null
  createdAt: string
}

interface FarmMap {
  id: number
  name: string
  latitude: number | null
  longitude: number | null
  boundary: string | null
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

const INFECTION_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  disease: { label: '🦠 مرض فطري/بكتيري', icon: '🦠', color: '#dc2626' },
  pest: { label: '🐛 آفة حشرية', icon: '🐛', color: '#f59e0b' },
  weed: { label: '🌿 حشائش', icon: '🌿', color: '#2563eb' },
  nutrient: { label: '⚡ نقص عنصر غذائي', icon: '⚡', color: '#7c3aed' },
}

const SEVERITY_LABELS: Record<string, string> = {
  low: 'منخفضة 🟢',
  medium: 'متوسطة 🟡',
  high: 'مرتفعة 🔴',
}

export function SatMapView() {
  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite')
  const [farms, setFarms] = useState<FarmMap[]>([])
  const [infections, setInfections] = useState<InfectionPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [clickMode, setClickMode] = useState<'none' | 'infection'>('none')
  const [addInfectionOpen, setAddInfectionOpen] = useState(false)
  const [newInfection, setNewInfection] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedInfection, setSelectedInfection] = useState<InfectionPoint | null>(null)
  const [form, setForm] = useState({ farmId: '', cropId: '', type: 'disease', severity: 'medium', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [fRes, iRes] = await Promise.all([
        api.get<{ farms: FarmMap[] }>('/api/farms'),
        api.get<{ points: InfectionPoint[] }>('/api/infections'),
      ])
      setFarms(fRes.farms.map((f: any) => ({
        id: f.id, name: f.name,
        latitude: f.latitude, longitude: f.longitude, boundary: f.boundary,
      })))
      setInfections(iRes.points)
    } catch (err) {
      toast({ title: '⚠️ خطأ', description: 'تعذّر تحميل الخريطة', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { refresh() }, [refresh])

  function handleMapClick(lat: number, lng: number) {
    if (clickMode === 'infection') {
      setNewInfection({ lat, lng })
      setAddInfectionOpen(true)
      setClickMode('none')
    }
  }

  async function submitInfection(e: React.FormEvent) {
    e.preventDefault()
    if (!newInfection || !form.farmId) return
    setSubmitting(true)
    try {
      await api.post('/api/infections', {
        farmId: Number(form.farmId),
        cropId: form.cropId ? Number(form.cropId) : null,
        latitude: newInfection.lat,
        longitude: newInfection.lng,
        type: form.type,
        severity: form.severity,
        description: form.description || null,
      })
      toast({ title: '✅ تم تسجيل نقطة الإصابة', description: 'ستظهر على الخريطة' })
      setAddInfectionOpen(false)
      setNewInfection(null)
      setForm({ farmId: '', cropId: '', type: 'disease', severity: 'medium', description: '' })
      await refresh()
    } catch (err) {
      toast({ title: '⚠️ خطأ', description: err instanceof ApiError ? err.message : 'فشل', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function treatInfection(id: number) {
    try {
      await api.patch(`/api/infections/${id}`, { status: 'treated', treatmentNotes: 'تمت المعالجة بواسطة فريق المكافحة' })
      toast({ title: '✅ تم تعليم الإصابة كمعالَجة' })
      setSelectedInfection(null)
      await refresh()
    } catch (err) {
      toast({ title: '⚠️ خطأ', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  // Default center: first farm with GPS, or Egypt center
  const center: [number, number] = farms.find(f => f.latitude && f.longitude)
    ? [farms.find(f => f.latitude && f.longitude)!.latitude!, farms.find(f => f.latitude && f.longitude)!.longitude!]
    : [26.8206, 30.8025] // Egypt center

  return (
    <div className="space-y-4 fade-in-up">
      {/* Header */}
      <Card className="p-4 gap-0 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Satellite className="h-6 w-6 text-[#4a7c59]" />
            <div>
              <h2 className="text-xl font-bold text-[#1f3a26]">خريطة الأقمار الصناعية</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                عرض واقعي للمزارع + نقاط الإصابة للفرق الميدانية
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Map type toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <button
                onClick={() => setMapType('satellite')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mapType === 'satellite' ? 'bg-[#1f3a26] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Satellite className="size-3.5 inline mb-0.5" /> أقمار
              </button>
              <button
                onClick={() => setMapType('street')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${mapType === 'street' ? 'bg-[#1f3a26] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <MapIcon className="size-3.5 inline mb-0.5" /> خرائط
              </button>
            </div>
            {/* Add infection mode */}
            <Button
              size="sm"
              onClick={() => setClickMode(clickMode === 'infection' ? 'none' : 'infection')}
              className={`h-9 ${clickMode === 'infection' ? 'bg-red-500 text-white animate-pulse' : 'bg-[#dc2626] hover:bg-red-700 text-white'}`}
            >
              <Crosshair className="size-4" />
              {clickMode === 'infection' ? 'اضغط على الخريطة...' : 'إضافة إصابة'}
            </Button>
          </div>
        </div>
        {/* Stats bar */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <Badge className="bg-emerald-100 text-emerald-700">🌾 {farms.length} مزرعة</Badge>
          <Badge className="bg-red-100 text-red-700">
            <AlertTriangle className="size-3 inline" /> {infections.filter(i => i.status === 'active').length} إصابة نشطة
          </Badge>
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-3 inline" /> {infections.filter(i => i.status === 'treated').length} معالَجة
          </Badge>
        </div>
      </Card>

      {/* Map */}
      <Card className="p-0 gap-0 overflow-hidden shadow-md" style={{ height: '70vh', minHeight: '400px' }}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url={mapType === 'satellite' ? satelliteUrl : streetUrl}
            attribution={mapType === 'satellite'
              ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              : '&copy; OpenStreetMap contributors'}
            maxZoom={19}
          />
          <ClickHandler onClick={handleMapClick} />

          {/* Farm markers + boundaries */}
          {farms.filter(f => f.latitude && f.longitude).map(farm => (
            <Marker key={farm.id} position={[farm.latitude!, farm.longitude!]}>
              <Popup>
                <div className="text-right">
                  <strong>{farm.name}</strong>
                  <br />
                  <span className="text-xs text-gray-600">
                    {farm.latitude?.toFixed(5)}, {farm.longitude?.toFixed(5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Farm boundaries (polygons) */}
          {farms.filter(f => f.boundary).map(farm => {
            try {
              const geo = JSON.parse(farm.boundary!)
              if (geo.type === 'Polygon' && geo.coordinates?.[0]) {
                const positions = geo.coordinates[0].map((c: number[]) => [c[1], c[0]] as [number, number])
                return (
                  <Polygon
                    key={`boundary-${farm.id}`}
                    positions={positions}
                    pathOptions={{ color: '#4a7c59', fillColor: '#4a7c59', fillOpacity: 0.15, weight: 2 }}
                  />
                )
              }
            } catch { /* ignore invalid boundary */ }
            return null
          })}

          {/* Infection markers */}
          {infections.map(point => (
            <Marker
              key={point.id}
              position={[point.latitude, point.longitude]}
              icon={point.status === 'active' ? infectionIcon : treatedIcon}
              eventHandlers={{
                click: () => setSelectedInfection(point),
              }}
            >
              <Popup>
                <div className="text-right" style={{ minWidth: '180px' }}>
                  <strong>{INFECTION_TYPES[point.type]?.label || point.type}</strong>
                  <br />
                  <span className="text-xs">
                    📍 {point.farmName}
                    {point.cropName ? ` — ${point.cropName}` : ''}
                  </span>
                  <br />
                  <span className="text-xs">
                    الشدة: {SEVERITY_LABELS[point.severity] || point.severity}
                  </span>
                  <br />
                  <span className={`text-xs font-bold ${point.status === 'active' ? 'text-red-600' : 'text-green-600'}`}>
                    {point.status === 'active' ? '🔴 نشطة' : '✅ معالَجة'}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </Card>

      {/* Legend */}
      <Card className="p-3 shadow-sm">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-[#4a7c59]" /> مزرعة
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#dc2626]" /> إصابة نشطة
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#4a7c59]" /> إصابة معالَجة
          </span>
          <span className="text-gray-400">| للإضافة: اضغط «إضافة إصابة» ثم اضغط على الخريطة</span>
        </div>
      </Card>

      {/* Active infections list */}
      {infections.filter(i => i.status === 'active').length > 0 && (
        <Card className="overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b bg-[#dc2626] text-white">
            <h3 className="text-base font-bold">🔴 الإصابات النشطة ({infections.filter(i => i.status === 'active').length})</h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto scroll-pretty">
            {infections.filter(i => i.status === 'active').map(p => (
              <div key={p.id} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#1f3a26]">{INFECTION_TYPES[p.type]?.label || p.type}</span>
                    <Badge className={`text-[10px] ${
                      p.severity === 'high' ? 'bg-red-100 text-red-700' :
                      p.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>{SEVERITY_LABELS[p.severity]}</Badge>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    📍 {p.farmName}{p.cropName ? ` · ${p.cropName}` : ''}
                    {' · '}{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                  </div>
                  {p.description && <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>}
                </div>
                <Button size="sm" onClick={() => treatInfection(p.id)} className="bg-[#4a7c59] hover:bg-[#1f3a26] text-white h-8">
                  <CheckCircle2 className="size-3.5" /> معالَجة
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add infection dialog */}
      <Dialog open={addInfectionOpen} onOpenChange={setAddInfectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Crosshair className="h-5 w-5 inline text-[#dc2626]" /> تسجيل نقطة إصابة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded-md">
            📍 الإحداثيات: {newInfection?.lat.toFixed(5)}, {newInfection?.lng.toFixed(5)}
          </div>
          <form onSubmit={submitInfection} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">المزرعة *</Label>
              <Select value={form.farmId} onValueChange={v => setForm({...form, farmId: v})} required>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر المزرعة" /></SelectTrigger>
                <SelectContent>
                  {farms.map(f => <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">نوع الإصابة *</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(INFECTION_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الشدة</Label>
                <Select value={form.severity} onValueChange={v => setForm({...form, severity: v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">منخفضة 🟢</SelectItem>
                    <SelectItem value="medium">متوسطة 🟡</SelectItem>
                    <SelectItem value="high">مرتفعة 🔴</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">الوصف</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                rows={2}
                placeholder="مثال: اصفرار الأوراق السفلية مع بقع بنية..."
                className="text-sm"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddInfectionOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={submitting || !form.farmId} className="bg-[#dc2626] hover:bg-red-700 text-white">
                {submitting ? '⏳...' : '🚨 تسجيل'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
