import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  // ─── Admin user: admin / admin123 ───
  const admin = await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      fullName: 'المهندس التجريبي',
      role: 'admin',
    },
  })

  // ─── Demo farm: مزرعة النور التجريبية ───
  const farm = await db.farm.upsert({
    where: { id: 1 },
    update: {},
    create: {
      userId: admin.id,
      name: 'مزرعة النور التجريبية',
      owner: 'سيد محمود',
      area: 2.5,
      location: 'شمال القرية - 3كم',
    },
  })

  // ─── Demo crop: طماطم ───
  const crop = await db.crop.upsert({
    where: { id: 1 },
    update: {},
    create: {
      farmId: farm.id,
      name: 'طماطم',
      variety: 'سوبر استرين',
      area: 1.5,
      status: 'active',
      plantingDate: new Date().toISOString().slice(0, 10),
    },
  })

  // ─── A second demo farm for richer UI ───
  const farm2 = await db.farm.upsert({
    where: { id: 2 },
    update: {},
    create: {
      userId: admin.id,
      name: 'مزرعة الوادي الجنوبية',
      owner: 'عائلة الأحمد',
      area: 5.0,
      location: 'جنوب البلدة - على النهر',
    },
  })

  const crop2 = await db.crop.upsert({
    where: { id: 2 },
    update: {},
    create: {
      farmId: farm2.id,
      name: 'بطاطس',
      variety: 'سبونتا',
      area: 3.0,
      status: 'active',
      plantingDate: new Date().toISOString().slice(0, 10),
    },
  })

  // ─── Demo visit + treatment today ───
  const today = new Date().toISOString().slice(0, 10)
  const visit = await db.visit.upsert({
    where: { id: 1 },
    update: {},
    create: {
      farmId: farm.id,
      cropId: crop.id,
      userId: admin.id,
      visitDate: today,
      notes:
        'لاحظت اصفراراً طفيفاً في الأوراق السفلية، وأعراضاً مبكرة لمرض اللفحة في الجزء الشمالي. تم أخذ صور توثيقية. يُنصح ببرنامج رش وقائي خلال 3 أيام.',
    },
  })

  const nextDate = new Date(Date.now() + 3 * 86400000)
    .toISOString()
    .slice(0, 10)
  await db.treatment.upsert({
    where: { id: 1 },
    update: {},
    create: {
      cropId: crop.id,
      visitId: visit.id,
      type: 'spray',
      product: 'مانكوزيب 80% WP',
      dose: '250جم / 100 لتر ماء',
      nextDate,
      notes: 'رش وقائي ضد اللفحة المبكرة',
      done: false,
    },
  })

  console.log('✅ Seed complete:', {
    admin: admin.username,
    farm: farm.name,
    crop: crop.name,
    farm2: farm2.name,
    crop2: crop2.name,
    visit: visit.id,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
