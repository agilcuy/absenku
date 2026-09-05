'use client'

import React, { useEffect, useState } from 'react'
import {
  Building,
  Plus,
  Search,
  MapPin,
  Phone,
  User,
  Users,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  Code,
  RefreshCw,
  GraduationCap,
  Compass,
} from 'lucide-react'
import { useToast, ToastProvider } from '@/components/Toast'
import { cachedFetch, invalidateCache } from '@/lib/apiCache'
import { getPlaceCoordinates } from '@/lib/geo'

function PlacesPageContent() {
  const { showToast } = useToast()
  const [places, setPlaces] = useState<any[]>([])
  const [mentors, setMentors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [needsMigration, setNeedsMigration] = useState(false)
  const [search, setSearch] = useState('')

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlace, setEditingPlace] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    pic_name: '',
    pic_phone: '',
    mentor_id: '',
    latitude: '',
    longitude: '',
    radius_meters: '200',
  })
  const [detectingGps, setDetectingGps] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Students in place modal
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadPlaces = async (forceFresh = false) => {
    try {
      const [placesRes, mentorsRes] = await Promise.all([
        cachedFetch('/api/internship-places', undefined, 30000, forceFresh),
        cachedFetch('/api/mentors', undefined, 20000, forceFresh),
      ])
      if (placesRes.needsMigration) {
        setNeedsMigration(true)
      } else {
        setPlaces(placesRes.places || [])
      }
      setMentors(mentorsRes.mentors || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    invalidateCache('/api/internship-places')
    invalidateCache('/api/mentors')
    await loadPlaces(true)
    showToast('Data tempat PKL dan pembimbing berhasil diperbarui!', 'success')
  }

  useEffect(() => {
    loadPlaces()
  }, [])

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Browser Anda tidak mendukung geolokasi GPS.', 'error')
      return
    }
    setDetectingGps(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        setDetectingGps(false)
        showToast('Koordinat GPS berhasil diambil dari posisi Anda saat ini!', 'success')
      },
      (err) => {
        setDetectingGps(false)
        let msg = 'Gagal mendeteksi lokasi GPS.'
        if (err.code === 1) msg = 'Izin lokasi ditolak pada peramban/browser.'
        showToast(msg, 'error')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleOpenAdd = () => {
    setEditingPlace(null)
    setFormData({
      name: '',
      address: '',
      phone: '',
      pic_name: '',
      pic_phone: '',
      mentor_id: '',
      latitude: '-5.498800',
      longitude: '104.708800',
      radius_meters: '200',
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (place: any) => {
    setEditingPlace(place)
    const resolved = getPlaceCoordinates(place)
    setFormData({
      name: place.name,
      address: place.address || (resolved?.name && resolved.name.includes('Bernung') ? 'DeryGarage X Gen z Code, Bernung' : ''),
      phone: place.phone || '',
      pic_name: place.pic_name || '',
      pic_phone: place.pic_phone || '',
      mentor_id: place.mentor_id || place.mentors?.[0]?.id || '',
      latitude:
        place.latitude !== undefined && place.latitude !== null && Number(place.latitude) !== 0
          ? String(place.latitude)
          : resolved
          ? String(resolved.lat)
          : '-5.498800',
      longitude:
        place.longitude !== undefined && place.longitude !== null && Number(place.longitude) !== 0
          ? String(place.longitude)
          : resolved
          ? String(resolved.lng)
          : '104.708800',
      radius_meters:
        place.radius_meters !== undefined && place.radius_meters !== null && Number(place.radius_meters) !== 0
          ? String(place.radius_meters)
          : resolved
          ? String(resolved.radiusMeters)
          : '200',
    })
    setModalOpen(true)
  }

  const handleOpenDetail = async (placeId: string) => {
    setDetailModalOpen(true)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/internship-places/${placeId}`)
      if (res.ok) {
        const json = await res.json()
        setSelectedPlaceDetail(json.place)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const endpoint = editingPlace
        ? `/api/internship-places/${editingPlace.id}`
        : '/api/internship-places'
      const method = editingPlace ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan data')

      showToast(json.message || 'Tempat PKL berhasil disimpan', 'success')
      setModalOpen(false)
      invalidateCache('/api/internship-places')
      loadPlaces(true)
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus data tempat PKL "${name}"? Siswa yang ditempatkan di sini akan dilepas penugasannya.`)) {
      return
    }

    try {
      const res = await fetch(`/api/internship-places/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus tempat PKL')
      showToast('Tempat PKL berhasil dihapus', 'success')
      invalidateCache('/api/internship-places')
      loadPlaces(true)
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const handleSyncCoordinates = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/internship-places/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyinkronkan koordinat')

      showToast(json.message || 'Titik koordinat berhasil disinkronkan!', 'success')
      invalidateCache('/api/internship-places')
      loadPlaces(true)
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const filtered = places.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.name?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q) ||
      p.pic_name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="glass-card p-6 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Master Data</span>
          </div>
          <h1 className="text-2xl font-black text-white">Tempat / Instansi PKL</h1>
          <p className="text-xs text-gray-400 mt-1">
            Kelola instansi, perusahaan mitra PKL, PIC lapangan, dan siswa yang ditempatkan
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleSyncCoordinates}
            disabled={syncing}
            className="btn-outline text-xs py-2.5 px-3.5 flex items-center gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold shadow-sm"
            title="Sinkronkan titik koordinat resmi GPS dan radius per tempat PKL"
          >
            <Compass className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan Koordinat'}</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2.5 px-3.5 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40"
            title="Perbarui data tempat PKL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>

          <button onClick={handleOpenAdd} className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Tambah Tempat PKL</span>
          </button>
        </div>
      </div>

      {/* Alert jika tabel database belum dijalankan di Supabase */}
      {needsMigration && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in shadow-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-300">Tabel Tempat PKL Belum Dibuat di Supabase</h4>
              <p className="text-amber-200/80 mt-0.5 leading-relaxed">
                Fitur ini memerlukan tabel database baru. Silakan buka <b>Supabase Dashboard ➔ SQL Editor</b>, lalu jalankan file <code>migration_v2.sql</code>.
              </p>
            </div>
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs py-2 px-3.5 whitespace-nowrap self-start sm:self-auto font-bold flex items-center gap-1.5"
          >
            <span>Buka Supabase SQL Editor ➔</span>
          </a>
        </div>
      )}

      {/* Filter and Search */}
      <div className="glass-card p-4 border border-white/10 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari instansi/alamat/PIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field text-xs pl-9 w-full"
          />
        </div>
        <span className="text-xs text-gray-400">Total: {filtered.length} Instansi Mitra</span>
      </div>

      {/* Places Grid */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-xs">Memuat data tempat PKL...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
          <Building className="w-8 h-8 opacity-20" />
          <span>Belum ada data tempat PKL terdaftar.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((place) => (
            <div
              key={place.id}
              className="glass-card p-5 border border-white/10 flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="truncate">{place.name}</span>
                  </h3>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(place)}
                      className="p-1 rounded text-gray-400 hover:text-white transition"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(place.id, place.name)}
                      className="p-1 rounded text-gray-400 hover:text-rose-400 transition"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-400 flex items-start gap-1.5 mb-3 line-clamp-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span>{place.address || 'Alamat belum diatur'}</span>
                </p>

                <div className="space-y-1 text-xs text-gray-300">
                  {place.phone && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                      <Phone className="w-3 h-3 text-gray-500" />
                      <span>{place.phone}</span>
                    </div>
                  )}
                  {place.pic_name && (
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-300">
                      <User className="w-3 h-3 text-indigo-400" />
                      <span>
                        PIC: {place.pic_name}{' '}
                        {place.pic_phone ? `(${place.pic_phone})` : ''}
                      </span>
                    </div>
                  )}

                  {/* Pembimbing Instansi Card Tag */}
                  <div className="flex items-center gap-1.5 text-[11px] text-purple-300">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span className="text-gray-400">Pembimbing:</span>
                    {place.mentors && place.mentors.length > 0 ? (
                      <span className="font-semibold text-purple-200 truncate max-w-[170px]">
                        {place.mentors.map((m: any) => m.full_name).join(', ')}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic text-[10px]">Belum Ditugaskan</span>
                    )}
                  </div>

                  {/* Geofencing Coordinates Tag */}
                  {(() => {
                    const resolved = getPlaceCoordinates(place)
                    const lat =
                      place.latitude && Number(place.latitude) !== 0 ? Number(place.latitude) : resolved?.lat
                    const lng =
                      place.longitude && Number(place.longitude) !== 0 ? Number(place.longitude) : resolved?.lng
                    const radius = place.radius_meters || resolved?.radiusMeters || 200

                    return (
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span
                          className="flex items-center gap-1 truncate"
                          title={lat && lng ? `Titik koordinat: ${lat}, ${lng}` : 'Koordinat default'}
                        >
                          <MapPin className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          {lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '-5.4988, 104.7088'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                          R: {radius}m
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <button
                  onClick={() => handleOpenDetail(place.id)}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{place.students_count} Siswa Ditempatkan</span>
                </button>
                <span className="text-[10px] text-gray-500">Klik untuk detail</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white">
                {editingPlace ? 'Edit Tempat PKL' : 'Tambah Tempat PKL Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Nama Instansi / Perusahaan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Teknologi Maju / Instansi Mitra PKL"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              {/* Pembimbing Penanggung Jawab Dropdown */}
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Pembimbing Lapangan / Penanggung Jawab
                </label>
                <select
                  value={formData.mentor_id}
                  onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  <option value="">-- Belum Ditugaskan / Bebas --</option>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} {m.role === 'superadmin' ? '• (Superadmin)' : '• (Pembimbing)'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Pembimbing yang dipilih akan ditempatkan di instansi ini dan memantau kehadiran siswa di instansi terkait.
                </p>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Jl. Raya Kompl. Perkantoran Pemda..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Nomor Telepon Kantor</label>
                  <input
                    type="tel"
                    placeholder="0722-xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Nama PIC Lapangan</label>
                  <input
                    type="text"
                    placeholder="Nama PIC/Mentor"
                    value={formData.pic_name}
                    onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Nomor WhatsApp PIC</label>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={formData.pic_phone}
                  onChange={(e) => setFormData({ ...formData, pic_phone: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              {/* Geofencing Coordinates & Radius Section */}
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-300 block">Koordinat GPS & Geofencing</span>
                    <span className="text-[10px] text-gray-400">Titik validasi radius absensi siswa PKL</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={detectingGps}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>{detectingGps ? 'Mendeteksi...' : 'Ambil Lokasi Saya'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">Latitude</label>
                    <input
                      type="text"
                      placeholder="-5.498800"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="input-field w-full text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">Longitude</label>
                    <input
                      type="text"
                      placeholder="104.708800"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="input-field w-full text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">Radius (M)</label>
                    <input
                      type="number"
                      placeholder="200"
                      value={formData.radius_meters}
                      onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                      className="input-field w-full text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Tempat PKL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Students in Place */}
      {detailModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-6 border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-white">Siswa yang Ditempatkan</h3>
                <p className="text-xs text-indigo-400 font-medium">
                  {selectedPlaceDetail?.name || 'Memuat...'}
                </p>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">Memuat daftar pengguna...</div>
            ) : selectedPlaceDetail?.users?.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                Belum ada pembimbing atau siswa yang ditempatkan di instansi ini.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-4 text-xs">
                {/* Section Pembimbing Instansi */}
                {(() => {
                  const placeMentors = (selectedPlaceDetail?.users || []).filter(
                    (u: any) => u.role === 'pembimbing' || u.role === 'superadmin'
                  )
                  if (placeMentors.length === 0) return null
                  return (
                    <div>
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-2">
                        Pembimbing Penanggung Jawab ({placeMentors.length})
                      </span>
                      <div className="divide-y divide-white/5 bg-purple-500/10 rounded-2xl p-2 border border-purple-500/20">
                        {placeMentors.map((m: any) => (
                          <div key={m.id} className="py-2 px-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-500/30 text-purple-200 font-bold flex items-center justify-center text-xs">
                                {m.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-white">{m.full_name}</p>
                                <p className="text-[10px] text-purple-300/80">
                                  {m.phone || m.email || 'Pembimbing PKL'}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              👨‍🏫 Pembimbing
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Section Siswa PKL */}
                <div>
                  {(() => {
                    const placeStudents = (selectedPlaceDetail?.users || []).filter(
                      (u: any) => u.role !== 'pembimbing' && u.role !== 'superadmin'
                    )
                    return (
                      <>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">
                          Siswa PKL yang Ditempatkan ({placeStudents.length})
                        </span>
                        {placeStudents.length === 0 ? (
                          <p className="text-gray-500 text-[11px] italic py-2">
                            Belum ada siswa yang ditempatkan di instansi ini.
                          </p>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {placeStudents.map((s: any) => (
                              <div key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
                                    {s.full_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">{s.full_name}</p>
                                    <p className="text-[11px] text-gray-400">
                                      {s.class_name || 'Kelas -'} • {s.major || '-'}
                                    </p>
                                  </div>
                                </div>

                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    s.is_online
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                  }`}
                                >
                                  {s.is_online ? '🟢 Online' : '⚫ Offline'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="btn-outline text-xs py-2 px-4"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PlacesPage() {
  return (
    <ToastProvider>
      <PlacesPageContent />
    </ToastProvider>
  )
}
