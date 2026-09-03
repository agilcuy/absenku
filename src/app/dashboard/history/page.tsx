'use client'

import React, { useEffect, useState, useCallback } from 'react'
import StudentNavbar from '@/components/StudentNavbar'
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
    <div className="min-h-screen bg-[#06070d] text-slate-100 pb-20">
      <StudentNavbar />

      <main className="max-w-2xl mx-auto px-4 pt-6 flex flex-col gap-5">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Riwayat Absensi Saya
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Catatan lengkap kehadiran PKL Anda
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40 self-start sm:self-auto"
            title="Perbarui riwayat absensi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>
        </div>

        {/* Filters Card */}
        <div className="glass-card p-4 border border-white/10 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Filter:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field py-1.5 px-3 text-xs w-auto bg-black/40 border-white/10"
          >
            <option value="">Semua Bulan</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={(idx + 1).toString()}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="input-field py-1.5 px-3 text-xs w-auto bg-black/40 border-white/10"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>

        {/* History Records List */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-4 h-24 skeleton" />
            ))}
          </div>
        ) : attendances.length === 0 ? (
          <div className="glass-card p-8 text-center border border-white/5">
            <p className="text-sm text-gray-400">Belum ada catatan absensi untuk periode ini.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {attendances.map((item) => {
              const checkInPhoto = item.attendance_photos?.find((p: any) => p.type === 'check_in')
              const checkOutPhoto = item.attendance_photos?.find((p: any) => p.type === 'check_out')

              return (
                <div
                  key={item.id}
                  className="glass-card p-4 border border-white/10 hover:border-indigo-500/30 transition flex flex-col gap-3"
                >
                  {/* Top Bar: Date & Status Badge */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
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
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-medium">Masuk</span>
                        <p className="font-semibold text-white text-sm mt-0.5">
                          {item.check_in_time ? formatTime(item.check_in_time) : '-'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {checkInPhoto && (
                          <button
                            onClick={() =>
                              setPhotoModal({
                                isOpen: true,
                                url: checkInPhoto.photo_url,
                                title: `Foto Masuk · ${formatDate(item.date)}`,
                              })
                            }
                            className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[10px] flex items-center gap-1"
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
                            className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" /> Peta
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Check Out Info */}
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-medium">Pulang</span>
                        <p className="font-semibold text-white text-sm mt-0.5">
                          {item.check_out_time ? formatTime(item.check_out_time) : '-'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {checkOutPhoto && (
                          <button
                            onClick={() =>
                              setPhotoModal({
                                isOpen: true,
                                url: checkOutPhoto.photo_url,
                                title: `Foto Pulang · ${formatDate(item.date)}`,
                              })
                            }
                            className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[10px] flex items-center gap-1"
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
                            className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" /> Peta
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.note && (
                    <div className="text-[11px] text-gray-400 bg-black/20 p-2 rounded border border-white/5">
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
        <div className="modal-overlay">
          <div className="glass-card p-4 max-w-sm w-full border border-white/10 flex flex-col items-center">
            <div className="flex items-center justify-between w-full pb-3 border-b border-white/10 mb-3">
              <h4 className="text-xs font-semibold text-white">{photoModal.title}</h4>
              <button
                onClick={() => setPhotoModal({ isOpen: false, url: '', title: '' })}
                className="text-gray-400 hover:text-white text-xs"
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
    </div>
  )
}
