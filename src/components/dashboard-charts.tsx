'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface VisitsTrendPoint {
  date: string
  label: string
  count: number
}

interface TreatmentsByType {
  spray: number
  fertilize: number
  control: number
  other: number
}

interface CropStatus {
  active: number
  harvested: number
  failed: number
}

const GREEN = '#4a7c59'
const GREEN_DARK = '#1f3a26'
const AMBER = '#f59e0b'
const RED = '#dc2626'
const BLUE = '#2563eb'

const TREATMENT_LABELS: Record<keyof TreatmentsByType, string> = {
  spray: 'رش',
  fertilize: 'تسميد',
  control: 'مكافحة',
  other: 'أخرى',
}
const TREATMENT_COLORS: Record<keyof TreatmentsByType, string> = {
  spray: GREEN,
  fertilize: AMBER,
  control: RED,
  other: BLUE,
}

const CROP_LABELS: Record<keyof CropStatus, string> = {
  active: 'قائم',
  harvested: 'محصود',
  failed: 'متعثر',
}
const CROP_COLORS: Record<keyof CropStatus, string> = {
  active: GREEN,
  harvested: AMBER,
  failed: RED,
}

// ─── Visits-over-time area chart (14 days) ───
export function VisitsTrendChart({ data }: { data: VisitsTrendPoint[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((sum, d) => sum + d.count, 0)
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#1f3a26]">
            📈 الزيارات خلال آخر 14 يوم
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            إجمالي {total} زيارة في الفترة
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: GREEN }}
          />
          <span className="text-gray-600">زيارات</span>
        </div>
      </div>
      <div className="h-48 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <defs>
              <linearGradient id="visitsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GREEN} stopOpacity={0.5} />
                <stop offset="95%" stopColor={GREEN} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              domain={[0, Math.max(1, maxCount)]}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                direction: 'rtl',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              labelStyle={{ color: GREEN_DARK, fontWeight: 700 }}
              formatter={(v: number) => [`${v} زيارة`, '']}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={GREEN}
              strokeWidth={2.5}
              fill="url(#visitsGrad)"
              dot={{ r: 3, fill: GREEN, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: GREEN_DARK }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Treatments-by-type donut ───
export function TreatmentsPieChart({ data }: { data: TreatmentsByType }) {
  const total = data.spray + data.fertilize + data.control + data.other
  const chartData = (
    Object.keys(data) as Array<keyof TreatmentsByType>
  ).map((k) => ({
    name: TREATMENT_LABELS[k],
    value: data[k],
    color: TREATMENT_COLORS[k],
  }))
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <span className="text-3xl mb-2">🧪</span>
        <p className="text-sm">لا توجد معاملات بعد</p>
      </div>
    )
  }
  return (
    <div className="w-full">
      <h3 className="text-sm font-bold text-[#1f3a26] mb-3">
        🧪 توزيع المعاملات حسب النوع
      </h3>
      <div className="h-48 w-full flex items-center" dir="ltr">
        <ResponsiveContainer width="55%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                direction: 'rtl',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
              formatter={(v: number, n: string) => [`${v} معالجة`, n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5" dir="rtl">
          {chartData.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: c.color }}
                />
                <span className="text-gray-700">{c.name}</span>
              </span>
              <span className="font-bold text-[#1f3a26]">{c.value}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-1.5 mt-1.5 flex justify-between text-xs">
            <span className="text-gray-500">الإجمالي</span>
            <span className="font-bold text-[#1f3a26]">{total}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Crop-status donut ───
export function CropStatusPieChart({ data }: { data: CropStatus }) {
  const total = data.active + data.harvested + data.failed
  const chartData = (
    Object.keys(data) as Array<keyof CropStatus>
  ).map((k) => ({
    name: CROP_LABELS[k],
    value: data[k],
    color: CROP_COLORS[k],
  }))
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <span className="text-3xl mb-2">🌱</span>
        <p className="text-sm">لا توجد محاصيل بعد</p>
      </div>
    )
  }
  return (
    <div className="w-full">
      <h3 className="text-sm font-bold text-[#1f3a26] mb-3">
        🌱 حالة المحاصيل
      </h3>
      <div className="h-48 w-full flex items-center" dir="ltr">
        <ResponsiveContainer width="55%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={62}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                direction: 'rtl',
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}
              formatter={(v: number, n: string) => [`${v} محصول`, n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5" dir="rtl">
          {chartData.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: c.color }}
                />
                <span className="text-gray-700">{c.name}</span>
              </span>
              <span className="font-bold text-[#1f3a26]">{c.value}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-1.5 mt-1.5 flex justify-between text-xs">
            <span className="text-gray-500">الإجمالي</span>
            <span className="font-bold text-[#1f3a26]">{total}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
