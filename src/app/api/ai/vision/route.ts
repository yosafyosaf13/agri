import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import ZAI from 'z-ai-web-dev-sdk'
import { ensureZAIConfig } from '@/lib/zai-config'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// ─── POST /api/ai/vision — { visitId, photoId } → { aiResult } ───
// Analyzes a visit photo with the Vision Language Model and stores the
// diagnosis in the visit's aiResult field. Closes the "Phase 7" gap.
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
    const visitId = Number(body?.visitId)
    const photoId = Number(body?.photoId)
    if (!visitId || !photoId) {
      return NextResponse.json(
        { error: 'معرّف الزيارة أو الصورة غير صحيح' },
        { status: 400 }
      )
    }

    // Load visit (scoped to user) + photo
    const visit = await db.visit.findFirst({
      where: { id: visitId, userId: user.id },
      include: {
        farm: true,
        crop: true,
        photos: { where: { id: photoId }, take: 1 },
      },
    })
    if (!visit) {
      return NextResponse.json(
        { error: 'الزيارة غير موجودة' },
        { status: 404 }
      )
    }
    const photo = visit.photos[0]
    if (!photo) {
      return NextResponse.json(
        { error: 'الصورة غير موجودة' },
        { status: 404 }
      )
    }

    // Read the photo file from disk and base64-encode it
    const photoPath = path.join(
      process.cwd(),
      'public',
      'uploads',
      photo.photoPath
    )
    if (!fs.existsSync(photoPath)) {
      return NextResponse.json(
        { error: 'ملف الصورة غير موجود على القرص' },
        { status: 404 }
      )
    }
    const imageBuffer = fs.readFileSync(photoPath)
    const base64Image = imageBuffer.toString('base64')
    // Detect mime from magic bytes (default jpeg)
    let mimeType = 'image/jpeg'
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) {
      mimeType = 'image/png'
    } else if (imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49) {
      mimeType = 'image/gif'
    } else if (
      imageBuffer[0] === 0x52 &&
      imageBuffer[1] === 0x49 &&
      imageBuffer[2] === 0x46 &&
      imageBuffer[3] === 0x46
    ) {
      mimeType = 'image/webp'
    }

    // Build context-aware prompt
    const cropName = visit.crop?.name || 'محصول غير محدد'
    const variety = visit.crop?.variety || ''
    const farmName = visit.farm?.name || ''
    const notes = visit.notes || ''

    const prompt = `أنت خبير زراعي متخصص في تشخيص أمراض وآفات النباتات. حلّل هذه الصورة الحقلية لمحصول "${cropName}"${
      variety ? ` (صنف: ${variety})` : ''
    }${farmName ? ` من مزرعة "${farmName}"` : ''}${
      notes ? ` مع ملاحظات المهندس: "${notes}"` : ''
    }.

قد تقريرًا زراعيًا مختصرًا بالعربية يتضمن:
1. **التشخيص المرئي**: ما الذي تلاحظه على الأوراق/النبات/التربة؟ (أعراض، تغيرات لونية، بقع، ذبول، آفات مرئية، إلخ)
2. **الاحتمالات**: ما الأرجح من أمراض أو آفات أو نقص عناصر؟ (اذكر 1-3 احتمالات)
3. **التوصية**: إجراء وقائي/علاجي مقترح (رش/تسميد/ري/إزالة أجزاء مصابة).
4. **مستوى الخطورة**: منخفض / متوسط / مرتفع.

كن دقيقًا وموجزًا (5-8 أسطر إجمالاً). إن لم تكن الصورة واضحة أو ليست لنبات، اذكر ذلك بصراحة.`

    ensureZAIConfig()
    const zai = await ZAI.create()
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const aiResult =
      response.choices[0]?.message?.content?.trim() ||
      'تعذّر توليد تحليل لهذه الصورة. حاول بصورة أوضح.'

    // Persist the diagnosis per-photo (round 2 schema migration)
    // AND keep the visit-level aiResult as the latest summary for backwards compat.
    await db.$transaction([
      db.visitPhoto.update({
        where: { id: photoId },
        data: { aiResult, aiAnalyzedAt: new Date() },
      }),
      db.visit.update({
        where: { id: visitId },
        data: { aiResult },
      }),
    ])

    return NextResponse.json({ aiResult, visitId, photoId })
  } catch (err) {
    console.error('[/api/ai/vision] error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'فشل تحليل الصورة',
      },
      { status: 500 }
    )
  }
}
