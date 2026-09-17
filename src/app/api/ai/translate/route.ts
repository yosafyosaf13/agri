import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { getCurrentUser } from '@/lib/auth'

// ─── POST /api/ai/translate — { text, target? } → { translation } ───
// Translates visit notes from Arabic to English (default) or another target language.
// Useful for international reports or sharing with non-Arabic stakeholders.
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
    const target = (body?.target?.toString() || 'English').trim()
    if (!text || text.length < 20) {
      return NextResponse.json(
        { error: 'النص قصير جداً للترجمة (20 حرف على الأقل)' },
        { status: 400 }
      )
    }
    if (text.length > 3000) {
      return NextResponse.json(
        { error: 'النص طويل جداً (3000 حرف كحد أقصى)' },
        { status: 400 }
      )
    }

    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a professional agricultural translator. Translate the following Arabic agricultural field notes into ${target}. Preserve the meaning, technical terms (e.g., crop names, disease names, product names), and tone. Keep the output as plain text, no bullet points or markdown. If a term has no direct ${target} equivalent, keep the original Arabic term in parentheses. Output ONLY the translation, no preamble.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      thinking: { type: 'disabled' },
    })

    const translation =
      completion.choices[0]?.message?.content?.trim() ||
      'تعذّر توليد الترجمة. حاول مرة أخرى.'

    return NextResponse.json({ translation })
  } catch (err) {
    console.error('[/api/ai/translate] error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'فشل الترجمة',
      },
      { status: 500 }
    )
  }
}
