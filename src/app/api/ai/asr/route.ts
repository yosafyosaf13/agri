import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { ensureZAIConfig } from '@/lib/zai-config'
import { getCurrentUser } from '@/lib/auth'

// ─── POST /api/ai/asr — { audio: base64 } → { text } ───
// Receives a base64-encoded audio blob (webm/wav/mp3 from MediaRecorder)
// and transcribes it via the ASR service.
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
    const audioB64 = body?.audio?.toString()
    if (!audioB64) {
      return NextResponse.json(
        { error: 'لم يصل ملف صوتي' },
        { status: 400 }
      )
    }

    // Strip optional data URL prefix
    const clean = audioB64.replace(/^data:audio\/[a-z0-9.+-]+;base64,/, '')

    ensureZAIConfig()
    const zai = await ZAI.create()
    const response = await zai.audio.asr.create({
      file_base64: clean,
    })

    const text = response.text?.trim() || ''
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[/api/ai/asr] error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'فشل التعرف على الصوت',
      },
      { status: 500 }
    )
  }
}
