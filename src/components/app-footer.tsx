'use client'

import { Button } from '@/components/ui/button'
import { Bot } from 'lucide-react'
import { DocsButton } from '@/components/docs-dialog'

export function AppFooter() {
  const year = new Date().getFullYear()

  function openAIAssistant() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-ai-assistant'))
    }
  }

  return (
    <footer
      className="mt-auto border-t"
      style={{
        background: '#f0fdf4',
        borderColor: '#d1fae5',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span>
            © {year} نظام إدارة العمل الميداني الزراعي
          </span>
          <span className="text-gray-400">·</span>
          <span>الإصدار 2.0</span>
        </div>
        <div className="flex items-center gap-1">
          <DocsButton />
          <Button
            variant="ghost"
            size="sm"
            onClick={openAIAssistant}
            className="text-[#1f3a26] hover:bg-[#4a7c59] hover:text-white h-8 text-xs"
          >
            <Bot className="size-4" />
            المساعد الذكي
          </Button>
        </div>
      </div>
    </footer>
  )
}
