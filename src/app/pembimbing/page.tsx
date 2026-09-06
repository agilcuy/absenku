'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Network,
  UserCheck,
  Building,
  ClipboardList,
  FileText,
  BookOpen,
  CalendarDays,
  Smartphone,
  FileSpreadsheet,
  Users,
  Clock,
  AlertTriangle,
  UserX,
  RefreshCw,
  TrendingUp,
  Activity,
  Search,
  Menu,
  LogOut,
  ShieldCheck,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Download,
  Zap,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  formatDate,
  formatTime,
  getStatusBadge,
  getStatusEmoji,
  getStatusLabel,
  formatLastSeen,
  formatOvertimeShort,
  MONTH_NAMES,
} from '@/lib/utils'
import { getHolidayInfo } from '@/lib/nationalHolidays'
import NotificationCenter from '@/components/NotificationCenter'
import StudentDetailModal from '@/components/StudentDetailModal'
import LeafletMapModal from '@/components/LeafletMapModal'
import { useToast, ToastProvider } from '@/components/Toast'

interface MenuItem {
  label: string
  key: string
  icon: React.ElementType
  badge?: string | number
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

function PembimbingPortalContent() {
  const router = useRouter()
  const { showToast } = useToast()

  // Navigation View: identical structure to Superadmin
  const [currentView, setCurrentView] = useState<string>('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Live WIB clock (identik dengan Superadmin)
  const [liveTime, setLiveTime] = useState('')
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setLiveTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta',
        }) + ' WIB'
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Core Data states
  const [mentor, setMentor] = useState<any>(null)
  const [dataStats, setDataStats] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
  const [permits, setPermits] = useState<any[]>([])
  const [journals, setJournals] = useState<any[]>([])
  const [overtimes, setOvertimes] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [multiDeviceAlerts, setMultiDeviceAlerts] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter states
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('')
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('')

