'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { searchCrops, getVarietiesForCrop, getCropEmoji } from '@/lib/crop-database'

interface CropAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onVarietySuggest?: (varieties: string[]) => void
  placeholder?: string
  id?: string
  required?: boolean
}

/**
 * Crop name input with autocomplete suggestions from CROP_DATABASE.
 * Also exposes variety suggestions via onVarietySuggest callback.
 */
export function CropAutocomplete({
  value,
  onChange,
  onVarietySuggest,
  placeholder = 'مثال: طماطم، بطاطس، قمح...',
  id,
  required,
}: CropAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const suggestions = open ? searchCrops(value, 6) : []

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function pick(name: string) {
    onChange(name)
    setOpen(false)
    setHighlight(0)
    if (onVarietySuggest) {
      onVarietySuggest(getVarietiesForCrop(name))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && suggestions[highlight]) {
      e.preventDefault()
      pick(suggestions[highlight].name)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const currentEmoji = value ? getCropEmoji(value) : null

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        {currentEmoji && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
            {currentEmoji}
          </span>
        )}
        <Input
          id={id}
          required={required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={currentEmoji ? 'pr-10' : ''}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-emerald-100 max-h-72 overflow-y-auto scroll-pretty fade-in-up">
          {suggestions.map((c, i) => (
            <button
              key={c.name}
              type="button"
              onClick={() => pick(c.name)}
              onMouseEnter={() => setHighlight(i)}
              className={`w-full text-right px-3 py-2 flex items-center gap-2 transition-colors ${
                i === highlight
                  ? 'bg-emerald-50'
                  : 'hover:bg-emerald-50/50'
              } ${i === 0 ? 'rounded-t-lg' : ''} ${
                i === suggestions.length - 1 ? 'rounded-b-lg' : ''
              }`}
            >
              <span className="text-lg shrink-0">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#1f3a26]">
                  {c.name}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                  {c.varieties.slice(0, 3).join(' · ')}
                  {c.varieties.length > 3 ? ' ...' : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Variety suggestions chips that appear below the variety input.
 */
export function VarietySuggestions({
  suggestions,
  onPick,
}: {
  suggestions: string[]
  onPick: (v: string) => void
}) {
  if (suggestions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      <span className="text-[10px] text-gray-400 self-center mr-1">
        اقتراحات:
      </span>
      {suggestions.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-[#4a7c59] hover:bg-[#4a7c59] hover:text-white transition-colors border border-emerald-100"
        >
          {v}
        </button>
      ))}
    </div>
  )
}
