'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  AlertTriangle,
  UserX,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Building,
  FileText,
  Smartphone,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Radio,
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
} from '@/lib/utils'
import StudentDetailModal from '@/components/StudentDetailModal'
import { useToast } from '@/components/Toast'
import { cachedFetch, invalidateCache } from '@/lib/apiCache'

export default function AdminDashboardPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<any>(null)
  const [networkData, setNetworkData] = useState<any>(null)
  const [pingingNetwork, setPingingNetwork] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadStats = useCallback(async (forceFresh = false) => {
    try {
      const [json, netRes] = await Promise.all([
        cachedFetch('/api/admin/stats', undefined, 15000, forceFresh),
        fetch('/api/network/hosts').then((r) => r.json()).catch(() => null),
      ])
      setData(json)
      if (netRes && netRes.success && netRes.data) {
        setNetworkData(netRes.data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const handleQuickPing = async () => {
    try {
      setPingingNetwork(true)
      showToast('Memulai pengecekan ping 69 host Tanggamus...', 'info')
      const res = await fetch('/api/network/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, sendAlerts: true }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setNetworkData(json.data)
        showToast(`Ping selesai: ${json.data.summary.online} Online, ${json.data.summary.down} Down`, 'success')
      }
    } catch (e: any) {
      showToast('Gagal ping jaringan: ' + e.message, 'error')
    } finally {
      setPingingNetwork(false)
    }
  }

  useEffect(() => {
    loadStats()
    // Auto-refresh stats every 25 seconds for live real-time presence & attendance monitoring
    const interval = setInterval(() => loadStats(true), 25000)
    return () => clearInterval(interval)
  }, [loadStats])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    invalidateCache('/api/admin/stats')
    await loadStats(true)
    showToast('Data monitoring berhasil diperbarui!', 'success')
  }

  const handleOpenStudentDetail = (id: string) => {
    setSelectedStudentId(id)
    setModalOpen(true)
  }

  const stats = data?.stats
  const students = data?.students || []
  const weeklyTrend = data?.weeklyTrend || []
  const multiDeviceAlerts = data?.multiDeviceAlerts || []

  // Donut chart data
  const pieData = [
    { name: 'Tepat Waktu', value: stats?.onTimeToday || 0, color: '#10b981' },
    { name: 'Terlambat', value: stats?.lateToday || 0, color: '#f59e0b' },
    { name: 'Izin', value: stats?.izinToday || 0, color: '#3b82f6' },
    { name: 'Sakit', value: stats?.sakitToday || 0, color: '#a855f7' },
    { name: 'Alpha', value: stats?.alphaToday || 0, color: '#ef4444' },
    { name: 'Belum Absen', value: stats?.notCheckedIn || 0, color: '#475569' },
  ].filter((d) => d.value > 0)

  // Filter students by presence and search query
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

  const networkSummary = networkData?.summary
  const downHostsPreview = (networkData?.hosts || []).filter((h: any) => h.status === 'DOWN')

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="glass-card p-6 border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="orb orb-purple w-56 h-56 top-[-30px] right-[-30px]" />

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Pusat Monitoring Siswa & Real-time Presence</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white">
            Dashboard Superadmin
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(new Date())} · Sistem Monitoring PKL & Kedisiplinan Siswa
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap relative z-10">
          <Link
            href="/admin/students?action=create"
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-lg shadow-indigo-500/25 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl"
            title="Buatkan akun username & password untuk siswa baru"
          >
            <UserPlus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>+ Buat Akun Siswa</span>
          </Link>

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
            title="Refresh data sekarang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>

          <Link href="/admin/permits" className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl border-white/10 hover:border-indigo-500/40">
            <FileText className="w-3.5 h-3.5" />
            <span>Review Izin</span>
          </Link>

          <Link
            href="/admin/monitoring-ip"
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 font-semibold rounded-xl"
            title="Buka Monitoring IP 69 Host Tanggamus"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Monitoring IP</span>
          </Link>
        </div>
      </div>

      {/* Multi-Device Warning Alert (Fitur 15) */}
      {multiDeviceAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                Peringatan: Satu Akun Aktif di Beberapa Perangkat Bersamaan
              </h4>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Terdeteksi {multiDeviceAlerts.length} siswa login pada lebih dari satu perangkat secara aktif (contoh: HP dan Laptop):{' '}
                <span className="font-semibold text-white">
                  {multiDeviceAlerts.map((a: any) => a.user_name).join(', ')}
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/admin/login-activity"
            className="btn-outline text-xs py-2 px-3 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 whitespace-nowrap self-start sm:self-auto"
          >
            Kelola Sesi Perangkat
          </Link>
        </div>
      )}

      {/* Widget Monitoring IP Jaringan Tanggamus (69 Host) */}
      <div className="glass-card p-5 border border-emerald-500/20 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-emerald-950/25 rounded-2xl relative overflow-hidden shadow-xl animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white tracking-wide">
                  Monitoring IP Jaringan Tanggamus
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  69 Host Real-time
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  NOC Telegram 24/7
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pemantauan 69 IP ONU OPD & Pengecekan ICMP Ping Otomatis Setiap 60 Detik
              </p>
            </div>
          </div>

          {/* Metric badges & quick action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono font-bold text-emerald-400">
                {networkSummary?.online ?? 0} Online
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-xs font-mono font-bold text-rose-400">
                {networkSummary?.down ?? 0} Down
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 hidden sm:flex items-center gap-1.5 text-xs text-slate-300 font-mono">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>{networkSummary?.avgLatency ?? 0} ms</span>
            </div>

            <button
              onClick={handleQuickPing}
              disabled={pingingNetwork}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
              title="Ping 69 host sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pingingNetwork ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>{pingingNetwork ? 'Mengeping...' : 'Ping Cepat'}</span>
            </button>

            <Link
              href="/admin/monitoring-ip"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <span>Buka Menu Monitoring IP</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* If any hosts are down, show quick alert preview */}
        {networkSummary?.down > 0 && downHostsPreview.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Host Padam Terdeteksi ({downHostsPreview.length}):{' '}
                <b className="text-white font-medium">
                  {downHostsPreview.slice(0, 4).map((h: any) => h.name).join(', ')}
                  {downHostsPreview.length > 4 ? ` (+${downHostsPreview.length - 4} lainnya)` : ''}
                </b>
              </span>
            </div>
            <Link
              href="/admin/monitoring-ip"
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1 shrink-0"
            >
              Lihat Detail & Tindak Lanjut ➔
            </Link>
          </div>
        )}
      </div>

      {/* Top 9 Statistics Grid (Fitur 11) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Siswa */}
        <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] text-gray-400 font-semibold uppercase">Total Siswa</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{stats?.totalStudents ?? 0}</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        {/* Siswa Online (Fitur 8) */}
        <div className="glass-card p-4 border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
          <span className="text-[11px] text-emerald-400 font-semibold uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">{stats?.onlineStudents ?? 0}</span>
            <span className="text-[10px] text-gray-400">Aktif web</span>
          </div>
        </div>

        {/* Siswa Offline */}
        <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] text-gray-400 font-semibold uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Offline
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-gray-300">{stats?.offlineStudents ?? 0}</span>
            <span className="text-[10px] text-gray-500">Tidak aktif</span>
          </div>
        </div>

        {/* Hadir Hari Ini */}
        <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] text-gray-400 font-semibold uppercase">Hadir Hari Ini</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{stats?.presentToday ?? 0}</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Terlambat */}
        <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
          <span className="text-[11px] text-gray-400 font-semibold uppercase">Terlambat</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{stats?.lateToday ?? 0}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* Izin */}
        <div className="glass-card p-4 border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between">
          <span className="text-[11px] text-blue-400 font-semibold uppercase">Izin</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-blue-400">{stats?.izinToday ?? 0}</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
        </div>

        {/* Sakit */}
        <div className="glass-card p-4 border border-purple-500/20 bg-purple-500/5 flex flex-col justify-between">
          <span className="text-[11px] text-purple-400 font-semibold uppercase">Sakit</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-purple-400">{stats?.sakitToday ?? 0}</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
        </div>

        {/* Alfa */}
        <div className="glass-card p-4 border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between">
          <span className="text-[11px] text-rose-400 font-semibold uppercase">Alfa</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-400">{stats?.alphaToday ?? 0}</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        {/* Belum Absen */}
        <div className="glass-card p-4 border border-white/10 flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-[11px] text-gray-400 font-semibold uppercase">Belum Absen</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-gray-400">{stats?.notCheckedIn ?? 0}</span>
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
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

      {/* Live Student Monitoring Section (Fitur 8, 9, 10, 11) */}
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

          {/* Presence Filter Badges (Fitur 10) */}
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
                Online ({stats?.onlineStudents ?? 0})
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
                Offline ({stats?.offlineStudents ?? 0})
              </button>
            </div>
          </div>
        </div>

        {/* Student Table / Cards (Fitur 11 & 12) */}
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
                                s.full_name.charAt(0).toUpperCase()
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
                              {s.class_name || 'Kelas -'} • {s.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Tempat PKL & Pembimbing */}
                      <td className="py-3 px-3">
                        <p className="font-medium text-gray-200 truncate max-w-[180px]">
                          {s.internship_places?.name || '-'}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[180px]">
                          Bim: {s.mentor?.full_name || '-'}
                        </p>
                      </td>

                      {/* Status Presence (Fitur 8) */}
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

                      {/* Last Seen (Fitur 9) */}
                      <td className="py-3 px-3 text-gray-300">
                        <span className="text-[11px]">{formatLastSeen(s.last_seen)}</span>
                      </td>

                      {/* Status Absensi Hari Ini */}
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

                      {/* Aksi */}
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

      {/* Student Detail Modal (Fitur 12) */}
      <StudentDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        studentId={selectedStudentId}
      />
    </div>
  )
}
