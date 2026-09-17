export type UserRole = 'admin' | 'engineer' | 'supervisor' | 'team_lead' | 'team_member'

export const USER_ROLES: Record<UserRole, string> = {
  admin: '👑 مسؤول النظام',
  engineer: '🌱 مهندس زراعي',
  supervisor: '👁️ مشرف',
  team_lead: '🎯 قائد فريق',
  team_member: '👷 عضو فريق',
}

export const USER_ROLE_LIST: { value: UserRole; label: string }[] = [
  { value: 'engineer', label: '🌱 مهندس زراعي' },
  { value: 'supervisor', label: '👁️ مشرف' },
  { value: 'team_lead', label: '🎯 قائد فريق' },
  { value: 'team_member', label: '👷 عضو فريق' },
  { value: 'admin', label: '👑 مسؤول النظام' },
]

export type TeamType = 'pest_control' | 'spraying' | 'fertilizing' | 'irrigation' | 'general'

export const TEAM_TYPES: Record<TeamType, string> = {
  pest_control: '🦟 مكافحة آفات',
  spraying: '💦 رش',
  fertilizing: '🌾 تسميد',
  irrigation: '💧 ري',
  general: '🔧 عام',
}

export const TEAM_TYPE_LIST: { value: TeamType; label: string }[] = [
  { value: 'pest_control', label: '🦟 مكافحة آفات' },
  { value: 'spraying', label: '💦 رش' },
  { value: 'fertilizing', label: '🌾 تسميد' },
  { value: 'irrigation', label: '💧 ري' },
  { value: 'general', label: '🔧 عام' },
]

export const SPECIALTIES = [
  'مكافحة آفات',
  'تسميد',
  'رش',
  'ري',
  'زراعة محمية',
  'أمراض نبات',
  'تربة',
  'عام',
]
