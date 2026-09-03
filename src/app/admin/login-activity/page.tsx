'use client'

import React, { useEffect, useState } from 'react'
import {
  Smartphone,
  Laptop,
  Tablet,
  ShieldAlert,
  Search,
  Clock,
  Globe,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { formatLastSeen, formatDate, formatTime } from '@/lib/utils'
import { useToast, ToastProvider } from '@/components/Toast'

function LoginActivityPageContent() {
  const { showToast } = useToast()
  const [sessions, setSessions] = useState<any[]>([])
  const [multiDeviceAlerts, setMultiDeviceAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active'>('all')
  const [search, setSearch] = useState('')

  const loadSessions = async () => {
    try {
      const url = activeFilter === 'active' ? '/api/sessions?active=true' : '/api/sessions'
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        setSessions(json.sessions || [])
        setMultiDeviceAlerts(json.multiDeviceAlerts || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadSessions()
    const interval = setInterval(loadSessions, 30000)
    return () => clearInterval(interval)
  }, [activeFilter])

  const handleManualRefresh = () => {
    setRefreshing(true)
    loadSessions()
  }

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Akhiri sesi login perangkat ini? Pengguna akan keluar dari sistem di perangkat tersebut.')) {
      return
    }

    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast('Sesi perangkat berhasil diakhiri', 'success')
        loadSessions()
      } else {
        throw new Error('Gagal mengakhiri sesi')
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleTerminateAllUserSessions = async (userId: string, userName: string) => {
    if (!confirm(`Akhiri SELURUH sesi perangkat untuk siswa "${userName}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/sessions?userId=${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast(`Seluruh sesi ${userName} berhasil diakhiri`, 'success')
        loadSessions()
      } else {
        throw new Error('Gagal mengakhiri sesi pengguna')
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-emerald-400" />
      case 'tablet':
        return <Tablet className="w-4 h-4 text-purple-400" />
      default:
        return <Laptop className="w-4 h-4 text-indigo-400" />
    }
  }

  const filtered = sessions.filter((s) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = s.users?.full_name?.toLowerCase().includes(q)
      const matchEmail = s.users?.email?.toLowerCase().includes(q)
      const matchIp = s.ip_address?.toLowerCase().includes(q)
      const matchBrowser = s.browser?.toLowerCase().includes(q)
      const matchOs = s.os?.toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchIp && !matchBrowser && !matchOs) return false
    }
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="glass-card p-6 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <Smartphone className="w-4 h-4" />
            <span>Audit Keamanan & Perangkat</span>
          </div>
          <h1 className="text-2xl font-black text-white">Aktivitas Login Siswa</h1>
          <p className="text-xs text-gray-400 mt-1">
            Pencatatan jenis perangkat, sistem operasi, browser, IP address, dan deteksi multi-perangkat
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="btn-outline text-xs py-2.5 px-4 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Memperbarui...' : 'Perbarui Data'}</span>
        </button>
      </div>

      {/* Multi-Device Warning Alerts Section (Fitur 15) */}
      {multiDeviceAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Peringatan Deteksi Multi-Perangkat Aktif Bersamaan ({multiDeviceAlerts.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {multiDeviceAlerts.map((alert: any) => (
              <div
                key={alert.user_id}
                className="glass-card p-4 border border-amber-500/30 bg-amber-500/5 rounded-2xl flex flex-col justify-between gap-3 shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      <h4 className="font-bold text-sm text-white">{alert.user_name}</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      {alert.sessions.length} Perangkat Aktif
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 mb-2">
                    Akun ini sedang aktif diakses secara bersamaan pada:
                  </p>

                  <div className="space-y-1.5 text-xs">
                    {alert.sessions.map((sess: any) => (
                      <div
                        key={sess.id}
                        className="p-2 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(sess.device_type)}
                          <span className="font-medium text-white">
                            {sess.device_type} · {sess.os} ({sess.browser})
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {sess.ip_address || '127.0.0.1'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-500/20 flex justify-end">
                  <button
                    onClick={() => handleTerminateAllUserSessions(alert.user_id, alert.user_name)}
                    className="btn-outline border-rose-500/40 text-rose-400 hover:bg-rose-500/15 text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Putuskan Seluruh Sesi Siswa Ini</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="glass-card p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs self-start">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Semua Riwayat Sesi
          </button>
          <button
            onClick={() => setActiveFilter('active')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeFilter === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Hanya Sesi Aktif
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari siswa / OS / browser / IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field text-xs pl-9 w-full"
          />
        </div>
      </div>

      {/* Sessions Table */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-xs">Memuat data aktivitas login...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
          <Smartphone className="w-8 h-8 opacity-20" />
          <span>Tidak ada riwayat sesi ditemukan.</span>
        </div>
      ) : (
        <div className="glass-card border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold bg-black/30">
                  <th className="py-3.5 px-4">Pengguna</th>
                  <th className="py-3.5 px-4">Perangkat & OS</th>
                  <th className="py-3.5 px-4">Browser</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Terakhir Aktif</th>
                  <th className="py-3.5 px-4">Status Sesi</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{s.users?.full_name || 'Siswa'}</p>
                      <p className="text-[10px] text-gray-400">{s.users?.email}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(s.device_type)}
                        <div>
                          <p className="font-medium text-gray-200">{s.device_type || 'Desktop'}</p>
                          <p className="text-[10px] text-gray-400">{s.os || 'Lainnya'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-gray-300">
                      <span>{s.browser || 'Browser Standar'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {s.ip_address || '127.0.0.1'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-300">
                      <p>{formatLastSeen(s.last_active_at)}</p>
                      <p className="text-[10px] text-gray-500">
                        Login: {formatDate(s.login_at)}, {formatTime(s.login_at)}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase inline-flex items-center gap-1 ${
                          s.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            s.is_active ? 'bg-emerald-400' : 'bg-slate-400'
                          }`}
                        />
                        {s.is_active ? 'Aktif' : 'Berakhir'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {s.is_active && (
                        <button
                          onClick={() => handleTerminateSession(s.id)}
                          className="btn-outline border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-[11px] py-1 px-2.5"
                          title="Cabut sesi ini"
                        >
                          Cabut
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginActivityPage() {
  return (
    <ToastProvider>
      <LoginActivityPageContent />
    </ToastProvider>
  )
}
