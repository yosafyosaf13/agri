'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { BookOpen, Mic, MessageSquare, Camera, Bell, Search as SearchIcon, Settings as SettingsIcon, CalendarDays, Download, FileText } from 'lucide-react'

export function DocsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-pretty">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--green-d)]">
            <BookOpen className="h-5 w-5" />
            وثائق النظام — دليل الاستخدام
          </DialogTitle>
          <DialogDescription>
            نظام إدارة العمل الميداني الزراعي — الإصدار 2.0 — مساعد ذكي بصوت وصورة
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm text-gray-700 space-y-3">
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
            <strong className="text-[var(--green-d)]">👋 مرحباً بك!</strong> هذا
            النظام يساعد المهندس الزراعي على تسجيل الزيارات الميدانية، إدارة
            المحاصيل والمعاملات، وتتبع مواعيد التدخل القادمة — مع مساعد ذكي
            صوتي يجيب عن استفساراتك بحسب بياناتك الحية.
          </div>

          <Accordion type="single" collapsible defaultValue="start" className="w-full">
            <AccordionItem value="start">
              <AccordionTrigger className="text-sm font-semibold text-[var(--green-d)]">
                1) البدء السريع
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2">
                <p>• سجّل الدخول بـ <code className="bg-gray-100 px-1 rounded">admin</code> / <code className="bg-gray-100 px-1 rounded">admin123</code>.</p>
                <p>• ستظهر لوحة اليوم مع إحصائياتك وتنبيهاتك وآخر زياراتك.</p>
                <p>• أضف مزرعة، ثم محصولاً، ثم سجّل أول زيارة بكاميرا الموبايل.</p>
                <p>• جرّب المساعد الذكي: اضغط زر "المساعد الذكي" أسفل الشاشة، ثم الميكروفون وتحدث.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai">
              <AccordionTrigger className="text-sm font-semibold text-[var(--green-d)]">
                2) المساعد الذكي (Avatar + Voice)
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <Mic className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  <p>عندما تضغط الميكروفون، يظهر <strong>الصورة 1 (حالة الاستماع)</strong> — المساعد يستمع إليك.</p>
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  <p>عندما يرد المساعد، يظهر <strong>الصورة 2 (حالة الرد)</strong> — المساعد يتحدث ويُسمع صوته.</p>
                </div>
                <p>• المساعد يعرف بياناتك الحية: عدد المزارع، زيارات اليوم، التنبيهات، آخر الزيارات.</p>
                <p>• جرّب: "كم زيارة اليوم؟" أو "ما التنبيهات القادمة؟" أو "أعطني نصيحة عن مكافحة اللفحة".</p>
                <p>• يمكنك دائماً الكتابة بدلاً من التحدث إن شئت.</p>
                <p>• زر كتم الصوت 🔇 يوقف تشغيل صوت المساعد دون إيقاف المحادثة.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="visits">
              <AccordionTrigger className="text-sm font-semibold text-[var(--green-d)]">
                3) تسجيل زيارة + صور + معالجة + تحليل AI
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <Camera className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  <p>اختر المزرعة والمحصول والتاريخ، التقط صورة بكاميرا الموبايل (تُضغط تلقائياً قبل الرفع).</p>
                </div>
                <p>• اكتب ملاحظات ميدانية (اصفرار، آفات، حالة النمو...).</p>
                <p>• أضف معالجة: نوعها (رش/تسميد/مكافحة/أخرى)، المنتج، الجرعة، وموعد التدخل القادم.</p>
                <p>• تظهر المعالجة في لوحة اليوم كتنبيه قادم، وتُلوّن بالأصفر (قادم) أو الأحمر (فات).</p>
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2 mt-2">
                  <strong className="text-[var(--green-d)]">🤖 تحليل الصور بالـ AI (جديد!):</strong>
                  <p className="mt-1">في صفحة تفاصيل الزيارة، اضغط زر «🤖 تحليل AI» على أي صورة ليقوم نموذج الرؤية (VLM) بتشخيص الأعراض والآفات المحتملة وتقديم توصية علاجية. تُحفظ النتيجة في زيارتك لمراجعتها لاحقاً.</p>
                </div>
                <div className="rounded-md bg-blue-50 border border-blue-200 p-2 mt-2">
                  <strong className="text-[var(--green-d)]">✓ إكمال المعالجة (جديد!):</strong>
                  <p className="mt-1">في جدول المعاملات بصفحة الزيارة، اضغط زر «✓ تم» لتعليم المعالجة كمنجزة (تختفي من التنبيهات)، أو «↩️ إعادة» لإعادتها للحالة المعلّقة.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="alerts">
              <AccordionTrigger className="text-sm font-semibold text-[var(--green-d)]">
                4) التنبيهات والمواعيد
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <Bell className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  <p>التنبيهات تشمل كل المعاملات (done=false) بموعد خلال 7 أيام قادمة، أو فات موعدها.</p>
                </div>
                <p>• <span className="text-amber-600 font-semibold">أصفر</span> = موعد قادم خلال أيام.</p>
                <p>• <span className="text-red-600 font-semibold">أحمر</span> = فات الموعد ويحتاج تدخل عاجل.</p>
                <p>• علّم المعالجة كـ "تم" من صفحة تفاصيل الزيارة لإخفائها من التنبيهات.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="calendar">
              <AccordionTrigger className="text-sm font-semibold text-[var(--green-d)]">
                5) تقويم الزيارات (جديد!)
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <CalendarDays className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  <p>اعرض كل مواعيد المعاملات القادمة والزيارات في تقويم شهري مرئي.</p>
                </div>
                <p>• <span className="text-red-600 font-semibold">نقطة حمراء</span> = موعد فات في ذلك اليوم.</p>
                <p>• <span className="text-amber-600 font-semibold">نقطة صفراء</span> = موعد قادم.</p>
                <p>• <span className="text-blue-600 font-semibold">نقطة زرقاء</span> = زيارة مسجّلة.</p>
                <p>• اليوم الحالي مظلل بدائرة خضراء.</p>
                <p>• اضغط أي يوم لعرض تفاصيل معاملاته وزياراته، ومنها انتقل للزيارة مباشرة.</p>
                <p>• استخدم أزرار التنقل (‹ ›) للتنقل بين الأشهر، أو زر «اليوم» للعودة للشهر الحالي.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="reports">
              <AccordionTrigger className="text-sm font-semibold text-[var(--green-d)]">
                6) التقارير (جديد!)
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  <p>صفحة تقارير شاملة: 8 بطاقات إحصائية، توزيع المعاملات بالألوان، حالة المحاصيل، رسم بياني للزيارات لكل مزرعة، جدول المزارع بالمحاصيل، وآخر 10 معاملات.</p>
                </div>
                <p>• اضغط زر «طباعة / PDF» لفتح نافذة الطباعة — يمكنك حفظ التقرير كملف PDF.</p>
                <p>• التقرير يتضمن: عدد المزارع/المحاصيل/الزيارات/المعاملات/الصور، المساحات، معدل الإنجاز، التنبيهات.</p>
                <p>• مثالي للعرض على الإدارة أو للنسخ الورقية.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="search">
              <AccordionTrigger className="text-sm font-semibold text-[var(--green-d)]">
                7) البحث
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <SearchIcon className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  <p>ابحث في المزارع، المحاصيل، الزيارات، والمعاملات دفعة واحدة.</p>
                </div>
                <p>• ابدأ بالكتابة وستظهر النتائج مجمّعة حسب النوع.</p>
                <p>• اضغط على أي نتيجة للانتقال إلى تفاصيلها.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="settings">
              <AccordionTrigger className="text-sm font-semibold text-[var(--green-d)]">
                8) الإعدادات والأمان + تصدير البيانات (جديد!)
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2">
                <div className="flex items-start gap-2">
                  <SettingsIcon className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  <p>عدّل اسمك الكامل، وغيّر كلمة السر (6 أحرف على الأقل).</p>
                </div>
                <p>• كلمات السر تُخزّن بكاشف أحادي الاتجاه (scrypt) — لا تُخزن نصية.</p>
                <p>• الجلسة في كوكي HttpOnly موقّع بـ HMAC، تنتهي بعد 7 أيام.</p>
                <p>• <strong>أهم نصيحة:</strong> غيّر كلمة السر الافتراضية فوراً!</p>
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2 mt-2">
                  <div className="flex items-start gap-2">
                    <Download className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-[var(--green-d)]">تصدير البيانات (جديد!):</strong>
                      <p className="mt-1">في صفحة الإعدادات، اضغط «تصدير JSON» لتنزيل نسخة احتياطية كاملة من بياناتك (المزارع، المحاصيل، الزيارات، الصور، المعاملات) كملف JSON واحد.</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech">
              <AccordionTrigger className="text-sm font-semibold text-[var(--green-d)]">
                9) البنية التقنية + اختصارات لوحة المفاتيح (جديد!)
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed space-y-2">
                <p>• الواجهة: Next.js 16 + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui.</p>
                <p>• قاعدة البيانات: SQLite عبر Prisma ORM (6 جداول: users, farms, crops, visits, visit_photos, treatments).</p>
                <p>• المساعد الذكي: z-ai-web-dev-sdk (LLM + ASR + TTS + VLM).</p>
                <p>• واجهة عربية RTL بخط Cairo، ألوان زراعية (أخضر #4a7c59 / داكن #1f3a26 / أصفر #f59e0b / أحمر #dc2626).</p>
                <p>• صور المساعد الذكي: صورتان (استماع + رد) في <code className="bg-gray-100 px-1 rounded">public/avatars/</code>.</p>
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2 mt-2">
                  <strong className="text-[var(--green-d)]">⌨️ اختصارات لوحة المفاتيح (جديد!):</strong>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                    <div className="flex justify-between"><span>لوحة اليوم</span><kbd className="bg-gray-100 px-1.5 rounded font-mono">g d</kbd></div>
                    <div className="flex justify-between"><span>المزارع</span><kbd className="bg-gray-100 px-1.5 rounded font-mono">g f</kbd></div>
                    <div className="flex justify-between"><span>الزيارات</span><kbd className="bg-gray-100 px-1.5 rounded font-mono">g v</kbd></div>
                    <div className="flex justify-between"><span>التقويم</span><kbd className="bg-gray-100 px-1.5 rounded font-mono">g c</kbd></div>
                    <div className="flex justify-between"><span>التقارير</span><kbd className="bg-gray-100 px-1.5 rounded font-mono">g r</kbd></div>
                    <div className="flex justify-between"><span>بحث</span><kbd className="bg-gray-100 px-1.5 rounded font-mono">g s</kbd></div>
                    <div className="flex justify-between"><span>الإعدادات</span><kbd className="bg-gray-100 px-1.5 rounded font-mono">g e</kbd></div>
                    <div className="flex justify-between"><span>عرض الاختصارات</span><kbd className="bg-gray-100 px-1.5 rounded font-mono">?</kbd></div>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-600">اضغط <kbd className="bg-gray-100 px-1 rounded">g</kbd> ثم حرف الشاشة. أو اضغط الزر العائم «اختصارات ?» أسفل الشاشة.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Footer docs button — standalone so footer can render it.
 */
export function DocsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-[#1f3a26] hover:bg-[#4a7c59] hover:text-white h-8 text-xs"
      >
        <BookOpen className="size-4" />
        الوثائق
      </Button>
      <DocsDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
