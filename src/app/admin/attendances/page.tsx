'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  ClipboardList,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  MapPin,
  Calendar,
  X,
  CheckCircle2,
  RefreshCw,
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
} from '@/lib/utils'
import { cachedFetch, invalidateCache } from '@/lib/apiCache'

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

  // Form states for manual / edit
  const [manualUserId, setManualUserId] = useState('')
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])
  const [manualCheckIn, setManualCheckIn] = useState('07:25')
  const [manualCheckOut, setManualCheckOut] = useState('16:35')
  const [manualStatus, setManualStatus] = useState('on_time')
  const [manualNote, setManualNote] = useState('')

  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [editStatus, setEditStatus] = useState('on_time')
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

  // Fetch students for manual entry dropdown
  const loadStudents = async () => {
    try {
      const data = await cachedFetch('/api/students', undefined, 30000, refreshing)
      setStudents(data.students || [])
      if (data.students?.length > 0 && !manualUserId) {
        setManualUserId(data.students[0].id)
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
          check_in_time: manualCheckIn,
          check_out_time: manualCheckOut,
          check_in_status: manualStatus,
          note: manualNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan absensi manual.')

      showToast('Absensi manual berhasil disimpan ke database!', 'success', 'Tersimpan')
      setManualModalOpen(false)
      loadAttendances()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (rec: any) => {
    setSelectedRecord(rec)
    setEditStatus(rec.check_in_status || 'on_time')
    setEditNote(rec.note || '')
    setEditCheckIn(
      rec.check_in_time ? new Date(rec.check_in_time).toISOString().substring(11, 16) : ''
    )
    setEditCheckOut(
      rec.check_out_time ? new Date(rec.check_out_time).toISOString().substring(11, 16) : ''
    )
    setEditModalOpen(true)
  }

  // Submit Edit Attendance
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecord) return
    setSubmitting(true)
    try {
      const dateStr = selectedRecord.date
      const checkInFull = editCheckIn ? `${dateStr}T${editCheckIn}:00.000Z` : null
      const checkOutFull = editCheckOut ? `${dateStr}T${editCheckOut}:00.000Z` : null

      const res = await fetch(`/api/admin/attendances/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in_time: checkInFull,
          check_out_time: checkOutFull,
          check_in_status: editStatus,
          note: editNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah absensi.')

      showToast('Data absensi berhasil diubah!', 'success', 'Diperbarui')
      setEditModalOpen(false)
      loadAttendances()
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

      showToast('Data absensi berhasil dihapus.', 'success', 'Dihapus')
      setDeleteModalOpen(false)
      loadAttendances()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-400" />
            Manajemen Data Absensi
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Monitoring, koreksi, dan verifikasi kehadiran seluruh peserta didik PKL
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2.5 px-3.5 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40"
            title="Perbarui data absensi"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>

          <button
            onClick={() => setManualModalOpen(true)}
            className="btn-primary text-xs py-2.5 px-4"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Absensi Manual</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card p-4 border border-white/10 flex flex-wrap items-center gap-3">
        {/* Search by Name */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama siswa..."
            className="bg-transparent text-xs text-white placeholder:text-gray-500 outline-none w-full"
          />
        </div>

        {/* Date Filter */}
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="input-field py-1.5 px-3 text-xs w-auto bg-black/40 border-white/10"
        />

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

        {/* Reset button */}
        {(filterDate || filterStatus || filterMonth || search) && (
          <button
            onClick={() => {
              setFilterDate('')
              setFilterStatus('')
              setFilterMonth('')
              setSearch('')
            }}
            className="text-xs text-rose-400 hover:underline px-2"
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
                <th>Siswa</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Status</th>
                <th>Bukti Foto / Lokasi</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-gray-500">
                    Memuat data absensi...
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-gray-500">
                    Tidak ada catatan absensi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                attendances.map((rec) => {
                  const checkInPhoto = rec.attendance_photos?.find((p: any) => p.type === 'check_in')
                  const checkOutPhoto = rec.attendance_photos?.find((p: any) => p.type === 'check_out')

                  return (
                    <tr key={rec.id}>
                      <td>
                        <div className="text-xs">
                          <p className="font-semibold text-white">{formatDate(rec.date)}</p>
                          {rec.is_manual && (
                            <span className="text-[10px] text-amber-400">Manual Admin</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {rec.users?.avatar_url ? (
                            <img
                              src={rec.users.avatar_url}
                              alt="Avatar"
                              className="w-7 h-7 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                              {rec.users?.full_name?.charAt(0) || 'S'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white text-xs">
                              {rec.users?.full_name || 'Tidak Diketahui'}
                            </p>
                            <p className="text-[10px] text-gray-400">{rec.users?.email}</p>
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
                        <div className={`badge text-[10px] ${getStatusBadge(rec.check_in_status)}`}>
                          <span>{getStatusEmoji(rec.check_in_status)}</span>
                          <span>{getStatusLabel(rec.check_in_status)}</span>
                        </div>
                      </td>
                      <td>
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
                              className="p-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[10px] flex items-center gap-1"
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
                              className="p-1 rounded bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 text-[10px] flex items-center gap-1"
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
                              className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] flex items-center gap-1"
                            >
                              <MapPin className="w-3 h-3" /> Peta
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit Absensi"
                            className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRecord(rec)
                              setDeleteModalOpen(true)
                            }}
                            title="Hapus Absensi"
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
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
          <div className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Tambah Absensi Manual
              </h3>
              <button
                onClick={() => setManualModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-gray-400 font-medium block mb-1">Pilih Siswa</label>
                <select
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  className="input-field"
                  required
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 font-medium block mb-1">Jam Masuk (WIB)</label>
                  <input
                    type="time"
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-medium block mb-1">Jam Pulang (WIB)</label>
                  <input
                    type="time"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    className="input-field"
                  />
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
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Catatan Admin</label>
                <textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Contoh: Diberi izin dispensasi kegiatan dinas luar..."
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
                  className="btn-primary py-2 px-4"
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
          <div className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Koreksi Data Absensi
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5 text-xs">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-gray-400">Siswa:</p>
                <p className="font-bold text-white text-sm">{selectedRecord?.users?.full_name}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Tanggal: {selectedRecord ? formatDate(selectedRecord.date) : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 font-medium block mb-1">Jam Masuk (WIB)</label>
                  <input
                    type="time"
                    value={editCheckIn}
                    onChange={(e) => setEditCheckIn(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-medium block mb-1">Jam Pulang (WIB)</label>
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
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Catatan / Alasan Koreksi</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
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
                  className="btn-primary py-2 px-4"
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
          <div className="glass-card p-6 w-full max-w-sm border border-rose-500/30 shadow-2xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-white text-center">Hapus Catatan Absensi?</h3>
            <p className="text-xs text-gray-300 text-center">
              Apakah Anda yakin ingin menghapus data absensi tanggal <b>{selectedRecord?.date}</b> milik{' '}
              <b>{selectedRecord?.users?.full_name}</b>?
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="btn-outline text-xs flex-1 py-2.5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="btn-danger text-xs flex-1 py-2.5"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus'}
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
          <div className="glass-card p-4 max-w-sm w-full border border-white/10 flex flex-col items-center">
            <div className="flex items-center justify-between w-full pb-3 border-b border-white/10 mb-3">
              <h4 className="text-xs font-semibold text-white truncate max-w-[280px]">
                {photoModal.title}
              </h4>
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
