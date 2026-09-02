'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  UserX,
  LogOut,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Plus,
  FileSpreadsheet,
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
  Legend,
} from 'recharts'
import { formatDate, formatTime, getStatusBadge, getStatusEmoji } from '@/lib/utils'

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    // Auto-refresh stats every 30 seconds for live monitoring
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [loadStats])

  const handleManualRefresh = () => {
    setRefreshing(true)
    loadStats()
  }

  const stats = data?.stats
  const weeklyTrend = data?.weeklyTrend || []
  const recentActivities = data?.recentActivities || []

  // Donut chart data
  const pieData = [
    { name: 'Tepat Waktu', value: stats?.onTimeToday || 0, color: '#10b981' },
    { name: 'Terlambat', value: stats?.lateToday || 0, color: '#f59e0b' },
    { name: 'Alpha', value: stats?.alphaToday || 0, color: '#ef4444' },
    { name: 'Belum Absen', value: stats?.notCheckedIn || 0, color: '#475569' },
  ].filter((d) => d.value > 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="glass-card p-6 border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="orb orb-purple w-56 h-56 top-[-30px] right-[-30px]" />

        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Real-time Monitoring Absensi</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white">
            Dashboard Superadmin
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {formatDate(new Date())} · Sistem Absensi PKL Kominfo Tanggamus
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap relative z-10">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link href="/admin/students" className="btn-primary text-xs py-2 px-3">
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Siswa</span>
          </Link>

          <Link href="/admin/export" className="btn-outline text-xs py-2 px-3">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Rekap</span>
          </Link>
        </div>
      </div>

      {/* Primary Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Siswa */}
        <div className="glass-card p-4 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Total Siswa</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-white">{stats?.totalStudents ?? 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Peserta PKL Aktif</p>
          </div>
        </div>

        {/* Hadir Hari Ini */}
        <div className="glass-card p-4 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Hadir Hari Ini</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-emerald-400">{stats?.presentToday ?? 0}</p>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">
              {stats?.attendanceRate ?? 0}% Tingkat Kehadiran
            </p>
          </div>
        </div>

        {/* Tepat Waktu */}
        <div className="glass-card p-4 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Tepat Waktu</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-emerald-400">{stats?.onTimeToday ?? 0}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Absen ≤ 07:30 WIB</p>
          </div>
        </div>

        {/* Terlambat */}
        <div className="glass-card p-4 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Terlambat</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-amber-400">{stats?.lateToday ?? 0}</p>
            <p className="text-[10px] text-amber-400/80 mt-0.5">
              {stats?.lateRate ?? 0}% dari yang hadir
            </p>
          </div>
        </div>

        {/* Alpha */}
        <div className="glass-card p-4 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">Alpha</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-rose-400">{stats?.alphaToday ?? 0}</p>
            <p className="text-[10px] text-rose-400/80 mt-0.5">
              {stats?.alphaRate ?? 0}% Tingkat Alpha
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Quick Indicators */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Sudah Absen Masuk</span>
          <span className="text-sm font-bold text-white">{stats?.checkedInToday ?? 0}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Sudah Absen Pulang</span>
          <span className="text-sm font-bold text-white">{stats?.checkedOutToday ?? 0}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">Belum Absen</span>
          <span className="text-sm font-bold text-gray-300">{stats?.notCheckedIn ?? 0}</span>
        </div>
      </div>

      {/* Charts & Live Feed Section */}
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
                Perbandingan siswa tepat waktu, terlambat, dan alpha
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

          <div className="h-48 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
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

      {/* Real-time Activity Stream */}
      <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white">
              Aktivitas Absensi Real-time Hari Ini
            </h3>
          </div>
          <Link
            href="/admin/attendances"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Belum ada aktivitas absensi tercatat hari ini.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentActivities.map((act: any) => {
              const name = act.users?.full_name || 'Peserta Didik'
              const isCheckout = !!act.check_out_time && !act.check_in_time

              return (
                <div key={act.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{name}</p>
                      <p className="text-[11px] text-gray-400">
                        {act.check_out_time
                          ? `Melakukan absensi pulang pada ${formatTime(act.check_out_time)}`
                          : `Melakukan absensi masuk pada ${formatTime(act.check_in_time)}`}
                      </p>
                    </div>
                  </div>

                  <div className={`badge text-[10px] ${getStatusBadge(act.check_in_status)}`}>
                    <span>{getStatusEmoji(act.check_in_status)}</span>
                    <span className="hidden sm:inline">
                      {act.check_in_status === 'on_time'
                        ? 'Tepat Waktu'
                        : act.check_in_status === 'late'
                        ? 'Terlambat'
                        : 'Alpha'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
