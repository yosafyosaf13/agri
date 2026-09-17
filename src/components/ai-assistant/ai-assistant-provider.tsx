'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  FormEvent,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, MicOff, X, Send, Volume2, VolumeX, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { AIAvatar, type AssistantState } from './ai-avatar'

interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  ts: number
}

type FlowState = 'closed' | 'open-idle' | AssistantState

/**
 * AIAssistantProvider
 * Mounts the floating AI Assistant button (always-on, bottom-left for RTL).
 * Listens for `window` 'open-ai-assistant' custom events so any UI button
 * (e.g. footer "المساعد الذكي") can open the panel.
 *
 * Voice flow:
 *   1. User clicks mic → MediaRecorder starts → state = 'listening'
 *   2. User clicks stop → audio base64 → POST /api/ai/asr → transcript
 *   3. Transcript → POST /api/ai/chat → reply → state = 'thinking'
 *   4. Reply → POST /api/ai/tts → WAV blob → <audio> plays → state = 'speaking'
 *   5. Audio ends → state back to 'open-idle'
 * Fallback: text input → skip step 1-2, jump to 3.
 */
export function AIAssistantProvider() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<AssistantState>('idle')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'مرحباً 👋 أنا المساعد الذكي الزراعي. اضغط الميكروفون وتحدث معي، أو اكتب سؤالاً. أستطيع إخبارك بزيارات اليوم وتنبيهاتك ونصائح ميدانية.',
      ts: Date.now(),
    },
  ])
  const [text, setText] = useState('')
  const [muted, setMuted] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messageIdRef = useRef(0)

  // ─── Open via custom event ───
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-ai-assistant', handler)
    return () => window.removeEventListener('open-ai-assistant', handler)
  }, [])

  // ─── Auto-scroll messages ───
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, state])

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => stopRecording(true)
  }, [])

  const nextId = () => `m${++messageIdRef.current}`

  const pushMessage = useCallback(
    (role: 'user' | 'assistant', text: string) => {
      setMessages((m) => [...m, { id: nextId(), role, text, ts: Date.now() }])
    },
    []
  )

  // ─── Text flow ───
  const sendText = useCallback(
    async (raw: string) => {
      const message = raw.trim()
      if (!message) return
      pushMessage('user', message)
      setText('')
      setState('thinking')
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'فشل الرد')
        pushMessage('assistant', data.reply)
        await speak(data.reply)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
        toast({ title: 'تعذر الحصول على رد', description: msg, variant: 'destructive' })
        setState('idle')
      }
    },
    [pushMessage]
  )

  // ─── TTS ───
  const speak = useCallback(
    async (text: string) => {
      if (muted) {
        setState('idle')
        return
      }
      setState('speaking')
      try {
        const res = await fetch('/api/ai/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (!res.ok) throw new Error('فشل توليد الصوت')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          URL.revokeObjectURL(url)
          setState('idle')
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          setState('idle')
        }
        await audio.play().catch(() => setState('idle'))
      } catch (err) {
        console.error('TTS failed', err)
        setState('idle')
      }
    },
    [muted]
  )

  // ─── Recording ───
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      recorderRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' })
        // Stop all tracks so the mic indicator turns off
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        if (blob.size === 0) {
          setState('idle')
          return
        }
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = reader.result as string
          setState('thinking')
          try {
            const res = await fetch('/api/ai/asr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64 }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'فشل التعرف')
            const transcript = (data.text || '').trim()
            if (!transcript) {
              toast({ title: 'لم أسمع شيئاً', description: 'حاول التحدث بوضوح أعلى' })
              setState('idle')
              return
            }
            await sendText(transcript)
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'خطأ'
            toast({ title: 'فشل التعرف على الصوت', description: msg, variant: 'destructive' })
            setState('idle')
          }
        }
        reader.readAsDataURL(blob)
      }
      rec.start()
      setState('listening')
    } catch (err) {
      console.error('Mic error', err)
      toast({
        title: 'لا يمكن الوصول للميكروفون',
        description: 'اسمح بالوصول للميكروفون من إعدادات المتصفح',
        variant: 'destructive',
      })
      setState('idle')
    }
  }, [sendText])

  const stopRecording = useCallback((silent = false) => {
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null
    if (silent) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const toggleMic = useCallback(() => {
    if (state === 'listening') {
      stopRecording()
    } else if (state === 'idle') {
      startRecording()
    } else {
      // Busy: stop any current playback/recording
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      stopRecording()
      setState('idle')
    }
  }, [state, startRecording, stopRecording])

  // ─── Submit text form ───
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (state === 'listening') stopRecording()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    sendText(text)
  }

  const closePanel = () => {
    stopRecording()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setState('idle')
    setOpen(false)
  }

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={() => setOpen(true)}
            aria-label="فتح المساعد الذكي"
            className="fixed left-4 bottom-4 sm:left-6 sm:bottom-6 z-50 flex items-center gap-2 rounded-full bg-[var(--green-d)] text-white pl-3 pr-4 py-3 shadow-xl hover:shadow-2xl hover:bg-[var(--green)] transition-all group"
          >
            <span className="relative flex h-9 w-9 items-center justify-center">
              <ImageSafe src="/avatars/avatar-speaking.png" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </span>
            </span>
            <span className="text-sm font-bold hidden sm:inline">
              المساعد الذكي
            </span>
            <Sparkles className="h-4 w-4 text-amber-300 group-hover:rotate-12 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-start sm:pl-6 sm:pb-6"
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={closePanel}
            />
            <motion.div
              initial={{ y: 40, scale: 0.97, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 40, scale: 0.97, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="slide-in-bottom relative w-full sm:w-[440px] max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-emerald-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-gradient-to-l from-[var(--green-d)] to-[var(--green)] text-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-white/40">
                    <ImageSafe src="/avatars/avatar-listening.png" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">المساعد الذكي الزراعي</div>
                    <div className="text-[11px] text-white/70">
                      مساعد صوتي لزراعتك
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMuted((m) => !m)}
                    className="p-2 rounded-full hover:bg-white/15 transition"
                    aria-label={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
                    title={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={closePanel}
                    className="p-2 rounded-full hover:bg-white/15 transition"
                    aria-label="إغلاق"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Avatar stage */}
              <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-emerald-50/80 to-white">
                <AIAvatar state={state} size={state === 'idle' ? 88 : 112} />
                <div className="mt-6 text-center text-xs text-emerald-800/80 max-w-[80%]">
                  {state === 'listening'
                    ? 'أستمع إليك... تحدث الآن ثم اضغط الإيقاف'
                    : state === 'thinking'
                    ? 'يتم معالجة طلبك...'
                    : state === 'speaking'
                    ? 'أرد عليك الآن...'
                    : 'اضغط الميكروفون وتحدث، أو اكتب سؤالك'}
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="max-h-64 min-h-[120px] overflow-y-auto scroll-pretty px-4 py-3 space-y-2 bg-white border-t border-emerald-50"
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.role === 'user' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`fade-in-up max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-bl-sm'
                          : 'bg-emerald-50 text-emerald-950 rounded-br-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {state === 'thinking' && (
                  <div className="flex justify-end">
                    <div className="bg-emerald-50 rounded-2xl rounded-br-sm px-4 py-3 text-sm text-emerald-700">
                      <span className="inline-flex gap-1">
                        <span className="ai-wave-bar w-1.5 h-3 bg-emerald-500 rounded-full" style={{ animationDelay: '0s' }} />
                        <span className="ai-wave-bar w-1.5 h-3 bg-emerald-500 rounded-full" style={{ animationDelay: '0.15s' }} />
                        <span className="ai-wave-bar w-1.5 h-3 bg-emerald-500 rounded-full" style={{ animationDelay: '0.3s' }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input row */}
              <form
                onSubmit={onSubmit}
                className="flex items-center gap-2 p-3 bg-white border-t border-emerald-100"
              >
                <Button
                  type="button"
                  onClick={toggleMic}
                  size="icon"
                  variant={state === 'listening' ? 'destructive' : 'default'}
                  className={`shrink-0 rounded-full h-11 w-11 ${
                    state === 'listening'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-[var(--green)] hover:bg-[var(--green-d)]'
                  }`}
                  aria-label={state === 'listening' ? 'إيقاف التسجيل' : 'بدء التسجيل'}
                  title={state === 'listening' ? 'إيقاف التسجيل' : 'بدء التسجيل'}
                >
                  {state === 'listening' ? (
                    <MicOff className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="اكتب سؤالك هنا..."
                  className="flex-1 bg-emerald-50/50 border-emerald-100 focus-visible:ring-emerald-300 text-sm h-11"
                  disabled={state === 'listening'}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="shrink-0 rounded-full h-11 w-11 bg-[var(--green-d)] hover:bg-black"
                  disabled={!text.trim() || state === 'thinking'}
                  aria-label="إرسال"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Tiny helper to render the small avatar images safely
function ImageSafe({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      className="h-full w-full object-cover"
      draggable={false}
    />
  )
}
