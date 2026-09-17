// ─── Lightweight API client (no external deps) ───

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    credentials: 'same-origin',
  })
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as Record<string, unknown>).error)
        : null) ||
      (typeof data === 'string' ? data : '') ||
      `HTTP ${res.status}`
    throw new ApiError(message, res.status)
  }
  return data as T
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T, B = unknown>(url: string, body?: B) =>
    request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T, B = unknown>(url: string, body?: B) =>
    request<T>(url, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T, B = unknown>(url: string, body?: B) =>
    request<T>(url, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}

// ─── Types ───
export interface AuthUser {
  id: number
  username: string
  fullName: string
  role: 'admin' | 'engineer'
}

export interface DashboardAlert {
  id: number
  cropName: string
  farmName: string
  type: 'spray' | 'fertilize' | 'control' | 'other'
  product: string | null
  dose: string | null
  nextDate: string | null
  isOverdue: boolean
  daysLeft: number | null
}

export interface RecentVisit {
  id: number
  farmName: string
  cropName: string | null
  visitDate: string
  notes: string | null
  thumbPath: string | null
}

export interface DashboardData {
  visitsToday: number
  alertsNext7: number
  overdue: number
  farmsCount: number
  alerts: DashboardAlert[]
  recentVisits: RecentVisit[]
  visitsTrend?: { date: string; label: string; count: number }[]
  treatmentsByType?: {
    spray: number
    fertilize: number
    control: number
    other: number
  }
  cropStatus?: { active: number; harvested: number; failed: number }
  activityFeed?: Array<{
    id: string
    type: 'visit_created' | 'treatment_created'
    createdAt: string
    farmName: string
    cropName: string | null
    visitDate?: string
    treatmentType?: string
    product?: string | null
  }>
}

export interface Farm {
  id: number
  userId: number
  name: string
  owner: string | null
  area: number | null
  location: string | null
  createdAt: string
  _count?: { crops: number; visits: number }
  crops?: Crop[]
  visits?: VisitListItem[]
}

export interface Crop {
  id: number
  farmId: number
  name: string
  variety: string | null
  plantingDate: string | null
  area: number | null
  status: 'active' | 'harvested' | 'failed'
  createdAt: string
}

export interface VisitPhoto {
  id: number
  visitId: number
  photoPath: string
  aiResult?: string | null
  aiAnalyzedAt?: string | null
  createdAt: string
}

export interface Treatment {
  id: number
  cropId: number
  visitId: number | null
  type: 'spray' | 'fertilize' | 'control' | 'other'
  product: string | null
  dose: string | null
  nextDate: string | null
  notes: string | null
  done: boolean
  createdAt: string
  crop?: Crop
  farm?: { id: number; name: string }
}

export interface VisitListItem {
  id: number
  farmId: number
  cropId: number | null
  userId: number
  visitDate: string
  notes: string | null
  aiResult: string | null
  createdAt: string
  farmName?: string
  cropName?: string | null
  photoCount?: number
  thumbPath?: string | null
  photos?: VisitPhoto[]
  treatments?: Treatment[]
}

export interface SearchResults {
  farms: Array<{ id: number; name: string; owner: string | null; location: string | null }>
  crops: Array<{
    id: number
    name: string
    variety: string | null
    farmId: number
    farmName: string
  }>
  visits: Array<{
    id: number
    visitDate: string
    notes: string | null
    farmName: string
    cropName: string | null
  }>
  treatments: Array<{
    id: number
    type: string
    product: string | null
    nextDate: string | null
    cropName: string
    farmName: string
  }>
  total: number
}
