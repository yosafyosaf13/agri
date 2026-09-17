import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { getCurrentUser } from '@/lib/auth'

// ─── POST /api/ai/sentiment — { text } → { urgency, level, color, emoji, reason } ───
// Analyzes visit notes to detect urgency level (urgent/warning/normal/good).
// Useful for triage: which visits need immediate attention?
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
    const text = body?.text?.toString().trim()
    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: 'النص قصير جداً للتحليل (20 حرف على الأقل)' },
        { status: 400 }
      )
    }
    if (text.length > 2000) {
      return NextResponse.json(
        { error: 'النص طويل جداً (2000 حرف كحد أقصى)' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are an agricultural field-notes analyzer. Read the following Arabic visit notes and respond in JSON ONLY with this exact schema:
{
  "level": "urgent" | "warning" | "normal" | "good",
  "emoji": "🔴" | "🟡" | "🟢" | "✅",
  "color": "#dc2626" | "#f59e0b" | "#4a7c59" | "#166534",
  "reason": "سبب موجز (سطر واحد)"
}

Rules:
- "urgent" (🔴): words like عاجل، فوري، خطير، تفشّي، انتشر، موت النبات، خسارة كبيرة — disease spreading, plant death, major loss risk.
- "warning" (🟡): words like اصفرار، بقع، آفات، لاحظت، مرض، يجب، أنصح — early symptoms, need to intervene soon.
- "normal" (🟢): routine visits, general observations, no specific urgency.
- "good" (✅): positive notes like نمو جيد، محصول جيد، صحة جيدة — healthy plants.

Output ONLY the JSON object, no other text, no markdown fences.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = completion.choices[0]?.message?.content?.trim() || ''
    // Parse JSON (strip code fences if present)
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()
    let result: {
      level: string
      emoji: string
      color: string
      reason: string
    }
    try {
      result = JSON.parse(cleaned)
    } catch {
      // Fallback: normal
      result = {
        level: 'normal',
        emoji: '🟢',
        color: '#4a7c59',
        reason: 'لا يمكن تحليل مستوى الإلحاح من هذا النص.',
      }
    }

    // Map levels to Arabic labels
    const levelArabic: Record<string, string> = {
      urgent: 'عاجل 🔴',
      warning: 'تحذير 🟡',
      normal: 'عادي 🟢',
      good: 'جيد ✅',
    }
    const levelClass: Record<string, string> = {
      urgent: 'bg-red-50 border-red-200 text-red-700',
      warning: 'bg-amber-50 border-amber-200 text-amber-700',
      normal: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      good: 'bg-green-50 border-green-200 text-green-700',
    }

    return NextResponse.json({
      level: result.level,
      levelArabic: levelArabic[result.level] ?? 'عادي 🟢',
      levelClass: levelClass[result.level] ?? levelArabic.normal,
      emoji: result.emoji,
      color: result.color,
      reason: result.reason,
    })
  } catch (err) {
    console.error('[/api/ai/sentiment] error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'فشل تحليل المشاعر',
      },
      { status: 500 }
    )
  }
}
