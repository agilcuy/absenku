'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ClipboardList,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  MapPin,
  Calendar,
  X,
  RefreshCw,
  Clock,
  User,
  AlertTriangle,
  FileText,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Building,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import LeafletMapModal from '@/components/LeafletMapModal'
import {
  formatDate,
  formatTime,
  getStatusBadge,
  getStatusEmoji,
  getStatusLabel,
  MONTH_NAMES,
  isoToJakartaTime,
} from '@/lib/utils'
import { cachedFetch, invalidateCache } from '@/lib/apiCache'

function getWhatsAppAlertUrl(phone: string, studentName: string): string {
  if (!phone) return '#'
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1)
  else if (!cleaned.startsWith('62')) cleaned = '62' + cleaned
  const text = `Halo ${studentName}, sistem ABSENKU mendeteksi Anda belum melakukan absensi masuk pagi ini di lokasi PKL Anda. Batas waktu absensi s.d pukul 08:30 WIB. Harap segera lakukan swafoto kehadiran di lokasi penugasan PKL Anda. Terima kasih.`
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`
}

export default function AdminAttendancesPage() {
  const { showToast } = useToast()

  const [attendances, setAttendances] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())

  // Modals
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  // Photo & Map preview modals
  const [photoModal, setPhotoModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  })
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

  // Form states for manual attendance
  const [manualUserId, setManualUserId] = useState('')
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])
  const [manualCheckIn, setManualCheckIn] = useState('07:30')
  const [manualCheckOut, setManualCheckOut] = useState('16:30')
  const [manualStatus, setManualStatus] = useState('on_time')
  const [manualAddress, setManualAddress] = useState('')
  const [manualNote, setManualNote] = useState('')

  // Form states for edit attendance
  const [editDate, setEditDate] = useState('')
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [editStatus, setEditStatus] = useState('on_time')
  const [editAddress, setEditAddress] = useState('')
  const [editNote, setEditNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch attendances with filters
  const loadAttendances = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL('/api/admin/attendances', window.location.origin)
      if (filterDate) url.searchParams.set('date', filterDate)
      if (filterStatus) url.searchParams.set('status', filterStatus)
      if (filterMonth) url.searchParams.set('month', filterMonth)
      if (filterYear) url.searchParams.set('year', filterYear)
      if (search) url.searchParams.set('search', search)

      const data = await cachedFetch(url.toString(), undefined, 10000, refreshing)
      setAttendances(data.attendances || [])
    } catch (err) {
      console.error('Failed to load attendances:', err)
    } finally {
      setLoading(false)
    }
  }, [filterDate, filterStatus, filterMonth, filterYear, search, refreshing])

  // Fetch all students/users for manual entry dropdown
  const loadStudents = async () => {
    try {
      const data = await cachedFetch('/api/students?all=true', undefined, 30000, refreshing)
      const userList = data.students || []
      setStudents(userList)
      if (userList.length > 0 && !manualUserId) {
        setManualUserId(userList[0].id)
      }
    } catch (err) {
      console.error('Failed to load students:', err)
    }
  }

  useEffect(() => {
    loadAttendances()
    loadStudents()
  }, [loadAttendances])

  const handleRefresh = async () => {
    setRefreshing(true)
    invalidateCache('/api/admin/attendances')
    invalidateCache('/api/students')
    await Promise.all([loadAttendances(), loadStudents()])
    setRefreshing(false)
    showToast('Data absensi berhasil diperbarui!', 'success')
  }

  // Quick stats calculation
  const stats = useMemo(() => {
    const total = attendances.length
    const onTime = attendances.filter((a) => a.check_in_status === 'on_time').length
    const late = attendances.filter((a) => a.check_in_status === 'late').length
    const izinSakit = attendances.filter((a) => a.check_in_status === 'izin' || a.check_in_status === 'sakit').length
    const alpha = attendances.filter((a) => a.check_in_status === 'alpha').length
    return { total, onTime, late, izinSakit, alpha }
  }, [attendances])

  // Submit Manual Attendance
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/attendances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: manualUserId,
          date: manualDate,
          check_in_time: manualCheckIn || null,
          check_out_time: manualCheckOut || null,
          check_in_status: manualStatus,
          check_in_address: manualAddress || null,
          note: manualNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan absensi manual.')

      showToast('Absensi manual berhasil disimpan ke database!', 'success', 'Tersimpan')
      setManualModalOpen(false)
      invalidateCache('/api/admin/attendances')
      await loadAttendances()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (rec: any) => {
    setSelectedRecord(rec)
    setEditDate(rec.date)
    setEditStatus(rec.check_in_status || 'on_time')
    setEditAddress(rec.check_in_address || '')
    setEditNote(rec.note || '')
    setEditCheckIn(isoToJakartaTime(rec.check_in_time))
    setEditCheckOut(isoToJakartaTime(rec.check_out_time))
    setEditModalOpen(true)
  }

  // Submit Edit Attendance
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecord) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/attendances/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editDate,
          check_in_time: editCheckIn || null,
          check_out_time: editCheckOut || null,
          check_in_status: editStatus,
          check_in_address: editAddress || null,
          note: editNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah absensi.')

      showToast('Data absensi berhasil diperbarui!', 'success', 'Diperbarui')
      setEditModalOpen(false)
      invalidateCache('/api/admin/attendances')
      await loadAttendances()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedRecord) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/attendances/${selectedRecord.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus absensi.')

      showToast('Data absensi berhasil dihapus permanen.', 'success', 'Dihapus')
      setDeleteModalOpen(false)
      invalidateCache('/api/admin/attendances')
      await loadAttendances()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // Quick preset helper for manual modal
  const applyManualPreset = (preset: 'on_time' | 'late' | 'izin' | 'sakit' | 'alpha') => {
    setManualStatus(preset)
    if (preset === 'on_time') {
      setManualCheckIn('07:30')
      setManualCheckOut('16:30')
      setManualAddress('Kantor Penugasan PKL')
    } else if (preset === 'late') {
      setManualCheckIn('08:45')
      setManualCheckOut('16:30')
      setManualAddress('Kantor Penugasan PKL')
    } else {
      setManualCheckIn('')
      setManualCheckOut('')
      if (preset === 'izin') setManualNote('Pengajuan izin dinas / urusan resmi')
      if (preset === 'sakit') setManualNote('Surat keterangan sakit')
      if (preset === 'alpha') setManualNote('Tidak hadir tanpa keterangan')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Manajemen Data Absensi</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Monitoring, koreksi, dan verifikasi kehadiran seluruh peserta didik PKL
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40 rounded-xl"
            title="Perbarui data absensi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>

          <button
            onClick={() => setManualModalOpen(true)}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 rounded-xl shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="font-semibold">Tambah Absensi Manual</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-card p-3.5 border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 font-medium">Total Absen</p>
            <p className="text-lg font-bold text-white mt-0.5">{stats.total}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400">
            <ClipboardList className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card p-3.5 border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-400 font-medium">Tepat Waktu</p>
            <p className="text-lg font-bold text-emerald-300 mt-0.5">{stats.onTime}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card p-3.5 border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-400 font-medium">Terlambat</p>
            <p className="text-lg font-bold text-amber-300 mt-0.5">{stats.late}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card p-3.5 border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-blue-400 font-medium">Izin & Sakit</p>
            <p className="text-lg font-bold text-blue-300 mt-0.5">{stats.izinSakit}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="glass-card p-3.5 border border-rose-500/20 bg-rose-500/5 flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-[11px] text-rose-400 font-medium">Alpha</p>
            <p className="text-lg font-bold text-rose-300 mt-0.5">{stats.alpha}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Fast WhatsApp Reminder Banner for Students Not Checked In Today */}
      {(!filterDate || filterDate === new Date().toISOString().split('T')[0]) && (() => {
        const todayDate = new Date().toISOString().split('T')[0]
        const absentList = students.filter((s) => {
          return (
            s.role === 'student' &&
            !attendances.some((a) => a.user_id === s.id && a.date === todayDate && a.check_in_time)
          )
        })

        if (absentList.length === 0) return null

        return (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 flex flex-col gap-3 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-xs font-bold text-amber-300">
                  Peringatan Kehadiran Hari Ini: {absentList.length} Siswa Belum Absen Masuk
                </h3>
              </div>
              <span className="text-[10px] text-gray-400">Jadwal Masuk: 06:00 - 08:30 WIB</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {absentList.slice(0, 8).map((st) => {
                const waUrl = st.phone ? getWhatsAppAlertUrl(st.phone, st.full_name) : null
                return (
                  <div
                    key={st.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs"
                  >
                    <span className="font-semibold text-white truncate max-w-[130px]">{st.full_name}</span>
                    {waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition active:scale-95 shadow-sm shadow-emerald-600/30"
                        title="Kirim teguran cepat via WhatsApp"
                      >
                        <span>💬 Tegur WA</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-500 italic">No WA -</span>
                    )}
                  </div>
                )
              })}
              {absentList.length > 8 && (
                <span className="text-[10px] text-gray-400 self-center">
                  +{absentList.length - 8} siswa lainnya
                </span>
              )}
            </div>
          </div>
        )
      })()}

      {/* Filters Toolbar */}
      <div className="glass-card p-4 border border-white/10 flex flex-wrap items-center gap-3">
        {/* Search by Name / Email */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa atau email..."
            className="bg-transparent text-xs text-white placeholder:text-gray-500 outline-none w-full"
          />
        </div>

        {/* Date Filter & Quick Pills */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-field py-1.5 px-3 text-xs w-auto bg-black/40 border-white/10"
          />
          <button
            onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
              filterDate === new Date().toISOString().split('T')[0]
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Hari Ini
          </button>
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field py-1.5 px-3 text-xs w-auto bg-black/40 border-white/10"
        >
          <option value="">Semua Status</option>
          <option value="on_time">🟢 Tepat Waktu</option>
          <option value="late">🟡 Terlambat</option>
          <option value="alpha">🔴 Alpha</option>
          <option value="izin">🔵 Izin</option>
          <option value="sakit">🟣 Sakit</option>
        </select>

        {/* Month Filter */}
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="input-field py-1.5 px-3 text-xs w-auto bg-black/40 border-white/10"
        >
          <option value="">Semua Bulan</option>
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx + 1} value={(idx + 1).toString()}>
              {name}
            </option>
          ))}
        </select>

        {/* Year Filter */}
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="input-field py-1.5 px-3 text-xs w-auto bg-black/40 border-white/10"
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y.toString()}>
              {y}
            </option>
          ))}
        </select>

        {/* Reset button */}
        {(filterDate || filterStatus || filterMonth || search) && (
          <button
            onClick={() => {
              setFilterDate('')
              setFilterStatus('')
              setFilterMonth('')
              setSearch('')
            }}
            className="text-xs text-rose-400 hover:underline px-2 py-1 font-medium"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Table Records */}
      <div className="glass-card border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Peserta Didik / Pengguna</th>
                <th>Masuk (WIB)</th>
                <th>Pulang (WIB)</th>
                <th>Status</th>
                <th>Bukti / Lokasi / Keterangan</th>
                <th className="text-right">Aksi Superadmin</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                      <span>Memuat data absensi...</span>
                    </div>
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ClipboardList className="w-7 h-7 text-gray-600" />
                      <span>Tidak ada catatan absensi yang sesuai filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                attendances.map((rec) => {
                  const checkInPhoto = rec.attendance_photos?.find((p: any) => p.type === 'check_in')
                  const checkOutPhoto = rec.attendance_photos?.find((p: any) => p.type === 'check_out')

                  return (
                    <tr key={rec.id} className="hover:bg-white/[0.02] transition">
                      <td>
                        <div className="text-xs">
                          <p className="font-semibold text-white">{formatDate(rec.date)}</p>
                          {rec.is_manual && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 text-[9px] font-semibold border border-amber-500/20">
                              Manual Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          {rec.users?.avatar_url ? (
                            <img
                              src={rec.users.avatar_url}
                              alt="Avatar"
                              className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {rec.users?.full_name?.charAt(0) || 'S'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-white text-xs truncate">
                              {rec.users?.full_name || 'Tidak Diketahui'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                              <span className="truncate">{rec.users?.email}</span>
                              {rec.users?.class_name && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-300 font-medium">{rec.users.class_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs">
                          <p className="text-white font-medium">
                            {rec.check_in_time ? formatTime(rec.check_in_time) : '-'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="text-xs">
                          <p className="text-white font-medium">
                            {rec.check_out_time ? formatTime(rec.check_out_time) : '-'}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className={`badge text-[10px] py-1 px-2.5 ${getStatusBadge(rec.check_in_status)}`}>
                          <span>{getStatusEmoji(rec.check_in_status)}</span>
                          <span className="font-semibold">{getStatusLabel(rec.check_in_status)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1 max-w-[260px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {checkInPhoto && (
                              <button
                                onClick={() =>
                                  setPhotoModal({
                                    isOpen: true,
                                    url: checkInPhoto.photo_url,
                                    title: `Foto Masuk · ${rec.users?.full_name}`,
                                  })
                                }
                                className="px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-medium flex items-center gap-1 transition"
                              >
                                <Eye className="w-3 h-3" /> Masuk
                              </button>
                            )}
                            {checkOutPhoto && (
                              <button
                                onClick={() =>
                                  setPhotoModal({
                                    isOpen: true,
                                    url: checkOutPhoto.photo_url,
                                    title: `Foto Pulang · ${rec.users?.full_name}`,
                                  })
                                }
                                className="px-2 py-0.5 rounded-md bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-[10px] font-medium flex items-center gap-1 transition"
                              >
                                <Eye className="w-3 h-3" /> Pulang
                              </button>
                            )}
                            {rec.check_in_lat && rec.check_in_lng && (
                              <button
                                onClick={() =>
                                  setMapModal({
                                    isOpen: true,
                                    lat: rec.check_in_lat,
                                    lng: rec.check_in_lng,
                                    title: `Lokasi Masuk · ${rec.users?.full_name}`,
                                    address: rec.check_in_address,
                                  })
                                }
                                className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-medium flex items-center gap-1 transition"
                              >
                                <MapPin className="w-3 h-3" /> Peta GPS
                              </button>
                            )}
                          </div>
                          {rec.check_in_address && (
                            <p className="text-[10px] text-gray-400 truncate flex items-center gap-1" title={rec.check_in_address}>
                              <Building className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                              <span className="truncate">{rec.check_in_address}</span>
                            </p>
                          )}
                          {rec.note && (
                            <p className="text-[10px] text-amber-300/80 italic truncate" title={rec.note}>
                              Catatan: {rec.note}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit / Koreksi Absensi"
                            className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/15 border border-transparent hover:border-indigo-500/30 transition active:scale-95"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRecord(rec)
                              setDeleteModalOpen(true)
                            }}
                            title="Hapus Absensi"
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL ATTENDANCE MODAL */}
      {manualModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card p-6 w-full max-w-lg border border-white/10 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Tambah Absensi Manual</h3>
                  <p className="text-[10px] text-gray-400">Input catatan kehadiran resmi oleh Superadmin</p>
                </div>
              </div>
              <button
                onClick={() => setManualModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-gray-400 font-medium block mb-1">Pilih Siswa / Pengguna</label>
                <select
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  className="input-field"
                  required
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.class_name ? `${s.class_name} • ` : ''}{s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 font-medium block mb-1">Tanggal Absensi</label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-medium block mb-1">Shortcut Tanggal</label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      type="button"
                      onClick={() => setManualDate(new Date().toISOString().split('T')[0])}
                      className="btn-outline flex-1 py-1.5 text-[10px]"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const yesterday = new Date()
                        yesterday.setDate(yesterday.getDate() - 1)
                        setManualDate(yesterday.toISOString().split('T')[0])
                      }}
                      className="btn-outline flex-1 py-1.5 text-[10px]"
                    >
                      Kemarin
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Status Kehadiran</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="on_time">🟢 Tepat Waktu</option>
                  <option value="late">🟡 Terlambat</option>
                  <option value="alpha">🔴 Alpha</option>
                  <option value="izin">🔵 Izin</option>
                  <option value="sakit">🟣 Sakit</option>
                </select>
              </div>

              {/* Presets shortcut buttons */}
              <div>
                <span className="text-[10px] text-gray-500 block mb-1">Shortcut Preset Cepat:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyManualPreset('on_time')}
                    className="px-2 py-1 rounded-md bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20 hover:bg-emerald-500/25"
                  >
                    🟢 Tepat Waktu (07:30 - 16:30)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyManualPreset('late')}
                    className="px-2 py-1 rounded-md bg-amber-500/15 text-amber-400 text-[10px] font-semibold border border-amber-500/20 hover:bg-amber-500/25"
                  >
                    🟡 Terlambat (08:45 - 16:30)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyManualPreset('izin')}
                    className="px-2 py-1 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-semibold border border-blue-500/20 hover:bg-blue-500/25"
                  >
                    🔵 Izin
                  </button>
                  <button
                    type="button"
                    onClick={() => applyManualPreset('sakit')}
                    className="px-2 py-1 rounded-md bg-purple-500/15 text-purple-400 text-[10px] font-semibold border border-purple-500/20 hover:bg-purple-500/25"
                  >
                    🟣 Sakit
                  </button>
                  <button
                    type="button"
                    onClick={() => applyManualPreset('alpha')}
                    className="px-2 py-1 rounded-md bg-rose-500/15 text-rose-400 text-[10px] font-semibold border border-rose-500/20 hover:bg-rose-500/25"
                  >
                    🔴 Alpha
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 font-medium">Jam Masuk (WIB)</label>
                    {manualCheckIn && (
                      <button
                        type="button"
                        onClick={() => setManualCheckIn('')}
                        className="text-[9px] text-gray-500 hover:text-rose-400"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 font-medium">Jam Pulang (WIB)</label>
                    {manualCheckOut && (
                      <button
                        type="button"
                        onClick={() => setManualCheckOut('')}
                        className="text-[9px] text-gray-500 hover:text-rose-400"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Lokasi / Keterangan Penugasan (Opsional)</label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Contoh: Kantor Dinas Kominfo / Dinas Luar"
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Catatan Admin</label>
                <textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Contoh: Ditambahkan manual karena gangguan jaringan / tugas lapangan..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="btn-outline py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2 px-5 font-semibold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Absensi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ATTENDANCE MODAL */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card p-6 w-full max-w-lg border border-white/10 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Koreksi Data Absensi</h3>
                  <p className="text-[10px] text-gray-400">Sesuaikan waktu, tanggal, atau status kehadiran</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5 text-xs">
              {/* Student Summary Info */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                {selectedRecord?.users?.avatar_url ? (
                  <img
                    src={selectedRecord.users.avatar_url}
                    alt="Avatar"
                    className="w-9 h-9 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm">
                    {selectedRecord?.users?.full_name?.charAt(0) || 'S'}
                  </div>
                )}
                <div>
                  <p className="font-bold text-white text-xs">{selectedRecord?.users?.full_name}</p>
                  <p className="text-[11px] text-gray-400">{selectedRecord?.users?.email}</p>
                </div>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Tanggal Absensi</label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 font-medium">Jam Masuk (WIB)</label>
                    {editCheckIn && (
                      <button
                        type="button"
                        onClick={() => setEditCheckIn('')}
                        className="text-[9px] text-gray-500 hover:text-rose-400"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 font-medium">Jam Pulang (WIB)</label>
                    {editCheckOut && (
                      <button
                        type="button"
                        onClick={() => setEditCheckOut('')}
                        className="text-[9px] text-gray-500 hover:text-rose-400"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={editCheckOut}
                    onChange={(e) => setEditCheckOut(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Status Kehadiran</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="on_time">🟢 Tepat Waktu</option>
                  <option value="late">🟡 Terlambat</option>
                  <option value="alpha">🔴 Alpha</option>
                  <option value="izin">🔵 Izin</option>
                  <option value="sakit">🟣 Sakit</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Alamat / Lokasi</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Lokasi kehadiran..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Catatan / Alasan Koreksi</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Alasan koreksi absensi..."
                  rows={2}
                  className="input-field resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn-outline py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2 px-5 font-semibold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card p-6 w-full max-w-md border border-rose-500/30 shadow-2xl flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Catatan Absensi?</h3>
                <p className="text-xs text-gray-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            {/* Record details preview */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Siswa:</span>
                <span className="font-semibold text-white">{selectedRecord?.users?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tanggal:</span>
                <span className="text-white font-medium">{selectedRecord ? formatDate(selectedRecord.date) : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Jam Masuk:</span>
                <span className="text-white font-medium">
                  {selectedRecord?.check_in_time ? formatTime(selectedRecord.check_in_time) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`badge text-[10px] ${getStatusBadge(selectedRecord?.check_in_status)}`}>
                  {getStatusEmoji(selectedRecord?.check_in_status)} {getStatusLabel(selectedRecord?.check_in_status)}
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-300/80 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
              Perhatian: Menghapus record ini juga akan membersihkan foto swafoto bukti terkait dan dicatat ke Audit Log sistem.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="btn-outline text-xs py-2 px-4"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="btn-danger text-xs py-2 px-5 font-semibold"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus Absensi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAP MODAL */}
      <LeafletMapModal
        isOpen={mapModal.isOpen}
        onClose={() => setMapModal((prev) => ({ ...prev, isOpen: false }))}
        lat={mapModal.lat}
        lng={mapModal.lng}
        title={mapModal.title}
        address={mapModal.address}
      />

      {/* PHOTO PREVIEW MODAL */}
      {photoModal.isOpen && (
        <div className="modal-overlay">
          <div className="glass-card p-4 max-w-sm w-full border border-white/10 flex flex-col items-center animate-fade-in">
            <div className="flex items-center justify-between w-full pb-3 border-b border-white/10 mb-3">
              <h4 className="text-xs font-semibold text-white truncate max-w-[280px]">
                {photoModal.title}
              </h4>
              <button
                onClick={() => setPhotoModal({ isOpen: false, url: '', title: '' })}
                className="text-gray-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>
            <img
              src={photoModal.url}
              alt="Bukti Foto"
              className="w-full max-h-[350px] object-cover rounded-xl border border-white/10 shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}
