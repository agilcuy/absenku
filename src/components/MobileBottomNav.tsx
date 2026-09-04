'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Network, Calendar, UserCircle, Camera } from 'lucide-react'

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
      label: 'Topologi',
      href: '/dashboard/structure',
      icon: Network,
      isActive: pathname === '/dashboard/structure',
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
              <div key="center-fab" className="relative -top-4 flex flex-col items-center">
                <button
                  type="button"
                  id="btn-bottom-nav-absen"
                  onClick={handleCenterAction}
                  aria-label="Absen Cepat"
                  className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-[0_8px_25px_rgba(99,102,241,0.5)] border-2 border-indigo-400/40 active:scale-90 transition-transform duration-150 relative group"
                >
                  <Camera className="w-6 h-6 stroke-[2.2]" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                </button>
                <span className="text-[10px] font-bold text-indigo-300 tracking-tight mt-0.5">
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
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all duration-150 active:scale-95 relative ${
                active
                  ? 'text-indigo-400 font-bold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {/* Active subtle pill indicator */}
              <div
                className={`relative p-1 rounded-xl transition-all ${
                  active ? 'bg-indigo-500/15' : 'bg-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {item.hasBadge && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#080b12] animate-pulse"
                    title="Biodata Belum Lengkap"
                  />
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 ${
                  active ? 'text-indigo-400 font-bold' : 'text-gray-400 font-medium'
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
