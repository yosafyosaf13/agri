// ─── Controlled vocabularies (enums) for the agricultural system ───

export type TreatmentType = 'spray' | 'fertilize' | 'control' | 'other'

export const TREATMENT_TYPES: Record<TreatmentType, string> = {
  spray: 'رش',
  fertilize: 'تسميد',
  control: 'مكافحة',
  other: 'أخرى',
}

export const TREATMENT_TYPE_LIST: { value: TreatmentType; label: string }[] = [
  { value: 'spray', label: 'رش' },
  { value: 'fertilize', label: 'تسميد' },
  { value: 'control', label: 'مكافحة' },
  { value: 'other', label: 'أخرى' },
]

export type CropStatus = 'active' | 'harvested' | 'failed'

export const CROP_STATUSES: Record<CropStatus, string> = {
  active: 'قائم',
  harvested: 'محصود',
  failed: 'متعثر',
}

export const CROP_STATUS_LIST: { value: CropStatus; label: string }[] = [
  { value: 'active', label: 'قائم' },
  { value: 'harvested', label: 'محصود' },
  { value: 'failed', label: 'متعثر' },
]

/** Status badge inline color classes (bg + text). */
export const CROP_STATUS_BADGE: Record<CropStatus, string> = {
  active: 'bg-[#dcfce7] text-[#166534]',
  harvested: 'bg-[#fef3c7] text-[#92400e]',
  failed: 'bg-[#fee2e2] text-[#991b1b]',
}

export type UserRole = 'admin' | 'engineer'

export const USER_ROLES: Record<UserRole, string> = {
  admin: '👑 مسؤول',
  engineer: '🌱 مهندس',
}
