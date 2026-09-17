import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { ensureZAIConfig } from '@/lib/zai-config'
import { getCurrentUser } from '@/lib/auth'

// ─── POST /api/ai/tts — { text } → audio/wav binary ───
// Converts Arabic text to speech and returns a WAV audio response.
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
    let text = body?.text?.toString().trim()
    if (!text) {
      return NextResponse.json(
        { error: 'النص فارغ' },
        { status: 400 }
      )
    }

    // TTS API max 1024 chars — chunk if needed (keep first 1000)
    if (text.length > 1000) {
      text = text.slice(0, 1000)
    }

    ensureZAIConfig()
    const zai = await ZAI.create()
    const response = await zai.audio.tts.create({
      input: text,
      voice: 'xiaochen',
      speed: 0.95,
      response_format: 'wav',
      stream: false,
    })

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(new Uint8Array(arrayBuffer))

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (err) {
    console.error('[/api/ai/tts] error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'فشل توليد الصوت',
      },
      { status: 500 }
    )
  }
}
