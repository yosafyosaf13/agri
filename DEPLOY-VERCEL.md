# 🚀 النشر على Vercel — دليل خطوة بخطوة

## ⚠️ قبل البدء

النظام مُعدّ الآن للنشر على Vercel:
- ✅ `package.json` مُحدّث (engines + postinstall)
- ✅ `vercel.json` مُنشأ
- ✅ `next.config.ts` مُعدّل (بدون standalone)
- ✅ `prisma/schema.prisma` يدعم binaryTargets لـ Vercel
- ✅ `.env.example` يشرح المتغيرات المطلوبة

## 📋 المتطلبات

1. حساب GitHub (مجاني): https://github.com
2. حساب Vercel (مجاني): https://vercel.com
3. قاعدة بيانات PostgreSQL مجانية:
   - **Neon (موصى به):** https://neon.tech ← أسهل + مجاني للأبد
   - Vercel Postgres (محدود)
   - Supabase: https://supabase.com

---

## 🗄️ الخطوة 1: إنشاء قاعدة بيانات PostgreSQL

### على Neon (الأسهل):
```
1. سجّل في https://neon.tech (بحساب GitHub)
2. اضغط "New Project"
3. اسم المشروع: agri-system
4. Region: الأقرب لمستخدميك
5. اضغط "Create"
6. انسخ "Connection string" (في صفحة Dashboard):
   postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### احفظ هذا النص — ستحتاجه في الخطوة 4

---

## 📁 الخطوة 2: رفع المشروع لـ GitHub

### إنشاء مستودع جديد:
```
1. اذهب لـ https://github.com/new
2. Repository name: agri-system
3. اختر "Private" (للأمان)
4. ✅ Add a README
5. اضغط "Create repository"
```

### ارفع الكود:
```bash
cd /home/z/my-project

# إن لم يكن git مهيّأ:
git init
git branch -M main

# أضف كل الملفات (باستثناء node_modules + .next):
git add .

# أول التزام:
git commit -m "🚀 Agri System — Next.js 16 + AI + PWA"

# اربط بـ GitHub (استبدل USERNAME باسمك):
git remote add origin https://github.com/USERNAME/agri-system.git

