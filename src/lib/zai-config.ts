import fs from 'fs'
import path from 'path'

// ─── ضمان وجود .z-ai-config في مكان قابل للكتابة ───
// على Vercel، ملفات النقطة (.z-ai-config) قد لا تُرفع مع المشروع
// هذا الملف ينشئها برمجياً في /tmp/ (قابل للكتابة على Vercel)

const ZAI_CONFIG = {
  baseUrl: 'https://internal-api.z.ai/v1',
  apiKey: 'Z.ai',
  chatId: 'chat-70d30d54-3294-40ee-9e9c-89dc12642dfc',
  token: process.env.ZAI_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNGMwZTc0NzQtOWM0Yy00MGViLWFmYjEtYWMxYjlhZjc1ODFlIiwiY2hhdF9pZCI6ImNoYXQtNzBkMzBkNTQtMzI5NC00MGVlLTllOWMtODlkYzEyNjQyZGZjIiwicGxhdGZvcm0iOiJ6YWkifQ.Fm6YgDQGZX2sKBN9SDfps2FcL0OGzFgrYstVibJLSBA',
  userId: '4c0e7474-9c4c-40eb-afb1-ac1b9af7581e',
}

let initialized = false

export function ensureZAIConfig() {
  if (initialized) return
  initialized = true

  // ابحث عن .z-ai-config في المسارات المتوقعة
  const paths = [
    process.cwd() + '/.z-ai-config',
    '/tmp/.z-ai-config',
    path.join(require('os').homedir(), '.z-ai-config'),
    '/etc/.z-ai-config',
  ]

  // إذا وُجد في أي مكان، لا تفعل شيئاً
  for (const p of paths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8')
        const parsed = JSON.parse(content)
        if (parsed.baseUrl && parsed.token) {
          return // الملف موجود وصالح
        }
      } catch { /* ملف تالف — أنشئه من جديد */ }
    }
  }

  // الملف غير موجود — أنشئه في /tmp/ (قابل للكتابة على Vercel)
  const configPath = '/tmp/.z-ai-config'
  try {
    fs.writeFileSync(configPath, JSON.stringify(ZAI_CONFIG, null, 2), 'utf-8')
    // اضبط HOME على /tmp لو لم يكن مضبوطاً
    if (!process.env.HOME) {
      process.env.HOME = '/tmp'
    }
  } catch (err) {
    console.error('[zai-config] Failed to write config:', err)
  }
}
