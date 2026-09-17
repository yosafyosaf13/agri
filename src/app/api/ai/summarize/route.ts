import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { ensureZAIConfig } from '@/lib/zai-config'
import { getCurrentUser } from '@/lib/auth'

// ─── POST /api/ai/summarize — { text } → { summary } ───
// Summarizes long visit notes into concise Arabic bullet points using LLM.
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
    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: 'النص قصير جداً للتلخيص (50 حرف على الأقل)' },
        { status: 400 }
      )
    }
    if (text.length > 3000) {
      return NextResponse.json(
        { error: 'النص طويل جداً (3000 حرف كحد أقصى)' },
        { status: 400 }
      )
    }

    ensureZAIConfig()
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content:
            'أنت مساعد زراعي يلخّص الملاحظات الميدانية. لخّص النص التالي في 3-5 نقاط مختصرة بالعربية، كل نقطة تبدأ بـ "•" وتصف ملاحظة أو توصية أو خطراً محتملاً. كن دقيقاً وموجزاً. لا تضف معلومات غير موجودة في النص الأصلي.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const summary =
      completion.choices[0]?.message?.content?.trim() ||
      'تعذّر توليد ملخص. حاول مرة أخرى.'

    return NextResponse.json({ summary })
  } catch (err) {
    console.error('[/api/ai/summarize] error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'فشل تلخيص الملاحظات',
      },
      { status: 500 }
    )
  }
}
