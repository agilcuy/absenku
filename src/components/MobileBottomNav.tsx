'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, BookOpen, Calendar, UserCircle, Camera } from 'lucide-react'

interface MobileBottomNavProps {
  isProfileIncomplete?: boolean
  onQuickAbsen?: () => void
}

export default function MobileBottomNav({
  isProfileIncomplete = false,
  onQuickAbsen,
}: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleCenterAction = () => {
    if (onQuickAbsen) {
      onQuickAbsen()
    } else {
      router.push('/dashboard?action=absen')
    }
  }

  const navItems = [
    {
      label: 'Beranda',
      href: '/dashboard',
      icon: Home,
      isActive: pathname === '/dashboard',
    },
    {
      label: 'Jurnal',
      href: '/dashboard/journals',
      icon: BookOpen,
      isActive: pathname === '/dashboard/journals',
    },
    // Center FAB placeholder (index 2)
    {
      isCenterFab: true,
    },
    {
      label: 'Riwayat',
      href: '/dashboard/history',
      icon: Calendar,
      isActive: pathname === '/dashboard/history' || pathname === '/dashboard/permits',
    },
    {
      label: 'Profil',
      href: '/dashboard/profile',
      icon: UserCircle,
      isActive: pathname === '/dashboard/profile',
      hasBadge: isProfileIncomplete,
    },
  ]

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden backdrop-blur-2xl bg-[#080b12]/90 border-t border-white/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.45)]"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
      }}
    >
      <div className="max-w-md mx-auto px-3 h-16 flex items-center justify-around relative">
        {navItems.map((item, idx) => {
          if (item.isCenterFab) {
            return (
              <div key="center-fab" className="relative -top-5 flex flex-col items-center">
                {/* Sonar Breathing Waves */}
                <span className="absolute -inset-2.5 rounded-3xl bg-indigo-500/20 animate-ping opacity-60 pointer-events-none" />
                <span className="absolute -inset-1 rounded-2xl bg-indigo-400/25 animate-pulse pointer-events-none" />

                <button
                  type="button"
                  id="btn-bottom-nav-absen"
                  onClick={handleCenterAction}
                  aria-label="Absen Cepat"
                  className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(99,102,241,0.6)] border-2 border-indigo-400/50 active:scale-90 transition-all duration-200 relative group"
                >
                  <Camera className="w-6 h-6 stroke-[2.2] group-hover:scale-110 transition-transform" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                </button>
                <span className="text-[10px] font-bold text-indigo-300 tracking-tight mt-1">
                  Absen
                </span>
              </div>
            )
          }

          const Icon = item.icon!
          const active = item.isActive

          return (
            <Link
              key={item.href}
              href={item.href!}
              prefetch={true}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-90 relative ${
                active
                  ? 'text-indigo-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active top glowing dot */}
              {active && (
                <span className="absolute top-0 w-8 h-1 rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              )}

              {/* Icon with active spring lift */}
              <div
                className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                  active ? 'bg-indigo-500/15 -translate-y-0.5' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? 'stroke-[2.4] scale-105' : 'stroke-[1.8]'}`} />
                {item.hasBadge && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#080b12] animate-pulse"
                    title="Biodata Belum Lengkap"
                  />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                  active ? 'text-indigo-400 font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
