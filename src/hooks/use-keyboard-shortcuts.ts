'use client'

import { useEffect } from 'react'
import { useViewStore, type ViewName } from '@/lib/view-store'

// ─── Global keyboard shortcuts (g + key to switch views) ───
// g d = dashboard, g f = farms, g v = visits, g c = calendar,
// g r = reports, g s = search, g e = settings, g m = farm-map, ? = show help
const SHORTCUTS: Record<string, ViewName> = {
  d: 'dashboard',
  f: 'farms',
  v: 'visits',
  c: 'calendar',
  r: 'reports',
  s: 'search',
  e: 'settings',
  m: 'farm-map',
}

export function useKeyboardShortcuts() {
  const setActiveView = useViewStore((s) => s.setActiveView)

  useEffect(() => {
    let prefixPressed = false
    let prefixTimeout: ReturnType<typeof setTimeout> | null = null

    function handleKey(e: KeyboardEvent) {
      // Ignore if typing in an input/textarea, or if modifier keys (except our prefix)
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // 'g' prefix — wait for next key
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        prefixPressed = true
        if (prefixTimeout) clearTimeout(prefixTimeout)
        prefixTimeout = setTimeout(() => {
          prefixPressed = false
        }, 800)
        e.preventDefault()
        return
      }

      if (prefixPressed) {
        const view = SHORTCUTS[e.key.toLowerCase()]
        if (view) {
          setActiveView(view)
          e.preventDefault()
        }
        prefixPressed = false
        if (prefixTimeout) clearTimeout(prefixTimeout)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      if (prefixTimeout) clearTimeout(prefixTimeout)
    }
  }, [setActiveView])
}

export const SHORTCUT_HELP: Array<{ keys: string; action: string }> = [
  { keys: 'g d', action: 'لوحة اليوم' },
  { keys: 'g f', action: 'المزارع' },
  { keys: 'g v', action: 'الزيارات' },
  { keys: 'g c', action: 'التقويم' },
  { keys: 'g r', action: 'التقارير' },
  { keys: 'g m', action: 'خريطة المزارع' },
  { keys: 'g s', action: 'بحث' },
  { keys: 'g e', action: 'الإعدادات' },
]
