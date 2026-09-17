'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

// ─── useDictation — speech-to-text via Web Speech API (browser) ───
// Falls back gracefully if the API is not available.
// Uses the browser's built-in SpeechRecognition (Chrome/Edge).
// Note: this is CLIENT-SIDE, not the z-ai ASR (which is for audio file uploads).

type Lang = 'ar-EG' | 'ar-SA' | 'en-US'

export function useDictation(lang: Lang = 'ar-EG') {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (!SR) {
      setIsSupported(false)
      return
    }
    const rec = new SR()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          // handled by caller via onFinal callback
        } else {
          interim += transcript
        }
      }
      setInterimText(interim)
    }
    rec.onerror = (e: any) => {
      console.error('Speech recognition error:', e.error)
      if (e.error === 'not-allowed') {
        toast({
          title: '⚠️ الميكروفون محظور',
          description: 'اسمح بالوصول للميكروفون من إعدادات المتصفح',
          variant: 'destructive',
        })
      } else if (e.error === 'no-speech') {
        // silent — just stop
      } else {
        toast({
          title: '⚠️ خطأ في التعرف على الصوت',
          description: e.error,
          variant: 'destructive',
        })
      }
      setIsListening(false)
    }
    rec.onend = () => {
      setIsListening(false)
      setInterimText('')
    }
    recognitionRef.current = rec
    setIsSupported(true)
    return () => {
      try {
        rec.stop()
      } catch {}
    }
  }, [lang, toast])

  // Set up final-result callback
  const setOnFinal = useCallback((cb: (text: string) => void) => {
    const rec = recognitionRef.current
    if (!rec) return
    rec.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          cb(transcript)
        } else {
          interim += transcript
        }
      }
      setInterimText(interim)
    }
  }, [])

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const rec = recognitionRef.current
      if (!rec) {
        toast({
          title: '⚠️ غير مدعوم',
          description: 'متصفحك لا يدعم التعرف على الصوت. جرّب Chrome أو Edge.',
          variant: 'destructive',
        })
        return
      }
      setOnFinal(onFinal)
      try {
        rec.start()
        setIsListening(true)
      } catch {
        // already started — restart
        try {
          rec.stop()
          setTimeout(() => {
            try {
              rec.start()
              setIsListening(true)
            } catch {}
          }, 200)
        } catch {}
      }
    },
    [setOnFinal, toast]
  )

  const stop = useCallback(() => {
    const rec = recognitionRef.current
    if (rec) {
      try {
        rec.stop()
      } catch {}
    }
    setIsListening(false)
    setInterimText('')
  }, [])

  const toggle = useCallback(
    (onFinal: (text: string) => void) => {
      if (isListening) stop()
      else start(onFinal)
    },
    [isListening, start, stop]
  )

  return {
    isListening,
    interimText,
    isSupported,
    start,
    stop,
    toggle,
  }
}
