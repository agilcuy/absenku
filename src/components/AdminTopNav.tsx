'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Menu, LogOut, Clock, ShieldCheck } from 'lucide-react'
import NotificationCenter from '@/components/NotificationCenter'

interface AdminTopNavProps {
  onOpenMobileSidebar: () => void
}

export default function AdminTopNav({ onOpenMobileSidebar }: AdminTopNavProps) {
  const router = useRouter()
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const formatted = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      setTimeStr(formatted + ' WIB')
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#06070d]/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 flex items-center justify-between">
      {/* Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-300">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Panel Administrasi Kominfo Tanggamus</span>
        </div>
      </div>

      {/* Right Controls: Live Clock & Sign out */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Live WIB Clock */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-indigo-300 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>{timeStr || 'Memuat...'}</span>
        </div>

        {/* Notification Center */}
        <NotificationCenter />

        {/* Superadmin Absen Mandiri Button */}
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition font-semibold"
          title="Lakukan Absensi Masuk / Pulang Mandiri"
        >
          <span>📸</span>
          <span className="hidden md:inline">Absen Mandiri</span>
        </a>

        {/* Logout button */}
        <button
          onClick={handleSignOut}
          title="Keluar dari Panel Admin"
          className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-xl transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
