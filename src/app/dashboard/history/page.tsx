'use client'

import React, { useEffect, useState, useCallback } from 'react'
import StudentNavbar from '@/components/StudentNavbar'
import MobileBottomNav from '@/components/MobileBottomNav'
import LeafletMapModal from '@/components/LeafletMapModal'

import {
  formatDate,
  formatTime,
  getStatusBadge,
  getStatusEmoji,
  getStatusLabel,
  MONTH_NAMES,
} from '@/lib/utils'
import { Calendar, Filter, MapPin, Eye, Clock, CheckCircle2, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/Toast'

export default function StudentHistoryPage() {
  const { showToast } = useToast()
  const [attendances, setAttendances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const currentYear = new Date().getFullYear().toString()
  const currentMonth = (new Date().getMonth() + 1).toString()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  // Modals
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

  const [photoModal, setPhotoModal] = useState<{
    isOpen: boolean
    url: string
    title: string
  }>({
    isOpen: false,
    url: '',
    title: '',
  })

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL('/api/attendance/history', window.location.origin)
      if (selectedYear) url.searchParams.set('year', selectedYear)
      if (selectedMonth) url.searchParams.set('month', selectedMonth)

      const res = await fetch(url.toString())
      if (res.ok) {
        const json = await res.json()
        setAttendances(json.attendances || [])
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadHistory()
    setRefreshing(false)
    showToast('Riwayat absensi berhasil diperbarui!', 'success')
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 pb-safe-nav">
      <StudentNavbar />

      <main className="max-w-3xl mx-auto px-4 pt-4 sm:pt-6 flex flex-col gap-5">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Riwayat Absensi Saya
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Catatan lengkap kehadiran dan kepatuhan jam kerja PKL Anda
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40 self-start sm:self-auto active:scale-95 transition rounded-xl"
            title="Perbarui riwayat absensi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>
        </div>

        {/* Filters: Month Selector Pills & Year */}
        <div className="glass-card p-4 border border-white/10 rounded-2xl flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-300 font-semibold">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Filter Periode:</span>
            </div>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input-field py-1.5 px-3 text-xs w-auto bg-black/40 border-white/10 rounded-xl"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          {/* Horizontal scrollable month pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
            <button
              onClick={() => setSelectedMonth('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                selectedMonth === ''
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              Semua
            </button>
            {MONTH_NAMES.map((name, idx) => {
              const val = (idx + 1).toString()
              const isSelected = selectedMonth === val
              return (
                <button
                  key={val}
                  onClick={() => setSelectedMonth(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        {/* History Records List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-5 h-24 skeleton rounded-2xl" />
            ))}
          </div>
        ) : attendances.length === 0 ? (
          <div className="glass-card p-12 text-center border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">📅</span>
            <p className="font-bold text-white text-sm">Belum Ada Catatan</p>
            <p className="text-xs text-gray-400">Tidak ada data absensi untuk bulan/tahun yang dipilih.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {attendances.map((item) => {
              const checkInPhoto = item.attendance_photos?.find((p: any) => p.type === 'check_in')
              const checkOutPhoto = item.attendance_photos?.find((p: any) => p.type === 'check_out')

              return (
                <div
                  key={item.id}
                  className="glass-card p-4 sm:p-5 border border-white/10 rounded-2xl hover:border-indigo-500/30 transition shadow-lg flex flex-col gap-3"
                >
                  {/* Top Bar: Date & Status Badge */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs sm:text-sm font-bold text-white">
                        {formatDate(item.date)}
                      </span>
                    </div>
                    <div className={`badge text-[11px] ${getStatusBadge(item.check_in_status)}`}>
                      <span>{getStatusEmoji(item.check_in_status)}</span>
                      <span>{getStatusLabel(item.check_in_status)}</span>
                    </div>
                  </div>

                  {/* Times & Photos Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Check In Info */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                          Masuk
                        </span>
                        <div className="text-base font-black text-white mt-0.5">
                          {item.check_in_time ? formatTime(item.check_in_time) : '--:--'}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                        {checkInPhoto && (
                          <button
                            onClick={() =>
                              setPhotoModal({
                                isOpen: true,
                                url: checkInPhoto.photo_url,
                                title: `Foto Masuk · ${formatDate(item.date)}`,
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition"
                          >
                            <Eye className="w-3 h-3" /> Foto
                          </button>
                        )}
                        {item.check_in_lat && item.check_in_lng && (
                          <button
                            onClick={() =>
                              setMapModal({
                                isOpen: true,
                                lat: item.check_in_lat,
                                lng: item.check_in_lng,
                                title: `Lokasi Masuk · ${formatDate(item.date)}`,
                                address: item.check_in_address,
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition"
                          >
                            <MapPin className="w-3 h-3" /> Peta
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Check Out Info */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                          Pulang
                        </span>
                        <div className="text-base font-black text-white mt-0.5">
                          {item.check_out_time ? formatTime(item.check_out_time) : '--:--'}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                        {checkOutPhoto && (
                          <button
                            onClick={() =>
                              setPhotoModal({
                                isOpen: true,
                                url: checkOutPhoto.photo_url,
                                title: `Foto Pulang · ${formatDate(item.date)}`,
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition"
                          >
                            <Eye className="w-3 h-3" /> Foto
                          </button>
                        )}
                        {item.check_out_lat && item.check_out_lng && (
                          <button
                            onClick={() =>
                              setMapModal({
                                isOpen: true,
                                lat: item.check_out_lat,
                                lng: item.check_out_lng,
                                title: `Lokasi Pulang · ${formatDate(item.date)}`,
                                address: item.check_out_address,
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition"
                          >
                            <MapPin className="w-3 h-3" /> Peta
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.note && (
                    <div className="text-[11px] text-gray-400 bg-black/20 p-2.5 rounded-xl border border-white/5">
                      Catatan: {item.note}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Map Modal */}
      <LeafletMapModal
        isOpen={mapModal.isOpen}
        onClose={() => setMapModal((prev) => ({ ...prev, isOpen: false }))}
        lat={mapModal.lat}
        lng={mapModal.lng}
        title={mapModal.title}
        address={mapModal.address}
      />

      {/* Photo Modal */}
      {photoModal.isOpen && (
        <div className="modal-overlay" onClick={() => setPhotoModal({ isOpen: false, url: '', title: '' })}>
          <div
            className="glass-card p-4 max-w-sm w-full border border-white/10 rounded-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-3 border-b border-white/10 mb-3">
              <h4 className="text-xs font-bold text-white">{photoModal.title}</h4>
              <button
                onClick={() => setPhotoModal({ isOpen: false, url: '', title: '' })}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white text-xs transition"
              >
                ✕
              </button>
            </div>
            <img
              src={photoModal.url}
              alt="Bukti Foto"
              className="w-full max-h-[350px] object-cover rounded-xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (< lg) */}
      <MobileBottomNav />
    </div>
  )
}
