import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { getCurrentUser } from '@/lib/auth'

// ─── POST /api/ai/actions — { notes, aiResult? } → { actions[] } ───
// Suggests 3-5 concrete next-step actions based on visit notes (+ optional VLM diagnosis).
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
    const notes = body?.notes?.toString().trim()
    const aiResult = body?.aiResult?.toString().trim() || ''
    if (!notes || notes.length < 20) {
      return NextResponse.json(
        { error: 'النص قصير جداً (20 حرف على الأقل)' },
        { status: 400 }
      )
    }
    if (notes.length > 3000) {
      return NextResponse.json(
        { error: 'النص طويل جداً (3000 حرف كحد أقصى)' },
        { status: 400 }
      )
    }

    const context = aiResult
      ? `ملاحظات الزيارة:\n${notes}\n\nتشخيص الصورة بالـ AI:\n${aiResult}`
      : `ملاحظات الزيارة:\n${notes}`

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `أنت خبير زراعي يقدم توصيات عملية ميدانية. بناءً على ملاحظات المهندس الزراعي (والتشخيص المرئي إن وُجد)، اقترح 3-5 إجراءات عملية قابلة للتنفيذ خلال الأيام القادمة. كل إجراء يجب أن يكون:
- محدداً وعملياً (مثلاً: "رش مانكوزيب بجرعة X خلال 48 ساعة" وليس "عالج المرض")
- مرتباً حسب الأولوية (الأهم أولاً)
- مرتبطاً بالأعراض المذكورة في الملاحظات
- قصيراً (سطر-سطرين كحد أقصى لكل إجراء)

أخرج النتيجة كقائمة مرقّمة (1. 2. 3.) بالعربية فقط، بدون مقدمات أو خاتمات.`,
        },
        {
          role: 'user',
          content: context,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const actions =
      completion.choices[0]?.message?.content?.trim() ||
      'تعذّر توليد التوصيات. حاول مرة أخرى.'

    return NextResponse.json({ actions })
  } catch (err) {
    console.error('[/api/ai/actions] error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'فشل توليد التوصيات',
      },
      { status: 500 }
    )
  }
}
