'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
    <header className="sticky top-0 z-30 pt-safe bg-[#06070d]/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 flex items-center justify-between min-h-[56px] lg:h-16">
      {/* Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 touch-target flex items-center justify-center"
          aria-label="Buka menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-300">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Panel Administrasi Presensi PKL</span>
        </div>
      </div>

      {/* Right Controls: Live Clock & Sign out */}
      {/* Right Controls: Live Clock & Sign out */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Live WIB Clock */}
        <div className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-indigo-300 shadow-inner transition-all hover:border-indigo-500/30">
          <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>{timeStr || 'Memuat...'}</span>
        </div>

        {/* Notification Center */}
        <NotificationCenter />

        {/* Portal Pembimbing Button for Superadmin */}
        <Link
          href="/pembimbing"
          prefetch={true}
          className="shimmer-beam flex items-center gap-1.5 text-xs text-purple-200 bg-gradient-to-r from-purple-500/15 via-purple-500/25 to-purple-500/15 hover:from-purple-500/25 hover:to-purple-500/35 border border-purple-500/30 hover:border-purple-400/60 px-3.5 py-1.5 rounded-xl transition-all duration-200 font-semibold active:scale-[0.97] hover:shadow-[0_0_15px_rgba(168,85,247,0.35)] group"
          title="Buka Portal Bimbingan Siswa PKL Anda"
        >
          <span className="text-sm group-hover:scale-110 group-hover:rotate-6 transition-transform">🎓</span>
          <span className="hidden md:inline">Portal Pembimbing</span>
        </Link>

        {/* Superadmin Absen Mandiri Button */}
        <Link
          href="/dashboard"
          prefetch={true}
          className="shimmer-beam flex items-center gap-1.5 text-xs text-indigo-200 bg-gradient-to-r from-indigo-500/15 via-indigo-500/25 to-indigo-500/15 hover:from-indigo-500/25 hover:to-indigo-500/35 border border-indigo-500/30 hover:border-indigo-400/60 px-3.5 py-1.5 rounded-xl transition-all duration-200 font-semibold active:scale-[0.97] hover:shadow-[0_0_15px_rgba(99,102,241,0.35)] group"
          title="Lakukan Absensi Masuk / Pulang Mandiri"
        >
          <span className="text-sm group-hover:scale-110 group-hover:-rotate-6 transition-transform">📸</span>
          <span className="hidden md:inline">Absen Mandiri</span>
        </Link>

        {/* Logout button */}
        <button
          onClick={handleSignOut}
          title="Keluar dari Panel Admin"
          className="group flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  )
}
