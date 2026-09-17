// ─── Treatment templates (predefined spray/fertilize/control/other) ───
// Used to speed up treatment entry in the visit form.

export type TreatmentTemplateCategory = 'spray' | 'fertilize' | 'control' | 'other'

export interface TreatmentTemplate {
  id: string
  category: TreatmentTemplateCategory
  cropHint?: string // optional crop name to match (case-insensitive)
  label: string // Arabic label shown in the UI
  product: string
  dose: string
  notes?: string
  daysUntilNext?: number // default next_date offset in days from today
}

// ─── All predefined templates ───
export const TREATMENT_TEMPLATES: TreatmentTemplate[] = [
  // ─── Spray templates (fungicides, pesticides) ───
  {
    id: 'spray-mancozeb-blight',
    category: 'spray',
    cropHint: 'طماطم',
    label: 'رش مانكوزيب ضد اللفحة',
    product: 'مانكوزيب 80% WP',
    dose: '250جم / 100 لتر ماء',
    notes: 'رش وقائي ضد اللفحة المبكرة',
    daysUntilNext: 7,
  },
  {
    id: 'spray-chlorothalonil',
    category: 'spray',
    label: 'رش كلوروثالونيل وقائي',
    product: 'كلوروثالونil 720 SC',
    dose: '200سم³ / 100 لتر ماء',
    notes: 'رش وقائي فطري واسع الطيف',
    daysUntilNext: 10,
  },
  {
    id: 'spray-copper-bactericide',
    category: 'spray',
    label: 'رش مركبات نحاس بكتيري',
    product: 'أوكسى كلورو النحاس 50% WP',
    dose: '150جم / 100 لتر ماء',
    notes: 'مكافحة الأمراض البكتيرية',
    daysUntilNext: 7,
  },
  {
    id: 'spray-abamectin-mites',
    category: 'spray',
    label: 'رش أبامكتين ضد العنكبوت',
    product: 'أبامكتين 1.8% EC',
    dose: '40سم³ / 100 لتر ماء',
    notes: 'مكافحة العنكبوت الأحمر',
    daysUntilNext: 14,
  },
  {
    id: 'spray-imidacloprid-aphids',
    category: 'spray',
    label: 'رش إيميداكلوبريد ضد المن',
    product: 'إيميداكلوبريد 20% SL',
    dose: '25سم³ / 100 لتر ماء',
    notes: 'مكافحة المن والذبابة البيضاء',
    daysUntilNext: 14,
  },
  // ─── Fertilize templates (NPK, micronutrients) ───
  {
    id: 'fert-npk-19-19-19',
    category: 'fertilize',
    label: 'تسميد NPK متوازن 19-19-19',
    product: 'NPK 19-19-19',
    dose: '3kg / فدان',
    notes: 'تسميد ورقي متوازن',
    daysUntilNext: 15,
  },
  {
    id: 'fert-potassium-nitrate',
    category: 'fertilize',
    cropHint: 'طماطم',
    label: 'تسميد نترات البوتاسيوم',
    product: 'نترات البوتاسيوم 13-0-46',
    dose: '2kg / 100 لتر ماء',
    notes: 'تسميد ورقي بالبوتاسيوم لتحسين التزهير والعقد',
    daysUntilNext: 15,
  },
  {
    id: 'fert-calcium-nitrate',
    category: 'fertilize',
    label: 'تسميد نترات الكالسيوم',
    product: 'نترات الكالسيوم 15.5-0-0',
    dose: '5kg / فدان',
    notes: 'تسميد أرضي بالكالسيوم والنيتروجين',
    daysUntilNext: 30,
  },
  {
    id: 'fert-micronutrients',
    category: 'fertilize',
    label: 'تسميد عناصر صغرى',
    product: 'مخلوط عناصر صغرى (Fe, Zn, Mn)',
    dose: '100جم / 100 لتر ماء',
    notes: 'رش ورقي بالعناصر الصغرى',
    daysUntilNext: 21,
  },
  // ─── Control templates (weeding, pruning) ───
  {
    id: 'control-weed-grass',
    category: 'control',
    label: 'مكافحة الحشائش النجيلية',
    product: 'كلوديفوسيد 24% EC',
    dose: '0.75 لتر / فدان',
    notes: 'مكافحة الحشائش النجيلية في محاصيل الحبوب',
    daysUntilNext: 45,
  },
  {
    id: 'control-weed-broadleaf',
    category: 'control',
    label: 'مكافحة الحشائش عريضة الأوراق',
    product: 'باندا 24% EC',
    dose: '0.5 لتر / فدان',
    notes: 'مكافحة الحشائش عريضة الأوراق',
    daysUntilNext: 30,
  },
  // ─── Other templates (irrigation adjustment, soil preparation) ───
  {
    id: 'other-irrigation',
    category: 'other',
    label: 'ضبط جدول الري',
    product: '—',
    dose: '—',
    notes: 'مراجعة معدلات الري حسب الطقس',
    daysUntilNext: 3,
  },
  {
    id: 'other-soil-test',
    category: 'other',
    label: 'تحليل التربة',
    product: '—',
    dose: '—',
    notes: 'أخذ عينة تربة وفحصها',
    daysUntilNext: 30,
  },
]

// ─── Helper: get templates filtered by category + optional crop hint ───
export function getTemplates(
  category: TreatmentTemplateCategory | '',
  cropName?: string
): TreatmentTemplate[] {
  const crop = cropName?.trim().toLowerCase()
  return TREATMENT_TEMPLATES.filter((t) => {
    // If category specified, must match
    if (category && t.category !== category) return false
    // If template has cropHint, prioritize matches; show all if no crop selected
    if (crop && t.cropHint) {
      return t.cropHint.toLowerCase() === crop
    }
    return true
  })
}

// ─── Helper: get a template by id ───
export function getTemplateById(id: string): TreatmentTemplate | undefined {
  return TREATMENT_TEMPLATES.find((t) => t.id === id)
}
