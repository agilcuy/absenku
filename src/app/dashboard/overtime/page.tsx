'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import StudentNavbar from '@/components/StudentNavbar'
import MobileBottomNav from '@/components/MobileBottomNav'
import { ToastProvider, useToast } from '@/components/Toast'
import { formatDate, formatTime, formatOvertimeDuration, formatOvertimeShort } from '@/lib/utils'
import { Clock, Calendar, Zap, AlertCircle, ChevronLeft, RefreshCw, Building, ShieldCheck } from 'lucide-react'

function StudentOvertimeContent() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [overtimes, setOvertimes] = useState<any[]>([])
  const [stats, setStats] = useState<{ totalMinutes: number; totalHours: string; recordCount: number }>({
    totalMinutes: 0,
    totalHours: '0.0',
    recordCount: 0,
  })
  const [userProfile, setUserProfile] = useState<any>(null)

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch user profile
      const profRes = await fetch('/api/students/profile')
      if (profRes.ok) {
        const profJson = await profRes.json()
        setUserProfile(profJson.profile)
      }

      // 2. Fetch overtime records
      const res = await fetch('/api/overtime')
      if (res.ok) {
        const data = await res.json()
        setOvertimes(data.overtimes || [])
        if (data.stats) {
          setStats(data.stats)
        }
      }
    } catch (err) {
      console.error('Error loading overtime records:', err)
      showToast('Gagal memuat riwayat lembur', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    showToast('Data lembur diperbarui!', 'success')
  }

  const place = userProfile?.internship_places
  const overtimeStart = place?.overtime_start_time ? String(place.overtime_start_time).substring(0, 5) : '17:30'

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col pb-24 lg:pb-12">
      <StudentNavbar user={userProfile} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pt-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard"
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Beranda</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30 text-lg">
                ⚡
              </span>
              <span>Rekapitulasi Waktu Lembur</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Pencatatan waktu kerja tambahan di luar jam operasional reguler PKL.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2 px-3 self-start sm:self-auto flex items-center gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-amber-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>
        </div>

        {/* Schedule Info Box */}
        <div className="glass-card p-4 border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.08] to-orange-500/[0.04] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Aturan Lembur Instansi:</span>
                <span className="text-xs text-amber-300 font-semibold">{place?.name || 'Instansi PKL'}</span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Check-out di atas pukul <strong className="text-amber-300">{overtimeStart} WIB</strong> sampai dengan 24:00 (12 malam) dihitung otomatis sebagai jam lembur.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 self-start sm:self-center">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Tervalidasi Sistem</span>
          </span>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.03]">
            <span className="text-xs text-amber-300/80 font-semibold uppercase tracking-wider block">
              Total Jam Lembur
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-black text-amber-300">{stats.totalHours}</span>
              <span className="text-xs text-gray-400">Jam ({stats.totalMinutes} Menit)</span>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-white/10">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
              Frekuensi Lembur
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-black text-white">{stats.recordCount}</span>
              <span className="text-xs text-gray-400">Hari Kerja</span>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl border border-white/10">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">
              Status Hak Akses
            </span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-base font-bold text-emerald-400">Lihat Saja (Read-Only)</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Penyesuaian lembur dikelola resmi oleh Pembimbing & Superadmin.
            </p>
          </div>
        </div>

        {/* Overtime Records List */}
        <div className="glass-card border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Riwayat Kehadiran Lembur</h3>
            </div>
            <span className="text-xs text-gray-400">{overtimes.length} Riwayat</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
              <span>Memuat data lembur...</span>
            </div>
          ) : overtimes.length === 0 ? (
            <div className="py-16 px-4 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <div>
                <p className="text-base font-bold text-white">Belum Ada Riwayat Lembur</p>
                <p className="text-xs text-gray-400 max-w-md mt-1">
                  Ketika Anda melakukan absensi pulang di atas batas waktu kerja instansi ({overtimeStart} WIB), sistem akan otomatis mencatat durasi lembur Anda di sini.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="btn-primary bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-xs py-2 px-4 rounded-xl mt-2 font-bold shadow-lg shadow-amber-500/20"
              >
                Ke Halaman Absensi
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-semibold">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Jam Masuk</th>
                    <th className="py-3 px-4">Jam Pulang</th>
                    <th className="py-3 px-4">Durasi Lembur</th>
                    <th className="py-3 px-4">Catatan / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {overtimes.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-3.5 px-4 text-gray-300">
                        {item.check_in_time ? formatTime(item.check_in_time) : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-amber-200">
                        {item.check_out_time ? formatTime(item.check_out_time) : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <span>⚡</span>
                          <span>{formatOvertimeDuration(item.overtime_minutes)}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 max-w-xs truncate">
                        {item.overtime_notes || item.note || <span className="text-gray-600 italic">Otomatis tercatat</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

export default function StudentOvertimePage() {
  return (
    <ToastProvider>
      <StudentOvertimeContent />
    </ToastProvider>
  )
}