# ارفع:
git push -u origin main
```

### ⚠️ مهم: تأكد أن .gitignore يحتوي على:
```
node_modules/
.next/
db/*.db
backups/
*.log
.env
```

---

## ☁️ الخطوة 3: استيراد المشروع على Vercel

```
1. اذهب لـ https://vercel.com/new
2. سجّل الدخول بحساب GitHub
3. اضغط "Import Git Repository"
4. اختر مستودع: agri-system
5. اترك الإعدادات الافتراضية:
   - Framework Preset: Next.js
   - Build Command: bun run build (أو npm run build)
   - Install Command: bun install (أو npm install)
6. ⚠️ لا تضغط Deploy بعد! — أكمل الخطوة 4 أولاً
```

---

## 🔑 الخطوة 4: ضبط متغيرات البيئة على Vercel

في صفحة Vercel → Settings → Environment Variables → أضف:

| المتغيّر | القيمة | ملاحظة |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | من Neon (الخطوة 1) |
| `AUTH_SECRET` | (32 حرف hex عشوائي) | ولّده: `openssl rand -hex 32` |

### لتوليد AUTH_SECRET:
```bash
# في الطرفية:
openssl rand -hex 32
# انسخ الناتج والصقه في Vercel
```

---

## 🚀 الخطوة 5: النشر!

```
1. اضغط "Deploy" على Vercel
2. انتظر 2-3 دقائق (سيرى: Building → Deploying → Ready)
3. ستحصل على رابط: https://agri-system-xxx.vercel.app
```

---

## 🌱 الخطوة 6: بذر البيانات الأولية (مرة واحدة)

بعد النشر الأول، سجّل الدخول وقم بالبذر:

### الطريقة A: محلياً (بالـ DATABASE_URL الإنتاج):
```bash
# عدّل .env مؤقتاً:
# DATABASE_URL=postgresql://... (من Vercel)

# شغّل البذر:
bun run db:push
bun run prisma/seed.ts

# ارجع .env للتطوير:
# DATABASE_URL=file:./db/custom.db
```

### الطريقة B: عبر Vercel CLI:
```bash
# ثبّت Vercel CLI:
npm i -g vercel

# اسحب متغيرات البيئة:
vercel env pull .env

# شغّل البذر:
bun run db:push
bun run prisma/seed.ts
```

---

## 🖼️ ملاحظة: رفع الصور على Vercel

نظام ملفات Vercel **مؤقت** — الصور المرفوعة لـ `public/uploads/` ستُفقد بعد كل نشر.

### الحل: Vercel Blob (أو Cloudinary)

```bash
bun add @vercel/blob
```

### عدّل `src/app/api/visits/route.ts`:
```typescript
// استبدل:
// import fs from 'fs'
// import path from 'path'
// fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer)

// بـ:
import { put } from '@vercel/blob'

async function savePhoto(base64Data: string): Promise<string> {
  const buffer = Buffer.from(base64Data.split(',')[1], 'base64')
  const { url } = await put(`visits/${Date.now()}.jpg`, buffer, {
    access: 'public',
    contentType: 'image/jpeg',
  })
  return url // خزّن URL بدلاً من filename
}
```

### أضف في Vercel → Environment Variables:
```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

### أنشئ Blob Store:
```
Vercel Dashboard → Storage → Create Database → Blob
← انسخ الـ Token والصقه في Environment Variables
```

---

## ✅ التحقق من النشر

بعد النشر، افتح: `https://your-app.vercel.app`

1. **صفحة الدخول** يجب أن تظهر
2. سجّل الدخول: `admin / admin123`
3. **لوحة اليوم** يجب أن تُظهر البيانات المبذورة
4. جرّب:
   - إضافة مزرعة جديدة
   - تسجيل زيارة + رفع صورة
   - المساعد الذكي (🎙️ + 🤖)
   - التقارير (طباعة PDF)

---

## 🔄 التحديثات اللاحقة

عند تعديل الكود:
```bash
git add .
git commit -m "✨ ميزة جديدة"
git push origin main
# ← Vercel سيعيد النشر تلقائياً
```

---

## 🆘 استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| `Prisma Client not found` | تأكد أن `postinstall: prisma generate` في package.json |
| `Database connection failed` | تحقق من DATABASE_URL في Vercel → Settings → Env Vars |
| `Can't reach database server` | Neon قد يكون sleep — فعّله بزيارة Dashboard |
| `Function timeout` | AI APIs قد تستغرق >10s — أضف `maxDuration: 60` في vercel.json |
| `Image upload fails` | استخدم Vercel Blob (نظام الملفات مؤقت) |
| `404 on /sw.js` | تحقق من vercel.json headers |

---

## 💰 تكلفة Vercel (Hobby Plan — مجاني)

| | |
|---|---|
| النطاق الترددي | 100 GB شهرياً |
| Builds | 6000 دقيقة شهرياً |
| Serverless Function | 100 GB-ساعة شهرياً |
| **مناسب لـ** | حتى 1000 مستخدم |

---

## 🎯 ملخص سريع (5 خطوات)

```
1️⃣ أنشئ قاعدة بيانات PostgreSQL على Neon
   ← انسخ connection string

2️⃣ ارفع المشروع لـ GitHub
   git push origin main

3️⃣ استورد على Vercel (vercel.com/new)
   ← اختر مستودع GitHub

4️⃣ أضف متغيرات البيئة:
   DATABASE_URL = postgresql://...
   AUTH_SECRET = (openssl rand -hex 32)

5️⃣ Deploy! → https://agri-system.vercel.app
   ← بذر البيانات: bun run prisma/seed.ts
```
