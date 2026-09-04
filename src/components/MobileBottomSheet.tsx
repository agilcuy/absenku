'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  maxHeight?: string
}

export default function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = 'max-h-[88vh]',
}: MobileBottomSheetProps) {
  // Handle ESC key and scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full sm:max-w-lg bg-[#0c101b] border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col ${maxHeight} sheet-animate-up sm:animate-fade-in-up`}
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        }}
      >
        {/* Top Drag Indicator (Visible on Mobile) */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden" onClick={onClose}>
          <div className="w-10 h-1.5 rounded-full bg-white/20 active:bg-white/40 cursor-pointer" />
        </div>

        {/* Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/[0.07]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-gray-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scroll Area */}
        <div className="p-5 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}
