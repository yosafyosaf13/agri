'use client'

import { useEffect, useState } from 'react'

// ─── ServiceWorkerRegister — registers /sw.js for offline PWA support ───
// Also surfaces an "update available" toast so users can reload to get the new version.
export function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') {
      // Skip SW registration in dev to avoid caching dev server artifacts
      return
    }

    let reg: ServiceWorkerRegistration | null = null

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        reg = registration
        // Check for updates
        if (registration.waiting) {
          setUpdateAvailable(true)
        }
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(true)
            }
          })
        })
      })
      .catch((err) => {
        console.warn('SW registration failed:', err)
      })

    // Listen for controller change (new SW took over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-sm z-40 bg-[#1f3a26] text-white rounded-xl shadow-2xl p-4 fade-in-up border border-emerald-700/40">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🔄</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold mb-1">تحديث جديد متاح</h3>
          <p className="text-xs text-white/80 mb-3">
            يتوفر إصدار جديد من النظام بأداء وميزات محسّنة. أعد التحميل للتشغيل.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (reg?.waiting) {
                  reg.waiting.postMessage('SKIP_WAITING')
                }
              }}
              className="text-xs bg-white text-[#1f3a26] font-bold px-3 py-1.5 rounded-md hover:bg-emerald-50 transition-colors"
            >
              تحديث الآن
            </button>
            <button
              onClick={() => setUpdateAvailable(false)}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md transition-colors"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
