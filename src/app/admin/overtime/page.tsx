'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Zap,
  Clock,
  Users,
  Building,
  Search,
  Calendar,
  Download,
  RefreshCw,
  Pencil,
  X,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { formatDate, formatTime, formatOvertimeDuration, formatOvertimeShort } from '@/lib/utils'
import { useToast, ToastProvider } from '@/components/Toast'

function OvertimeAdminPageContent() {
  const { showToast } = useToast()

  const [overtimes, setOvertimes] = useState<any[]>([])
  const [places, setPlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedPlaceId, setSelectedPlaceId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Edit Overtime Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [editHours, setEditHours] = useState<number>(0)
  const [editMinutesPart, setEditMinutesPart] = useState<number>(0)
  const [editNotes, setEditNotes] = useState<string>('')
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // Fetch places for filter dropdown
  const loadPlaces = async () => {
    try {
      const res = await fetch('/api/internship-places')
      if (res.ok) {
        const json = await res.json()
        setPlaces(json.places || json.data || [])
      }
    } catch (e) {
      console.error('Failed to load places:', e)
    }
  }

  // Fetch overtime data with query params
  const loadOvertimes = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedPlaceId) params.append('place_id', selectedPlaceId)
      if (search) params.append('search', search)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const res = await fetch(`/api/overtime?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setOvertimes(json.overtimes || [])
      }
    } catch (err) {
      console.error('Failed to load overtime records:', err)
      showToast('Gagal memuat data lembur', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedPlaceId, search, startDate, endDate, showToast])

  useEffect(() => {
    loadPlaces()
  }, [])

  useEffect(() => {
    loadOvertimes()
  }, [loadOvertimes])

  const handleRefresh = () => {
    setRefreshing(true)
    loadOvertimes()
  }

  const handleResetFilters = () => {
    setSearch('')
    setSelectedPlaceId('')
    setStartDate('')
    setEndDate('')
  }

  // Edit Handlers
  const handleOpenEdit = (item: any) => {
    setSelectedItem(item)
    const totalMinutes = item.overtime_minutes || 0
    setEditHours(Math.floor(totalMinutes / 60))
    setEditMinutesPart(totalMinutes % 60)
    setEditNotes(item.overtime_notes || '')
    setEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    setSubmittingEdit(true)

    try {
      const computedMinutes = (Number(editHours) || 0) * 60 + (Number(editMinutesPart) || 0)
      const res = await fetch(`/api/overtime/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overtime_minutes: computedMinutes,
          overtime_notes: editNotes,
          is_overtime: computedMinutes > 0,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui lembur')

      showToast('Data lembur berhasil diperbarui!', 'success')
      setEditModalOpen(false)
      loadOvertimes()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (overtimes.length === 0) {
      showToast('Tidak ada data lembur untuk diexport', 'error')
      return
    }

    const headers = [
      'No',
      'Nama Siswa',
      'Email / Akun',
      'Kelas',
      'Jurusan',
      'Tempat PKL',
      'Tanggal',
      'Jam Masuk',
      'Jam Pulang',
      'Durasi Lembur (Menit)',
      'Durasi Lembur (Format)',
      'Catatan Lembur',
    ]

    const rows = overtimes.map((item, idx) => {
      const u = item.users || {}
      const placeName = u.internship_places?.name || '-'
      const durasiFormat = formatOvertimeDuration(item.overtime_minutes)

      return [
        idx + 1,
        `"${(u.full_name || '').replace(/"/g, '""')}"`,
        `"${(u.email || '').replace(/"/g, '""')}"`,
        `"${(u.class_name || '-').replace(/"/g, '""')}"`,
        `"${(u.major || '-').replace(/"/g, '""')}"`,
        `"${placeName.replace(/"/g, '""')}"`,
        `"${item.date || '-'}"`,
        `"${item.check_in_time ? formatTime(item.check_in_time) : '-'}"`,
        `"${item.check_out_time ? formatTime(item.check_out_time) : '-'}"`,
        item.overtime_minutes || 0,
        `"${durasiFormat}"`,
        `"${(item.overtime_notes || '-').replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Rekap_Lembur_Siswa_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast('Rekap data lembur berhasil diunduh (CSV)!', 'success')
  }

  // Calculated Stats
  const totalMinutesSum = overtimes.reduce((acc, cur) => acc + (cur.overtime_minutes || 0), 0)
  const uniqueStudentsCount = new Set(overtimes.map((o) => o.user_id)).size
  const avgMinutes = overtimes.length > 0 ? Math.round(totalMinutesSum / overtimes.length) : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Rekap Lembur Siswa
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold font-mono">
                  Superadmin
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Monitoring seluruh sesi lembur siswa PKL lintas instansi, verifikasi jam pulang, dan koreksi durasi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline flex items-center gap-2 py-2 px-3 text-xs"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-primary bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-2 px-4 text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-orange-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Total Sesi Lembur</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white">{overtimes.length}</div>
          <p className="text-[11px] text-gray-400 mt-1">Sesi checkout lembur tercatat</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-950/20 to-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Akumulasi Lembur</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">
            {formatOvertimeShort(totalMinutesSum)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{totalMinutesSum} total menit dihitung</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-indigo-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Siswa Berpartisipasi</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-300">{uniqueStudentsCount}</div>
          <p className="text-[11px] text-gray-400 mt-1">Siswa aktif yang pernah lembur</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-teal-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Rata-rata per Sesi</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-300">
            {formatOvertimeShort(avgMinutes)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Rerata durasi kerja ekstra</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 border-b border-white/5 pb-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
          <span>Filter & Pencarian Data Lembur</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari siswa, kelas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Place Filter */}
          <div className="relative">
            <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <select
              value={selectedPlaceId}
              onChange={(e) => setSelectedPlaceId(e.target.value)}
              className="input-field pl-9 text-xs appearance-none"
            >
              <option value="">Semua Tempat PKL</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field pl-9 text-xs"
              placeholder="Dari Tanggal"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field pl-9 text-xs"
                placeholder="Sampai Tanggal"
              />
            </div>
            {(search || selectedPlaceId || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                title="Reset Filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Overtime Table */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-white text-sm sm:text-base">Daftar Kehadiran Lembur</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-300 font-mono">
            {overtimes.length} Data Ditampilkan
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-400">Memuat catatan lembur...</p>
          </div>
        ) : overtimes.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-white text-base">Tidak Ada Data Lembur</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              Tidak ditemukan data lembur untuk kriteria filter ini. Siswa yang absen pulang melewati jam lembur instansi akan otomatis muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">No</th>
                  <th className="py-3.5 px-4">Siswa</th>
                  <th className="py-3.5 px-4">Tempat PKL</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Jam Hadir</th>
                  <th className="py-3.5 px-4">Durasi Lembur</th>
                  <th className="py-3.5 px-4">Catatan</th>
                  <th className="py-3.5 px-4 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {overtimes.map((item, idx) => {
                  const student = item.users || {}
                  const placeName = student.internship_places?.name || '-'
                  const durasiText = formatOvertimeDuration(item.overtime_minutes)

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 text-gray-500 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {(student.full_name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white">{student.full_name || '-'}</div>
                            <div className="text-[11px] text-gray-400">
                              {student.class_name || '-'} {student.major ? `• ${student.major}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-gray-300">
                          <Building className="w-3 h-3 text-purple-400 flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{placeName}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-300">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-gray-300">
                          Masuk:{' '}
                          <span className="font-mono text-white">
                            {item.check_in_time ? formatTime(item.check_in_time) : '-'}
                          </span>
                        </div>
                        <div className="text-gray-300">
                          Pulang:{' '}
                          <span className="font-mono text-amber-300 font-bold">
                            {item.check_out_time ? formatTime(item.check_out_time) : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold font-mono text-xs">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {durasiText}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        {item.overtime_notes ? (
                          <p className="text-gray-300 text-[11px] line-clamp-2">
                            {item.overtime_notes}
                          </p>
                        ) : (
                          <span className="text-gray-500 italic text-[11px]">Tidak ada catatan</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition shadow-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit Lembur</span>
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

      {/* Edit Overtime Modal (Superadmin / Pembimbing) */}
      {editModalOpen && selectedItem && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-amber-500/30 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Edit Lembur Siswa (Superadmin)</h3>
                  <p className="text-[11px] text-gray-400">Koreksi perhitungan jam & catatan lembur</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Summary */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Siswa:</span>
                  <span className="font-bold text-white">{selectedItem.users?.full_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Instansi:</span>
                  <span className="text-gray-300">{selectedItem.users?.internship_places?.name || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tanggal Absen:</span>
                  <span className="font-medium text-gray-200">{formatDate(selectedItem.date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Jam Check-Out:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {selectedItem.check_out_time ? formatTime(selectedItem.check_out_time) : '-'}
                  </span>
                </div>
              </div>

              {/* Input Jam & Menit */}
              <div>
                <label className="block text-gray-300 font-semibold mb-2">Durasi Lembur yang Dihitung</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Jumlah Jam</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={editHours}
                        onChange={(e) => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className="input-field text-sm font-mono pr-10"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">Jam</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Jumlah Menit (0-59)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={editMinutesPart}
                        onChange={(e) =>
                          setEditMinutesPart(
                            Math.min(59, Math.max(0, parseInt(e.target.value) || 0))
                          )
                        }
                        className="input-field text-sm font-mono pr-12"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">Menit</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-amber-300/90 mt-1.5 font-mono">
                  Total durasi:{' '}
                  <strong>
                    {(Number(editHours) || 0) * 60 + (Number(editMinutesPart) || 0)} Menit
                  </strong>{' '}
                  ({editHours} Jam {editMinutesPart} Menit)
                </p>
              </div>

              {/* Catatan Admin / Pembimbing */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Catatan / Keterangan Lembur
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Keterangan lembur atau catatan penyesuaian durasi..."
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] leading-relaxed">
                Tindakan ini memiliki hak akses penuh Superadmin dan perubahannya akan otomatis dicatat di audit logs.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="btn-primary bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-2 px-5 text-xs shadow-lg shadow-amber-500/25"
                >
                  {submittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OvertimeAdminPage() {
  return (
    <ToastProvider>
      <OvertimeAdminPageContent />
    </ToastProvider>
  )
}
