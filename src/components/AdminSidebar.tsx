'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  GraduationCap,
  Building,
  FileText,
  ClipboardList,
  CalendarDays,
  Settings,
  FileSpreadsheet,
  ShieldAlert,
  Smartphone,
  Network,
  UserCheck,
  BookOpen,
  Zap,
  Megaphone,
  Radio,
  X,
} from 'lucide-react'

interface MenuItem {
  label: string
  href: string
  icon: React.ElementType
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'MONITORING',
    items: [
      { label: 'Dashboard Utama', href: '/admin', icon: LayoutDashboard },
      { label: 'Monitoring Ruijie Cloud', href: '/admin/ruijie', icon: Radio },
      { label: 'Topologi & Tupoksi', href: '/admin/structure', icon: Network },
    ],
  },
  {
    title: 'MASTER DATA PKL',
    items: [
      { label: 'Peserta Didik PKL', href: '/admin/students', icon: UserCheck },
      { label: 'Pembimbing PKL', href: '/admin/mentors', icon: GraduationCap },
      { label: 'Tempat / Instansi', href: '/admin/places', icon: Building },
    ],
  },
  {
    title: 'OPERASIONAL & ABSENSI',
    items: [
      { label: 'Riwayat Absensi', href: '/admin/attendances', icon: ClipboardList },
      { label: 'Rekap Lembur', href: '/admin/overtime', icon: Zap },
      { label: 'Pengajuan Izin & Sakit', href: '/admin/permits', icon: FileText },
      { label: 'Jurnal Kegiatan PKL', href: '/admin/journals', icon: BookOpen },
      { label: 'Pengumuman Siswa', href: '/admin/announcements', icon: Megaphone },
      { label: 'Kalender Presensi', href: '/admin/calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'SISTEM & LAPORAN',
    items: [
      { label: 'Pengaturan Sistem', href: '/admin/settings', icon: Settings },
      { label: 'Aktivitas Login', href: '/admin/login-activity', icon: Smartphone },
      { label: 'Rekap & Export Data', href: '/admin/export', icon: FileSpreadsheet },
      { label: 'Audit Log Perubahan', href: '/admin/audit', icon: ShieldAlert },
    ],
  },
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0d17] border-r border-white/5 flex flex-col pt-safe pb-safe transition-transform duration-300 ease-in-out lg:translate-x-0 ${
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
              <p className="text-[10px] text-gray-400">Sistem Presensi PKL</p>
            </div>
          </Link>

          <button
            onClick={onCloseMobile}
            className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items Grouped by Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {MENU_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pb-1 text-[9px] font-extrabold text-gray-400/80 uppercase tracking-wider">
                {section.title}
              </div>

              {section.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href === '/admin/settings' && pathname.startsWith('/admin/settings'))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`sidebar-link active:scale-[0.98] transition-all duration-100 ${
                      isActive ? 'active' : ''
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer Admin System info */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="rounded-xl p-3 bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              RA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">Rafi Agil Kurniawan</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Superadmin Sistem
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
