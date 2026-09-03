'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building,
  FileText,
  ClipboardList,
  CalendarDays,
  Clock,
  CalendarCheck,
  FileSpreadsheet,
  ShieldAlert,
  Smartphone,
  Camera,
  X,
} from 'lucide-react'

const MENU_ITEMS = [
  { label: 'Monitoring Live', href: '/admin', icon: LayoutDashboard },
  { label: 'Portal Pembimbing (Saya)', href: '/pembimbing', icon: GraduationCap },
  { label: 'Absen Saya (Kamera)', href: '/dashboard', icon: Camera },
  { label: 'Peserta Didik', href: '/admin/students', icon: Users },
  { label: 'Pembimbing PKL', href: '/admin/mentors', icon: GraduationCap },
  { label: 'Tempat PKL', href: '/admin/places', icon: Building },
  { label: 'Izin & Sakit', href: '/admin/permits', icon: FileText },
  { label: 'Data Absensi', href: '/admin/attendances', icon: ClipboardList },
  { label: 'Kalender Absensi', href: '/admin/calendar', icon: CalendarDays },
  { label: 'Aktivitas Login', href: '/admin/login-activity', icon: Smartphone },
  { label: 'Jam & Identitas', href: '/admin/settings', icon: Clock },
  { label: 'Hari Kerja & Libur', href: '/admin/settings/schedule', icon: CalendarCheck },
  { label: 'Export Rekap', href: '/admin/export', icon: FileSpreadsheet },
  { label: 'Audit Log', href: '/admin/audit', icon: ShieldAlert },
]

interface AdminSidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function AdminSidebar({ mobileOpen, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0d17] border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25">
              ⚡
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1">
                ABSENKU
                <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold border border-indigo-500/30">
                  ADMIN
                </span>
              </span>
              <p className="text-[10px] text-gray-400">Kominfo Tanggamus</p>
            </div>
          </Link>

          <button
            onClick={onCloseMobile}
            className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Menu Utama
          </div>

          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Footer Admin System info */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="rounded-xl p-3 bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              SA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">Superadmin</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sistem Aktif
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
