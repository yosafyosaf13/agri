import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { ensureZAIConfig } from '@/lib/zai-config'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// ─── Context builder: gather live farm/visit/alert data for the LLM ───
async function buildSystemContext(userId: number): Promise<string> {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const in7 = new Date(today.getTime() + 7 * 86400000)
    .toISOString()
    .slice(0, 10)

  const [farms, visitsToday, alerts, recentVisits] = await Promise.all([
    db.farm.findMany({
      where: { userId },
      include: { _count: { select: { crops: true, visits: true } } },
    }),
    db.visit.count({
      where: { userId, visitDate: todayStr },
    }),
    db.treatment.findMany({
      where: {
        done: false,
        nextDate: { not: null, lte: in7 },
        crop: { farm: { userId } },
      },
      include: { crop: { include: { farm: true } } },
      orderBy: { nextDate: 'asc' },
      take: 10,
    }),
    db.visit.findMany({
      where: { userId },
      include: {
        farm: true,
        crop: true,
        photos: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  const overdueCount = alerts.filter(
    (a) => a.nextDate! < todayStr
  ).length

  const alertsText = alerts
    .map((a) => {
      const isOverdue = a.nextDate! < todayStr
      const daysLeft = Math.round(
        (new Date(a.nextDate!).getTime() - today.getTime()) / 86400000
      )
      return `- ${a.crop.name} (${a.crop.farm.name}) — ${a.type} ${
        a.product ? `باستخدام ${a.product}` : ''
      }${a.dose ? ` بجرعة ${a.dose}` : ''} — الموعد ${a.nextDate} (${
        isOverdue ? `فات ${Math.abs(daysLeft)} يوم` : `بعد ${daysLeft} يوم`
      })`
    })
    .join('\n')

  const farmsText = farms
    .map(
      (f) =>
        `- ${f.name} (المالك: ${f.owner || 'غير محدد'}, المساحة: ${
          f.area || '?'
        } فدان, الموقع: ${f.location || '?'}) — ${f._count.crops} محصول، ${
          f._count.visits
        } زيارة`
    )
    .join('\n')

  const recentVisitsText = recentVisits
    .map(
      (v) =>
        `- ${v.visitDate} — ${v.farm.name}${
          v.crop ? ` / ${v.crop.name}` : ''
        }${v.notes ? ` — ملاحظات: ${v.notes.slice(0, 100)}` : ''}`
    )
    .join('\n')

  return `أنت "المساعد الذكي الزراعي" — مساعد صوتي ذكي لنظام إدارة العمل الميداني الزراعي. تجيب بالعربية الفصحى المبسطة، باختصار ووضوح (جمل قصيرة مناسبة للنطق الصوتي). ساعد المهندس الزراعي في: استفسار حالة المزارع والمحاصيل والزيارات والتنبيهات، وتقديم نصائح زراعية ميدانية، وتذكيره بالمواعيد القادمة.

البيانات الحية للنظام (بتاريخ ${todayStr}):
- عدد المزارع: ${farms.length}
- زيارات اليوم: ${visitsToday}
- تنبيهات قادمة (7 أيام): ${alerts.length}
- مواعيد فاتت: ${overdueCount}

قائمة المزارع:
${farmsText || 'لا توجد مزارع'}

التنبيهات الحالية (معاملات تحتاج موعد قريب):
${alertsText || 'لا توجد تنبيهات حالياً'}

آخر الزيارات:
${recentVisitsText || 'لا توجد زيارات بعد'}

إرشادات:
- كن ودوداً ومهنيًا. استخدم صيغة المخاطب المذكر (أنت، افعل).
- عند سؤاله عن "كم زيارة اليوم" أو "ما التنبيهات" أو ما شابه، استخدم البيانات الحية أعلاه.
- عند طلب نصيحة زراعية (آفات، ري، تسميد، رش)، قدّم نصيحة عملية موجزة (3-4 جمل).
- إن لم تفهم السؤال، اطلب التوضيح بلطف.
- لا تخترع أرقاماً؛ إن لم توجد بيانات، قل ذلك بصراحة.
- ردودك يجب أن تكون قصيرة (سطر-3 أسطر) لأنها ستُنطق صوتياً.`
}

// ─── POST /api/ai/chat — { message } → { reply } ───
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => null)
    const message = body?.message?.toString().trim()
    if (!message || message.length > 2000) {
      return NextResponse.json(
        { error: 'الرسالة غير صالحة' },
        { status: 400 }
      )
    }

    const systemPrompt = await buildSystemContext(user.id)

    ensureZAIConfig()
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: message },
      ],
      thinking: { type: 'disabled' },
    })

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      'عذراً، لم أتمكن من توليد رد. حاول مرة أخرى.'

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[/api/ai/chat] error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'فشل الاتصال بالمساعد الذكي',
      },
      { status: 500 }
    )
  }
}
