'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Calendar, Home, User as UserIcon, FileText, UserCircle, ChevronLeft, Network, BookOpen, Zap } from 'lucide-react'
import NotificationCenter from '@/components/NotificationCenter'

interface StudentNavbarProps {
  user?: {
    full_name?: string
    email?: string
    avatar_url?: string
    role?: string
    internship_places?: {
      name?: string
    }
  }
  isProfileIncomplete?: boolean
}

export default function StudentNavbar({ user, isProfileIncomplete = false }: StudentNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Determine mobile title and if we are on a subpage
  const isSubPage = pathname !== '/dashboard'
  let mobileTitle = 'ABSENKU PKL'
  if (pathname === '/dashboard/permits') mobileTitle = 'Izin & Sakit'
  else if (pathname === '/dashboard/history') mobileTitle = 'Riwayat Absensi'
  else if (pathname === '/dashboard/profile') mobileTitle = 'Profil Siswa'
  else if (pathname === '/dashboard/structure') mobileTitle = 'Topologi & Tupoksi'
  else if (pathname === '/dashboard/journals') mobileTitle = 'Jurnal Kegiatan'
  else if (pathname === '/dashboard/overtime') mobileTitle = 'Rekap Lembur'

  const placeName = user?.internship_places?.name

  return (
    <header
      className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-[#07090e]/85 border-b border-white/[0.06]"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* =========================================
            MOBILE APP BAR (< lg)
           ========================================= */}
        <div className="flex lg:hidden items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {isSubPage ? (
              <Link
                href="/dashboard"
                aria-label="Kembali ke Beranda"
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white active:scale-95 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 text-base font-bold">
                📋
              </div>
            )}
            <div>
              <h1 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                {mobileTitle}
                {!isSubPage && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold uppercase">
                    {user?.role === 'superadmin' ? 'Admin' : 'PKL'}
                  </span>
                )}
              </h1>
              {!isSubPage && (
                <p className="text-[10px] text-gray-400 leading-none mt-0.5 truncate max-w-[170px]">
                  {placeName || 'Sistem Absensi PKL'}
                </p>
              )}
            </div>
          </div>

          {/* Right Mobile Actions */}
          <div className="flex items-center gap-1.5">
            {user?.role === 'superadmin' && (
              <Link
                href="/admin"
                className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-1.5 rounded-lg active:scale-95 transition"
              >
                Admin
              </Link>
            )}
            <NotificationCenter />
            <button
              onClick={handleSignOut}
              title="Logout"
              aria-label="Logout"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-rose-400 flex items-center justify-center active:scale-90 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================
            DESKTOP HEADER (lg:flex)
           ========================================= */}
        <div className="hidden lg:flex items-center justify-between w-full">
          {/* Logo & Brand */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 font-bold text-lg">
              📋
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                ABSENKU
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">
                  {user?.role === 'superadmin' ? 'SUPERADMIN & PEMBIMBING' : 'PESERTA DIDIK PKL'}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate max-w-[280px]">
                {placeName || 'Sistem Absensi & Jurnal PKL Mandiri'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="flex items-center gap-2">
            <Link
              href="/dashboard"
              prefetch={true}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] ${
                pathname === '/dashboard'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Absensi</span>
            </Link>

            <Link
              href="/dashboard/permits"
              prefetch={true}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] ${
                pathname === '/dashboard/permits'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Izin & Sakit</span>
            </Link>

            <Link
              href="/dashboard/journals"
              prefetch={true}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] ${
                pathname === '/dashboard/journals'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Jurnal</span>
            </Link>

            <Link
              href="/dashboard/overtime"
              prefetch={true}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] ${
                pathname === '/dashboard/overtime'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Lembur</span>
            </Link>

            <Link
              href="/dashboard/history"
              prefetch={true}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] ${
                pathname === '/dashboard/history'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Riwayat</span>
            </Link>

            <Link
              href="/dashboard/profile"
              prefetch={true}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] ${
                pathname === '/dashboard/profile'
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCircle className="w-4 h-4" />
              <span>Profil</span>
              {isProfileIncomplete && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse ring-2 ring-black"
                  title="Biodata belum lengkap!"
                />
              )}
            </Link>

            {/* Topologi & Tupoksi (Hanya untuk divisi instansi terkait atau superadmin) */}
            {((user?.internship_places?.name || '').toLowerCase().includes('kominfo') ||
              (user?.internship_places?.name || '').toLowerCase().includes('egov') ||
              user?.role === 'superadmin') && (
              <Link
                href="/dashboard/structure"
                prefetch={true}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] ${
                  pathname === '/dashboard/structure'
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>Topologi & Tupoksi</span>
              </Link>
            )}

            {/* Return to Admin Panel for Superadmin */}
            {user?.role === 'superadmin' && (
              <Link
                href="/admin"
                className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-2 rounded-xl hover:bg-amber-500/25 transition"
                title="Kembali ke Panel Superadmin"
              >
                <span>⚡</span>
                <span>Panel Admin</span>
              </Link>
            )}

            {/* Direct Link to Pembimbing Portal for Pembimbing */}
            {user?.role === 'pembimbing' && (
              <Link
                href="/pembimbing"
                className="flex items-center gap-1.5 text-xs font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-3 py-2 rounded-xl hover:bg-purple-500/30 transition shadow-sm shadow-purple-500/20"
                title="Buka Portal Pembimbing PKL"
              >
                <span>🎓</span>
                <span>Portal Pembimbing</span>
              </Link>
            )}

            {/* Notification Center */}
            <NotificationCenter />

            <div className="h-5 w-[1px] bg-white/10 mx-1" />

            {/* User Profile avatar & Sign out */}
            <div className="flex items-center gap-2">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || 'Profile'}
                  className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-300">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <button
                onClick={handleSignOut}
                title="Logout"
                className="text-gray-400 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

