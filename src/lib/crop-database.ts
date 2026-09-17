// ─── Crop variety database (predefined crops + common varieties) ───
// Used for autocomplete in the crop form to speed up data entry.

export interface CropVariety {
  name: string
  emoji: string
  varieties: string[]
}

export const CROP_DATABASE: CropVariety[] = [
  {
    name: 'طماطم',
    emoji: '🍅',
    varieties: ['سوبر استرين', 'هجين 4484', 'روما', 'شيري', 'بيف ستيرك', 'هجين 8320'],
  },
  {
    name: 'بطاطس',
    emoji: '🥔',
    varieties: ['سبونتا', 'كارا', 'ديامونت', 'هرمس', 'سافان', 'ميلينا'],
  },
  {
    name: 'خيار',
    emoji: '🥒',
    varieties: ['هجين بيبي', 'بيت ألفا', 'لونج هجين', 'مايو', 'كورال'],
  },
  {
    name: 'فلفل',
    emoji: '🫑',
    varieties: ['حلو أخضر', 'حار مصري', 'كاليفورنيا واندر', 'هجين 1583', 'شيملا'],
  },
  {
    name: 'باذنجان',
    emoji: '🍆',
    varieties: ['بلدي أسود', 'هجين 735', 'أبيض', 'روما', 'تيلي'],
  },
  {
    name: 'بصل',
    emoji: '🧅',
    varieties: ['أحمر مصري', 'أبيض جيزة 6', 'ذهبي', 'شالوت', 'بنفسجي'],
  },
  {
    name: 'ثوم',
    emoji: '🧄',
    varieties: ['بلدي', 'سداسي', 'صيني', 'فرنسي'],
  },
  {
    name: 'جزر',
    emoji: '🥕',
    varieties: ['نانت', 'شانتيني', 'إمبراطور', 'فلاكسي', 'كوردوبا'],
  },
  {
    name: 'خس',
    emoji: '🥬',
    varieties: ['روماني', 'آيسبرغ', 'فرنش', 'بلدي', 'لولو روزا'],
  },
  {
    name: 'ملفوف',
    emoji: '🥗',
    varieties: ['كرنب أبيض', 'كرنب أحمر', 'كالي', 'بروكللي', 'قرنبيط'],
  },
  {
    name: 'فاصوليا',
    emoji: '🫛',
    varieties: ['خضراء', 'بيضاء', 'حمراء', 'بنية'],
  },
  {
    name: 'بسلة',
    emoji: '🌱',
    varieties: ['خضراء هجين', 'ماستر ب', 'أواسيس', 'سبتيمبر'],
  },
  {
    name: 'ذرة',
    emoji: '🌽',
    varieties: ['بيضاء', 'صفراء', 'حلوة هجين', 'شامية', 'تذكارية'],
  },
  {
    name: 'قمح',
    emoji: '🌾',
    varieties: ['سدس 12', 'جيزة 168', 'سخا 94', 'مصر 1', 'بني سويف 5'],
  },
  {
    name: 'أرز',
    emoji: '🍚',
    varieties: ['جيزة 178', 'سخا 101', 'جيزة 182', 'هجين 1'],
  },
  {
    name: 'قصب السكر',
    emoji: '🎋',
    varieties: ['G.T.54-9', 'C.9', 'بلدي'],
  },
  {
    name: 'قطن',
    emoji: '☁️',
    varieties: ['جيزة 90', 'جيزة 95', 'جيزة 96', 'هجين'],
  },
  {
    name: 'بطيخ',
    emoji: '🍉',
    varieties: ['هجين 130', 'سكر', 'رعب', 'كورد', 'إنجل'],
  },
  {
    name: 'كنتالوب',
    emoji: '🍈',
    varieties: ['هجين 555', 'جاليه', 'ماغنوم', 'أناناس'],
  },
  {
    name: 'فراولة',
    emoji: '🍓',
    varieties: ['فestival', 'كاماروزا', 'ألبا', 'فورتشن', 'هجين 1962'],
  },
  {
    name: 'عنب',
    emoji: '🍇',
    varieties: ['رومي أحمر', 'رومي أبيض', 'فليم بدون بذر', 'سوبريور', 'كمبيل إرلي'],
  },
  {
    name: 'موز',
    emoji: '🍌',
    varieties: ['وليامز', 'جراند نين', 'بياناتا', 'بلدي'],
  },
  {
    name: 'برتقال',
    emoji: '🍊',
    varieties: ['أبو صرة', 'فالنسيا', 'بلدي', 'سكري', 'نافل'],
  },
  {
    name: 'ليمون',
    emoji: '🍋',
    varieties: ['بلدي', 'أضاليا', 'فيرنا', 'يوريكا'],
  },
  {
    name: 'مانجو',
    emoji: '🥭',
    varieties: ['زبدة', 'سنسيشن', 'لانجرا', 'كنت', 'فيسك'],
  },
]

// ─── Helper: filter crops by query ───
export function searchCrops(query: string, limit = 6): CropVariety[] {
  const q = query.trim().toLowerCase()
  if (!q) return CROP_DATABASE.slice(0, limit)
  return CROP_DATABASE.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.varieties.some((v) => v.toLowerCase().includes(q))
  ).slice(0, limit)
}

// ─── Helper: get varieties for a crop name ───
export function getVarietiesForCrop(cropName: string): string[] {
  const found = CROP_DATABASE.find(
    (c) => c.name.toLowerCase() === cropName.toLowerCase()
  )
  return found?.varieties ?? []
}

// ─── Helper: get emoji for a crop name ───
export function getCropEmoji(cropName: string): string {
  const found = CROP_DATABASE.find(
    (c) => c.name.toLowerCase() === cropName.toLowerCase()
  )
  return found?.emoji ?? '🌱'
}