  // Modals (Read-only)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentDetailModalOpen, setStudentDetailModalOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [mapModal, setMapModal] = useState<{
    isOpen: boolean
    lat: number
    lng: number
    title: string
    address?: string
  }>({
    isOpen: false,
    lat: 0,
    lng: 0,
    title: '',
  })

  // Calendar states
  const today = new Date()
  const todayDateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayDateStr)

  // Load data (read-only for mentor's place)
  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Fetch profile
      let profile: any = null
      try {
        const resProf = await fetch('/api/students/profile')
        if (resProf.ok) {
          const profJson = await resProf.json()
          profile = profJson.profile
        }
      } catch (e) {
        console.warn('Could not load profile from server API:', e)
      }

      if (!profile) {
        const { data: clientProfile } = await supabase
          .from('users')
          .select('*, internship_places(*)')
          .eq('id', user.id)
          .maybeSingle()
        profile = clientProfile
      }

      if (!profile || (profile.role !== 'pembimbing' && profile.role !== 'superadmin')) {
        router.push('/dashboard')
        return
      }

      setMentor(profile)

      // Fetch scoped data concurrently
      const [resStats, resAttendances, resPermits, resJournals, resOvertimes, resSessions] =
        await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/attendances'),
          fetch('/api/permits'),
          fetch('/api/journals'),
          fetch('/api/overtime'),
          fetch('/api/sessions'),
        ])

      if (resStats.ok) {
        const sData = await resStats.json()
        setDataStats(sData)
        setStudents(sData.students || [])
        if (sData.multiDeviceAlerts) {
          setMultiDeviceAlerts(sData.multiDeviceAlerts)
        }
      }

      if (resAttendances.ok) {
        const attData = await resAttendances.json()
        setAttendances(attData.attendances || [])
      }

      if (resPermits.ok) {
        const pData = await resPermits.json()
        setPermits(pData.permits || [])
      }

      if (resJournals.ok) {
        const jData = await resJournals.json()
        setJournals(jData.journals || [])
      }

      if (resOvertimes.ok) {
        const oData = await resOvertimes.json()
        setOvertimes(oData.overtimes || [])
      }

      if (resSessions.ok) {
        const sessData = await resSessions.json()
        setSessions(sessData.sessions || [])
        if (sessData.multiDeviceAlerts?.length > 0) {
          setMultiDeviceAlerts(sessData.multiDeviceAlerts)
        }
      }
    } catch (err) {
      console.error('Error loading pembimbing data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 25000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await loadData()
    showToast('Data monitoring berhasil diperbarui!', 'success')
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleOpenStudentDetail = (id: string) => {
    setSelectedStudentId(id)
    setStudentDetailModalOpen(true)
  }

  // Export CSV (Read-only report export)
  const handleExportCSV = () => {
    if (students.length === 0) {
      showToast('Tidak ada data siswa untuk diekspor.', 'error')
      return
    }

    const headers = [
      'Nama Siswa',
      'Kelas',
      'Jurusan',
      'Username/Email',
      'Status Kehadiran Hari Ini',
      'Jam Masuk',
      'Jam Pulang',
      'Lembur',
    ]
    const rows = students.map((s) => {
      const att = s.today_attendance
      return [
        `"${s.full_name || ''}"`,
        `"${s.class_name || ''}"`,
        `"${s.major || ''}"`,
        `"${s.username || s.email || ''}"`,
        `"${att ? getStatusLabel(att.check_in_status) : 'Belum Absen'}"`,
        `"${att?.check_in_time ? formatTime(att.check_in_time) : '--:--'}"`,
        `"${att?.check_out_time ? formatTime(att.check_out_time) : '--:--'}"`,
        `"${att?.is_overtime ? `${att.overtime_minutes} Menit` : '0'}"`,
      ]
    })

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `laporan-presensi-${mentor?.internship_places?.name || 'instansi'}-${todayDateStr}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Laporan presensi berhasil diunduh (CSV)!', 'success')
  }

  // Derived Analytics (Identik dengan Superadmin)
  const stats = dataStats?.stats
  const weeklyTrend = dataStats?.weeklyTrend || []
  const placeTitle = mentor?.internship_places?.name || 'Instansi Penugasan PKL'

  // Donut chart data (Sama persis dengan Superadmin)
  const pieData = [
    { name: 'Tepat Waktu', value: stats?.onTimeToday || 0, color: '#10b981' },
    { name: 'Terlambat', value: stats?.lateToday || 0, color: '#f59e0b' },
    { name: 'Izin', value: stats?.izinToday || 0, color: '#3b82f6' },
    { name: 'Sakit', value: stats?.sakitToday || 0, color: '#a855f7' },
    { name: 'Alpha', value: stats?.alphaToday || 0, color: '#ef4444' },
    { name: 'Belum Absen', value: stats?.notCheckedIn || 0, color: '#475569' },
  ].filter((d) => d.value > 0)

  // Filter students
  const filteredStudents = students.filter((s: any) => {
    if (presenceFilter === 'online' && !s.is_online) return false
    if (presenceFilter === 'offline' && s.is_online) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = s.full_name?.toLowerCase().includes(q)
      const matchClass = s.class_name?.toLowerCase().includes(q)
      const matchPlace = s.internship_places?.name?.toLowerCase().includes(q)
      if (!matchName && !matchClass && !matchPlace) return false
    }
    return true
  })

  // Filter attendances
  const filteredAttendances = attendances.filter((att) => {
    if (attendanceDateFilter && att.date !== attendanceDateFilter) return false
    if (attendanceStatusFilter && att.check_in_status !== attendanceStatusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = att.users?.full_name?.toLowerCase().includes(q)
      const matchClass = att.users?.class_name?.toLowerCase().includes(q)
      if (!matchName && !matchClass) return false
    }
    return true
  })

  // Attendances by date for calendar
  const attendancesByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    attendances.forEach((att) => {
      if (!map[att.date]) map[att.date] = []
      map[att.date].push(att)
    })
    return map
  }, [attendances])

  // Calendar helpers
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay()
  const startDayOffset = (firstDayOfMonth + 6) % 7
  const daysInCurrentMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear((y) => y - 1)
    } else {
      setCalendarMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear((y) => y + 1)
    } else {
      setCalendarMonth((m) => m + 1)
    }
  }

  // ========================================================
  // MENU SECTIONS (PERSIS SEPERTI GAMBAR 2 SUPERADMIN)
  // ========================================================
  const MENU_SECTIONS: MenuSection[] = [
    {
      title: 'MONITORING',
      items: [
        { label: 'Dashboard Utama', key: 'dashboard', icon: LayoutDashboard },
        { label: 'Topologi & Tupoksi', key: 'structure', icon: Network },
      ],
    },
    {
      title: 'MASTER DATA PKL',
      items: [
        { label: 'Peserta Didik PKL', key: 'students', icon: UserCheck, badge: students.length },
        { label: 'Tempat / Instansi', key: 'place', icon: Building },
      ],
    },
    {
      title: 'OPERASIONAL & ABSENSI',
      items: [
        { label: 'Riwayat Absensi', key: 'attendances', icon: ClipboardList, badge: attendances.length },
        { label: 'Rekap Lembur', key: 'overtime', icon: Zap, badge: overtimes.length },
        { label: 'Pengajuan Izin & Sakit', key: 'permits', icon: FileText, badge: permits.length },
        { label: 'Jurnal Kegiatan PKL', key: 'journals', icon: BookOpen, badge: journals.length },
        { label: 'Kalender Presensi', key: 'calendar', icon: CalendarDays },
      ],
    },
    {
      title: 'SISTEM & LAPORAN',
      items: [
        { label: 'Aktivitas Login', key: 'login-activity', icon: Smartphone, badge: multiDeviceAlerts.length > 0 ? `${multiDeviceAlerts.length} Alert` : undefined },
        { label: 'Rekap & Export Data', key: 'export', icon: FileSpreadsheet },
      ],
    },
  ]

  // Mentor initials
  const mentorName = mentor?.full_name || 'Pembimbing'
  const mentorInitials = mentorName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join('') || 'PB'

  return (
    <div className="min-h-screen bg-[#06070d] text-slate-100 flex">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* ========================================================
          SIDEBAR KIRI (SAMA PERSIS DENGAN SIDEBAR SUPERADMIN DI GAMBAR 2)
         ======================================================== */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0d17] border-r border-white/5 flex flex-col pt-safe pb-safe transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25">
              ⚡
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1">
                ABSENKU
                <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold border border-indigo-500/30 uppercase">
                  PEMBIMBING
                </span>
              </span>
              <p className="text-[10px] text-gray-400">Sistem Presensi PKL</p>
            </div>
          </button>

          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Sections (Persis Superadmin) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {MENU_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pb-1 text-[9px] font-extrabold text-gray-400/80 uppercase tracking-wider">
                {section.title}
              </div>

              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = currentView === item.key

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (item.key === 'structure') {
                        router.push('/dashboard/structure')
                      } else if (item.key === 'export') {
                        handleExportCSV()
                      } else {
                        setCurrentView(item.key)
                      }
                      setMobileSidebarOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition active:scale-[0.98] ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer Info Pembimbing (Persis Superadmin di Gambar 2) */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="rounded-xl p-3 bg-white/[0.02] border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              {mentorInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{mentorName}</p>
              <p className="text-[10px] text-indigo-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Pembimbing PKL (Read-Only)
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================
          MAIN CONTENT AREA (PERSIS SEPERTI GAMBAR 2)
         ======================================================== */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Header (SAMA PERSIS DENGAN GAMBAR 2) */}
        <header className="sticky top-0 z-30 pt-safe bg-[#06070d]/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 flex items-center justify-between min-h-[56px] lg:h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>
                Panel Pembimbing Presensi PKL • <b className="text-white">{placeTitle}</b>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live WIB Clock */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-indigo-300 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>{liveTime || 'Memuat...'}</span>
            </div>

            {/* Notification Center */}
            <NotificationCenter />

            {/* Tombol Absen Mandiri */}
            <Link
              href="/dashboard"
              prefetch={true}
              className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition font-semibold active:scale-[0.98]"
              title="Buka kamera absensi mandiri"
            >
              <span>📸</span>
              <span className="hidden md:inline">Absen Mandiri</span>
            </Link>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              title="Keluar dari Portal"
              className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {/* ========================================================
              VIEW 1: DASHBOARD UTAMA (SAMA PERSIS DENGAN GAMBAR 2)
             ======================================================== */}
          {currentView === 'dashboard' && (
            <div className="flex flex-col gap-6">
              {/* Header Banner (Sama persis Gambar 2 - Read-Only tanpa tombol Tambah/Edit) */}
              <div className="glass-card p-6 border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="orb orb-purple w-56 h-56 top-[-30px] right-[-30px]" />

                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    <span>Pusat Monitoring Siswa & Real-time Presence</span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-black text-white">
                    Dashboard Pembimbing
                  </h1>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(new Date())} - Sistem Monitoring PKL & Kedisiplinan Siswa di {placeTitle}
                  </p>
                </div>

                {/* Quick Actions (Read-Only: Absensi Saya, Perbarui, Review Izin) */}
                <div className="flex items-center gap-2 flex-wrap relative z-10">
                  <Link
                    href="/dashboard"
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/15 font-semibold rounded-xl"
                    title="Buka kamera absensi mandiri untuk Anda"
                  >
                    <span>📸</span>
                    <span>Absensi Saya</span>
                  </Link>

                  <button
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl"
                    title="Perbarui data monitoring sekarang"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('permits')}
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl border-white/10 hover:border-indigo-500/40"
                    title="Tinjau daftar izin siswa"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Review Izin</span>
                  </button>
                </div>
              </div>

              {/* Multi-Device Warning Alert */}
              {multiDeviceAlerts.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-300">
                        Peringatan: Satu Akun Aktif di Beberapa Perangkat Bersamaan
                      </h4>
                      <p className="text-xs text-amber-200/80 mt-0.5">
                        Terdeteksi {multiDeviceAlerts.length} siswa login pada lebih dari satu perangkat secara aktif:{' '}
                        <span className="font-semibold text-white">
                          {multiDeviceAlerts.map((a: any) => a.user_name).join(', ')}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('login-activity')}
                    className="btn-outline text-xs py-2 px-3 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 whitespace-nowrap self-start sm:self-auto"
                  >
                    Lihat Sesi Perangkat
                  </button>
                </div>
              )}

              {/* Top 9 Statistics Grid (SAMA PERSIS DENGAN GAMBAR 2) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Total Siswa */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Total Siswa</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-white">{stats?.totalStudents ?? students.length}</span>
                    <Users className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>

                {/* 2. Siswa Online */}
                <div className="glass-card p-4 border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-400 font-semibold uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-emerald-400">
                      {stats?.onlineStudents ?? students.filter((s) => s.is_online).length}
                    </span>
                    <span className="text-[10px] text-gray-400">Aktif web</span>
                  </div>
                </div>

                {/* 3. Siswa Offline */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    Offline
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-gray-300">
                      {stats?.offlineStudents ?? students.filter((s) => !s.is_online).length}
                    </span>
                    <span className="text-[10px] text-gray-500">Tidak aktif</span>
                  </div>
                </div>

                {/* 4. Hadir Hari Ini */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Hadir Hari Ini</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-white">{stats?.presentToday ?? 0}</span>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                {/* 5. Terlambat */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Terlambat</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-amber-400">{stats?.lateToday ?? 0}</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                {/* 6. Izin */}
                <div className="glass-card p-4 border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between">
                  <span className="text-[11px] text-blue-400 font-semibold uppercase">Izin</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-blue-400">{stats?.izinToday ?? 0}</span>
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                </div>

                {/* 7. Sakit */}
                <div className="glass-card p-4 border border-purple-500/20 bg-purple-500/5 flex flex-col justify-between">
                  <span className="text-[11px] text-purple-400 font-semibold uppercase">Sakit</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-purple-400">{stats?.sakitToday ?? 0}</span>
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                </div>

                {/* 8. Alfa */}
                <div className="glass-card p-4 border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between">
                  <span className="text-[11px] text-rose-400 font-semibold uppercase">Alfa</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-rose-400">{stats?.alphaToday ?? 0}</span>
                    <UserX className="w-4 h-4 text-rose-400" />
                  </div>
                </div>

                {/* 9. Belum Absen */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Belum Absen</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-gray-400">{stats?.notCheckedIn ?? 0}</span>
                    <Clock className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* 2 Charts Section (SAMA PERSIS DENGAN GAMBAR 2) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Trend Bar Chart (2 cols) */}
                <div className="lg:col-span-2 glass-card p-5 border border-white/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-400" />
                        Tren Kehadiran 7 Hari Terakhir
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Visualisasi tepat waktu, terlambat, izin, sakit, dan alpha
                      </p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    {weeklyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            fontSize={11}
                            tickFormatter={(v) => v.substring(5)}
                          />
                          <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#111827',
                              borderColor: 'rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="tepat" name="Tepat Waktu" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="terlambat" name="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="izin" name="Izin" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="sakit" name="Sakit" fill="#a855f7" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="alpha" name="Alpha" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-500">
                        Data kehadiran 7 hari terakhir belum cukup untuk divisualisasikan.
                      </div>
                    )}
                  </div>
                </div>

                {/* Today Donut Status Breakdown (1 col) */}
                <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Komposisi Hari Ini
                  </h3>

                  <div className="h-44 w-full flex items-center justify-center">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#111827',
                              borderColor: 'rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-gray-500">Belum ada aktivitas hari ini.</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Tepat: {stats?.onTimeToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Telat: {stats?.lateToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Izin: {stats?.izinToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-purple-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>Sakit: {stats?.sakitToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Alpha: {stats?.alphaToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      <span>Belum: {stats?.notCheckedIn ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Student Monitoring Section (SAMA PERSIS DENGAN GAMBAR 2) */}
              <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <h3 className="text-base font-bold text-white">
                        Live Monitoring Peserta Didik
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Pantau status online/offline real-time, aktivitas terakhir, dan absensi hari ini
                    </p>
                  </div>

                  {/* Presence Filter Badges (Sama persis Gambar 2) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Cari siswa/tempat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field text-xs pl-8 py-1.5 w-40 sm:w-48"
                      />
                    </div>

                    <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                      <button
                        onClick={() => setPresenceFilter('all')}
                        className={`px-3 py-1 rounded-lg font-medium transition ${
                          presenceFilter === 'all'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Semua ({students.length})
                      </button>
                      <button
                        onClick={() => setPresenceFilter('online')}
                        className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition ${
                          presenceFilter === 'online'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Online ({stats?.onlineStudents ?? students.filter((s) => s.is_online).length})
                      </button>
                      <button
                        onClick={() => setPresenceFilter('offline')}
                        className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition ${
                          presenceFilter === 'offline'
                            ? 'bg-slate-700 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Offline ({stats?.offlineStudents ?? students.filter((s) => !s.is_online).length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Student Table (SAMA PERSIS DENGAN GAMBAR 2: Aksi HANYA tombol Detail) */}
                {filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500">
                    Tidak ada data siswa yang cocok dengan filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 font-semibold">
                          <th className="py-3 px-3">Siswa</th>
                          <th className="py-3 px-3">Tempat PKL & Pembimbing</th>
                          <th className="py-3 px-3">Status Presence</th>
                          <th className="py-3 px-3">Terakhir Aktif</th>
                          <th className="py-3 px-3">Absensi Hari Ini</th>
                          <th className="py-3 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredStudents.map((s: any) => {
                          const todayAtt = s.today_attendance

                          return (
                            <tr
                              key={s.id}
                              onClick={() => handleOpenStudentDetail(s.id)}
                              className="hover:bg-white/5 transition cursor-pointer group"
                            >
                              {/* Siswa */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs border border-white/10 overflow-hidden flex-shrink-0">
                                      {s.avatar_url ? (
                                        <img
                                          src={s.avatar_url}
                                          alt={s.full_name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        (s.full_name?.charAt(0) || 'S').toUpperCase()
                                      )}
                                    </div>
                                    <span
                                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                                        s.is_online ? 'bg-emerald-500' : 'bg-slate-500'
                                      }`}
                                    />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white group-hover:text-indigo-400 transition">
                                      {s.full_name}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                      {s.class_name || 'Kelas -'} • {s.username || s.email}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Tempat PKL & Pembimbing */}
                              <td className="py-3 px-3">
                                <p className="font-medium text-gray-200 truncate max-w-[180px]">
                                  {placeTitle}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate max-w-[180px]">
                                  Bim: {mentorName}
                                </p>
                              </td>

                              {/* Status Presence */}
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                    s.is_online
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      s.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                                    }`}
                                  />
                                  {s.is_online ? 'Online' : 'Offline'}
                                </span>
                              </td>

                              {/* Terakhir Aktif */}
                              <td className="py-3 px-3 text-gray-300">
                                <span className="text-[11px]">{formatLastSeen(s.last_seen)}</span>
                              </td>

                              {/* Absensi Hari Ini */}
                              <td className="py-3 px-3">
                                {todayAtt ? (
                                  <span className={`badge text-[11px] ${getStatusBadge(todayAtt.check_in_status)}`}>
                                    <span>{getStatusEmoji(todayAtt.check_in_status)}</span>
                                    <span>{getStatusLabel(todayAtt.check_in_status)}</span>
                                    {todayAtt.check_in_time && (
                                      <span className="text-[10px] opacity-75">
                                        ({formatTime(todayAtt.check_in_time)})
                                      </span>
                                    )}
                                  </span>
                                ) : !s.is_within_period ? (
                                  <span className="text-[10px] text-gray-500 italic">
                                    Di luar periode PKL
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                    Belum Absen
                                  </span>
                                )}
                              </td>

                              {/* Aksi: HANYA LIHAT DETAIL (Read-Only) */}
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenStudentDetail(s.id)
                                  }}
                                  className="btn-outline text-[11px] py-1 px-2.5 hover:border-indigo-500"
                                >
                                  Detail
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 2: PESERTA DIDIK PKL (Read-Only)
             ======================================================== */}
          {currentView === 'students' && (
            <div className="space-y-6">
              <div className="glass-card p-6 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Peserta Didik PKL</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Daftar seluruh siswa bimbingan yang bertugas di <b className="text-white">{placeTitle}</b> (Mode Lihat Saja).
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl border-white/10 hover:border-indigo-500"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Data</span>
                </button>
              </div>

              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                        <th className="py-3 px-4">No</th>
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Kelas & Jurusan</th>
                        <th className="py-3 px-4">Kontak WhatsApp</th>
                        <th className="py-3 px-4">Status Akun</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredStudents.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 px-4 font-mono text-gray-500">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-white">{s.full_name}</td>
                          <td className="py-3.5 px-4 text-gray-300">
                            {s.class_name || '-'} {s.major ? `• ${s.major}` : ''}
                          </td>
                          <td className="py-3.5 px-4 text-gray-300 font-mono">{s.phone || '-'}</td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                              {s.internship_status || 'Aktif'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenStudentDetail(s.id)}
                              className="btn-outline text-[11px] py-1 px-2.5 hover:border-indigo-500"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 3: TEMPAT / INSTANSI PKL (Read-Only)
             ======================================================== */}
          {currentView === 'place' && (
            <div className="space-y-6">
              <div className="glass-card p-6 border border-indigo-500/20 rounded-2xl">
                <h2 className="text-xl font-bold text-white">Informasi Tempat / Instansi PKL</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Detail instansi penugasan PKL Anda (Mode Lihat Saja).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Nama Instansi</span>
                    <p className="text-base font-bold text-white mt-1">{placeTitle}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Alamat Kantor</span>
                    <p className="text-sm text-gray-200 mt-1">{mentor?.internship_places?.address || '-'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Jam Kerja Reguler</span>
                    <p className="text-sm font-mono text-indigo-400 mt-1">
                      {mentor?.internship_places?.work_start_time || '08:30'} s/d {mentor?.internship_places?.work_end_time || '16:30'} WIB
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Jam Mulai Lembur</span>
                    <p className="text-sm font-mono text-amber-400 mt-1">
                      {mentor?.internship_places?.overtime_start_time || '17:30'} s/d 24:00 WIB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 4: RIWAYAT ABSENSI (Read-Only)
             ======================================================== */}
          {currentView === 'attendances' && (
            <div className="space-y-6">
              <div className="glass-card p-6 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Riwayat Absensi Siswa</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Catatan swafoto dan jam kehadiran siswa di <b className="text-white">{placeTitle}</b> (Mode Lihat Saja).
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl border-white/10 hover:border-indigo-500"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>
              </div>

              {/* Filter */}
              <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={attendanceDateFilter}
                  onChange={(e) => setAttendanceDateFilter(e.target.value)}
                  className="input-field text-xs py-1.5 px-3 w-40"
                />
                <select
                  value={attendanceStatusFilter}
                  onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                  className="input-field text-xs py-1.5 px-3 w-36"
                >
                  <option value="">Semua Status</option>
                  <option value="on_time">Tepat Waktu</option>
                  <option value="late">Terlambat</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alpha">Alpha</option>
                </select>
                {(attendanceDateFilter || attendanceStatusFilter) && (
                  <button
                    onClick={() => {
                      setAttendanceDateFilter('')
                      setAttendanceStatusFilter('')
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Attendance Table */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Masuk</th>
                        <th className="py-3 px-4">Pulang</th>
                        <th className="py-3 px-4">Lembur</th>
                        <th className="py-3 px-4">Swafoto</th>
                        <th className="py-3 px-4">Lokasi GPS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredAttendances.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-500">
                            Tidak ada catatan absensi.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendances.map((att) => {
                          const checkInPhoto = att.attendance_photos?.find((p: any) => p.photo_type === 'check_in')?.photo_url

                          return (
                            <tr key={att.id} className="hover:bg-white/[0.02]">
                              <td className="py-3.5 px-4 font-bold text-white">{att.users?.full_name || 'Siswa'}</td>
                              <td className="py-3.5 px-4 font-mono text-gray-300">{att.date}</td>
                              <td className="py-3.5 px-4">
                                <span className={`badge text-[10px] ${getStatusBadge(att.check_in_status)}`}>
                                  {getStatusLabel(att.check_in_status)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-white">{att.check_in_time ? formatTime(att.check_in_time) : '--:--'}</td>
                              <td className="py-3.5 px-4 font-mono text-white">{att.check_out_time ? formatTime(att.check_out_time) : '--:--'}</td>
                              <td className="py-3.5 px-4">
                                {att.is_overtime && att.overtime_minutes > 0 ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                    ⚡ +{formatOvertimeShort(att.overtime_minutes)}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                {checkInPhoto ? (
                                  <button
                                    onClick={() => setPreviewImage(checkInPhoto)}
                                    className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 hover:scale-110 transition"
                                  >
                                    <img src={checkInPhoto} alt="Foto" className="w-full h-full object-cover" />
                                  </button>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                {att.check_in_lat && att.check_in_lng ? (
                                  <button
                                    onClick={() =>
                                      setMapModal({
                                        isOpen: true,
                                        lat: Number(att.check_in_lat),
                                        lng: Number(att.check_in_lng),
                                        title: `Lokasi: ${att.users?.full_name}`,
                                        address: att.check_in_address,
                                      })
                                    }
                                    className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center gap-1 text-[10px] px-2"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    <span>Peta</span>
                                  </button>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 5: REKAP LEMBUR (Read-Only)
             ======================================================== */}
          {currentView === 'overtime' && (
            <div className="space-y-6">
              <div className="glass-card p-6 border border-indigo-500/20 rounded-2xl">
                <h2 className="text-xl font-bold text-white">Rekap Lembur Siswa</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Catatan sesi lembur siswa di <b className="text-white">{placeTitle}</b> (Mode Lihat Saja).
                </p>
              </div>

              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Durasi Lembur</th>
                        <th className="py-3 px-4">Waktu Mulai - Selesai</th>
                        <th className="py-3 px-4">Catatan Kegiatan</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {overtimes.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">
                            Belum ada catatan lembur siswa.
                          </td>
                        </tr>
                      ) : (
                        overtimes.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4 font-bold text-white">{item.users?.full_name || 'Siswa'}</td>
                            <td className="py-3.5 px-4 font-mono text-gray-300">{item.date}</td>
                            <td className="py-3.5 px-4 font-bold text-amber-400 font-mono">
                              {formatOvertimeShort(item.overtime_minutes || 0)}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-gray-400">
                              {item.start_time ? formatTime(item.start_time) : '--:--'} s/d {item.end_time ? formatTime(item.end_time) : '--:--'}
                            </td>
                            <td className="py-3.5 px-4 text-gray-300">{item.notes || '-'}</td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/10 text-gray-300">
                                {item.status === 'approved' ? 'Disetujui' : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 6: PENGAJUAN IZIN & SAKIT (Read-Only)
             ======================================================== */}
          {currentView === 'permits' && (
            <div className="space-y-6">
              <div className="glass-card p-6 border border-indigo-500/20 rounded-2xl">
                <h2 className="text-xl font-bold text-white">Pengajuan Izin & Sakit</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Daftar pengajuan izin dan sakit siswa di <b className="text-white">{placeTitle}</b> (Mode Lihat Saja).
                </p>
              </div>

              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Tipe</th>
                        <th className="py-3 px-4">Rentang Tanggal</th>
                        <th className="py-3 px-4">Alasan</th>
                        <th className="py-3 px-4">Surat Dokter</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {permits.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">
                            Belum ada permohonan izin/sakit siswa.
                          </td>
                        </tr>
                      ) : (
                        permits.map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4 font-bold text-white">{p.users?.full_name || 'Siswa'}</td>
                            <td className="py-3.5 px-4 uppercase font-bold text-[10px] text-purple-300">{p.type}</td>
                            <td className="py-3.5 px-4 font-mono text-gray-300">{p.start_date} s/d {p.end_date}</td>
                            <td className="py-3.5 px-4 text-gray-300">{p.reason}</td>
                            <td className="py-3.5 px-4">
                              {p.attachment_url ? (
                                <button
                                  onClick={() => setPreviewImage(p.attachment_url)}
                                  className="text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat Surat</span>
                                </button>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/10 text-gray-300">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 7: JURNAL KEGIATAN PKL (Read-Only)
             ======================================================== */}
          {currentView === 'journals' && (
            <div className="space-y-6">
              <div className="glass-card p-6 border border-indigo-500/20 rounded-2xl">
                <h2 className="text-xl font-bold text-white">Jurnal Kegiatan PKL</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Laporan kegiatan harian anak PKL di <b className="text-white">{placeTitle}</b> (Mode Lihat Saja).
                </p>
              </div>

              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Uraian Pekerjaan</th>
                        <th className="py-3 px-4">Kendala / Solusi</th>
                        <th className="py-3 px-4">Nilai & Paraf</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {journals.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-500">
                            Belum ada laporan jurnal dari siswa.
                          </td>
                        </tr>
                      ) : (
                        journals.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4 font-bold text-white">{item.users?.full_name || 'Siswa'}</td>
                            <td className="py-3.5 px-4 font-mono text-gray-300">{item.date}</td>
                            <td className="py-3.5 px-4 text-gray-200">{item.activity_description || '-'}</td>
                            <td className="py-3.5 px-4 text-gray-400">{item.challenges_solutions || '-'}</td>
                            <td className="py-3.5 px-4">
                              {item.mentor_rating ? (
                                <span className="font-mono text-amber-400 font-bold">
                                  ⭐ {item.mentor_rating}/5 {item.mentor_notes && `(${item.mentor_notes})`}
                                </span>
                              ) : (
                                <span className="text-gray-500 italic">Belum dinilai</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 8: KALENDER PRESENSI (Read-Only)
             ======================================================== */}
          {currentView === 'calendar' && (
            <div className="space-y-6">
              <div className="glass-card p-6 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Kalender Presensi Siswa</h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Visualisasi kehadiran bulanan siswa di <b className="text-white">{placeTitle}</b> (Mode Lihat Saja).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrevMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="font-bold text-sm text-white px-3 font-mono">
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </div>
                  <button onClick={handleNextMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-white/10">
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 pb-2 border-b border-white/10 mb-2">
                    <div className="text-rose-400">Min</div>
                    <div>Sen</div>
                    <div>Sel</div>
                    <div>Rab</div>
                    <div>Kam</div>
                    <div>Jum</div>
                    <div className="text-rose-400">Sab</div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: startDayOffset }).map((_, i) => (
                      <div key={`blank-${i}`} className="h-20 rounded-xl bg-white/[0.01]" />
                    ))}

                    {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                      const dayNum = i + 1
                      const dateStr = `${calendarYear}-${(calendarMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`
                      const isToday = dateStr === todayDateStr
                      const isSelected = dateStr === selectedCalendarDate
                      const dayAttendances = attendancesByDate[dateStr] || []
                      const holiday = getHolidayInfo(dateStr)

                      return (
                        <div
                          key={dateStr}
                          onClick={() => setSelectedCalendarDate(dateStr)}
                          className={`h-20 p-2 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                              : isToday
                              ? 'bg-white/10 border-white/20'
                              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold font-mono ${
                                isToday
                                  ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                                  : holiday
                                  ? 'text-rose-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              {dayNum}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            {dayAttendances.slice(0, 4).map((a, idx) => (
                              <span
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  a.check_in_status === 'on_time'
                                    ? 'bg-emerald-400'
                                    : a.check_in_status === 'late'
                                    ? 'bg-amber-400'
                                    : a.check_in_status === 'izin'
                                    ? 'bg-blue-400'
                                    : a.check_in_status === 'sakit'
                                    ? 'bg-purple-400'
                                    : 'bg-rose-400'
                                }`}
                              />
                            ))}
                            {dayAttendances.length > 4 && (
                              <span className="text-[9px] text-gray-400 font-mono">
                                +{dayAttendances.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col gap-4">
                  <div className="border-b border-white/10 pb-3">
                    <span className="text-xs text-indigo-400 uppercase font-bold tracking-wider">
                      Log Harian
                    </span>
                    <h3 className="font-bold text-white text-base mt-1">{selectedCalendarDate}</h3>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[400px] custom-scrollbar">
                    {(attendancesByDate[selectedCalendarDate] || []).length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-500">
                        Tidak ada rekaman presensi pada tanggal ini.
                      </div>
                    ) : (
                      (attendancesByDate[selectedCalendarDate] || []).map((att) => (
                        <div
                          key={att.id}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-white text-xs">{att.users?.full_name || 'Siswa'}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              Masuk: {att.check_in_time ? formatTime(att.check_in_time) : '--:--'} • Pulang:{' '}
                              {att.check_out_time ? formatTime(att.check_out_time) : '--:--'}
                            </div>
                          </div>
                          <span className={`badge text-[9px] ${getStatusBadge(att.check_in_status)}`}>
                            {getStatusLabel(att.check_in_status)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 9: AKTIVITAS LOGIN (Read-Only)
             ======================================================== */}
          {currentView === 'login-activity' && (
            <div className="space-y-6">
              <div className="glass-card p-6 border border-indigo-500/20 rounded-2xl">
                <h2 className="text-xl font-bold text-white">Aktivitas Login Siswa</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Monitoring perangkat login siswa di <b className="text-white">{placeTitle}</b> (Mode Lihat Saja).
                </p>
              </div>

              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 font-semibold bg-white/[0.02]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Gawai / Device</th>
                        <th className="py-3 px-4">Browser & OS</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Terakhir Aktif</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">
                            Belum ada riwayat sesi login.
                          </td>
                        </tr>
                      ) : (
                        sessions.map((sess) => (
                          <tr key={sess.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4 font-bold text-white">{sess.users?.full_name || 'Siswa'}</td>
                            <td className="py-3.5 px-4 text-gray-200">{sess.device_name || sess.device_type || 'Perangkat'}</td>
                            <td className="py-3.5 px-4 text-gray-300">{sess.browser || 'Browser'} • {sess.os || 'OS'}</td>
                            <td className="py-3.5 px-4 font-mono text-gray-400">{sess.ip_address || '-'}</td>
                            <td className="py-3.5 px-4 text-gray-300">{formatLastSeen(sess.last_active_at)}</td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/10 text-gray-300">
                                {sess.is_active ? 'Aktif' : 'Berakhir'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================
          MODALS (Read-Only)
         ======================================================== */}
      {/* Detail Siswa Modal */}
      <StudentDetailModal
        isOpen={studentDetailModalOpen}
        onClose={() => setStudentDetailModalOpen(false)}
        studentId={selectedStudentId}
      />

      {/* Preview Foto */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Leaflet Map Modal */}
      {mapModal.isOpen && (
        <LeafletMapModal
          isOpen={mapModal.isOpen}
          onClose={() => setMapModal({ ...mapModal, isOpen: false })}
          lat={mapModal.lat}
          lng={mapModal.lng}
          title={mapModal.title}
          address={mapModal.address}
        />
      )}
    </div>
  )
}

export default function PembimbingPage() {
  return (
    <ToastProvider>
      <PembimbingPortalContent />
    </ToastProvider>
  )
}
