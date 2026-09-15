'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
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
  MessageSquare,
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
      { label: 'Monitoring IP', href: '/admin/monitoring-ip', icon: Radio },
      { label: 'NOC WhatsApp Bot', href: '/admin/monitoring-ip?tab=whatsapp', icon: MessageSquare },
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
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

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
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]">
              <span className="inline-block transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125">⚡</span>
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
                ABSENKU
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold border border-indigo-500/30 group-hover:border-indigo-400 transition-colors">
                  ADMIN
                </span>
              </span>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors">Sistem Presensi PKL</p>
            </div>
          </Link>

          <button
            onClick={onCloseMobile}
            className="lg:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items Grouped by Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {MENU_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pb-1 text-[9px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>{section.title}</span>
              </div>

              {section.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href.includes('tab=')
                    ? pathname === '/admin/monitoring-ip' && tab === 'whatsapp'
                    : item.href === '/admin/monitoring-ip'
                    ? (pathname === '/admin/monitoring-ip' && (!tab || tab !== 'whatsapp')) || pathname === '/admin/network' || pathname === '/admin/ruijie'
                    : pathname === item.href ||
                      (item.href === '/admin/settings' && pathname.startsWith('/admin/settings'))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onClick={onCloseMobile}
                    className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 select-none active:scale-[0.98] ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-500/10 to-transparent text-white font-semibold border border-indigo-500/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {/* Neon Left Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,1)]" />
                    )}

                    {/* Icon with hover micro-animation */}
                    <Icon
                      className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 group-hover:rotate-3 shrink-0 ${
                        isActive
                          ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]'
                          : 'text-slate-400 group-hover:text-indigo-300'
                      }`}
                    />

                    {/* Label with slide on hover */}
                    <span className="text-xs font-medium transition-transform duration-200 group-hover:translate-x-1 truncate">
                      {item.label}
                    </span>

                    {/* Contextual Live Badges */}
                    {(item.href === '/admin/monitoring-ip' || item.href === '/admin/network' || item.href === '/admin/ruijie') && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        69 IP
                      </span>
                    )}

                    {item.href === '/admin/structure' && (
                      <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-slate-400 shrink-0">
                        Peta
                      </span>
                    )}

                    {item.href === '/admin/permits' && (
                      <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                        Izin
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer Admin System info */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="rounded-xl p-3 bg-white/[0.02] border border-white/5 flex items-center gap-3 transition-all hover:bg-white/[0.05] hover:border-white/10 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all">
              RA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                Rafi Agil Kurniawan
              </p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Superadmin Sistem
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
