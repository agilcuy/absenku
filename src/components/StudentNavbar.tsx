'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Calendar, Home, User as UserIcon } from 'lucide-react'

interface StudentNavbarProps {
  user?: {
    full_name?: string
    email?: string
    avatar_url?: string
  }
}

export default function StudentNavbar({ user }: StudentNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-black/40 border-b border-white/5">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & App Name */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 font-bold">
            📋
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              ABSENKU
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                PKL
              </span>
            </div>
            <p className="text-[10px] text-gray-400">Kominfo Tanggamus</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              pathname === '/dashboard'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Beranda</span>
          </Link>

          <Link
            href="/dashboard/history"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              pathname === '/dashboard/history'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Riwayat</span>
          </Link>

          {/* User profile avatar & Sign out */}
          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <div className="flex items-center gap-2">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || 'Profile'}
                className="w-7 h-7 rounded-full border border-indigo-500/40 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-gray-300">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
            <button
              onClick={handleSignOut}
              title="Logout"
              className="text-gray-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
