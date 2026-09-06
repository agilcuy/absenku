'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Megaphone,
  Pin,
  Building,
  Globe,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  Calendar,
  Filter,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useToast, ToastProvider } from '@/components/Toast'

function AnnouncementsAdminPageContent() {
  const { showToast } = useToast()

  const [announcements, setAnnouncements] = useState<any[]>([])
  const [places, setPlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedPlaceFilter, setSelectedPlaceFilter] = useState('')

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [type, setType] = useState<'info' | 'warning' | 'urgent' | 'success'>('info')
  const [targetMode, setTargetMode] = useState<'global' | 'place'>('global')
  const [targetPlaceId, setTargetPlaceId] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load places for dropdown
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

  // Load announcements
  const loadAnnouncements = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedPlaceFilter) params.append('place_id', selectedPlaceFilter)

      const res = await fetch(`/api/announcements?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setAnnouncements(json.announcements || [])
      }
    } catch (err) {
      console.error('Failed to load announcements:', err)
      showToast('Gagal memuat pengumuman', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedPlaceFilter, showToast])

  useEffect(() => {
    loadPlaces()
  }, [])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const handleRefresh = () => {
    setRefreshing(true)
    loadAnnouncements()
  }

  // Open modal for Create
  const handleOpenCreate = () => {
    setSelectedItem(null)
    setTitle('')
    setContent('')
    setType('info')
    setTargetMode('global')
    setTargetPlaceId('')
    setIsPinned(false)
    setIsActive(true)
    setModalOpen(true)
  }

  // Open modal for Edit
  const handleOpenEdit = (item: any) => {
    setSelectedItem(item)
    setTitle(item.title || '')
    setContent(item.content || '')
    setType(item.type || 'info')
    if (item.internship_place_id) {
      setTargetMode('place')
      setTargetPlaceId(item.internship_place_id)
    } else {
      setTargetMode('global')
      setTargetPlaceId('')
    }
    setIsPinned(Boolean(item.is_pinned))
    setIsActive(item.is_active !== false)
    setModalOpen(true)
  }

  // Submit Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      showToast('Judul dan isi pengumuman wajib diisi', 'error')
      return
    }

    if (targetMode === 'place' && !targetPlaceId) {
      showToast('Harap pilih tempat PKL yang dituju', 'error')
      return
    }

    setSubmitting(true)
    try {
      const isEdit = !!selectedItem
      const endpoint = isEdit ? `/api/announcements/${selectedItem.id}` : '/api/announcements'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          type,
          internship_place_id: targetMode === 'place' ? targetPlaceId : null,
          is_pinned: isPinned,
          is_active: isActive,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan pengumuman')

      showToast(
        isEdit ? 'Pengumuman berhasil diperbarui!' : 'Pengumuman berhasil disiarkan ke siswa!',
        'success'
      )
      setModalOpen(false)
      loadAnnouncements()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengumuman ini?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus pengumuman')
      showToast('Pengumuman berhasil dihapus.', 'success')
      loadAnnouncements()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  // Filtered list by search query
  const filtered = announcements.filter((a) => {
    const q = search.toLowerCase()
    return (
      a.title?.toLowerCase().includes(q) ||
      a.content?.toLowerCase().includes(q) ||
      a.place?.name?.toLowerCase().includes(q) ||
      a.author?.full_name?.toLowerCase().includes(q)
    )
  })

  // Metric counts
  const totalActive = announcements.filter((a) => a.is_active).length
  const totalGlobal = announcements.filter((a) => !a.internship_place_id).length
  const totalPlaceSpecific = announcements.filter((a) => a.internship_place_id).length
  const totalPinned = announcements.filter((a) => a.is_pinned).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Pengumuman Resmi Siswa
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold font-mono">
                Broadcast Center
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Siarkan pengumuman penting, instruksi kegiatan, atau info libur ke seluruh siswa PKL secara global atau spesifik per tempat magang.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline flex items-center gap-2 py-2 px-3 text-xs"
            title="Segarkan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2 px-4 text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat Pengumuman</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-indigo-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Total Pengumuman Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white">{totalActive}</div>
          <p className="text-[11px] text-gray-400 mt-1">Tayang di dashboard siswa</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 to-purple-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Pengumuman Global</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-300">{totalGlobal}</div>
          <p className="text-[11px] text-gray-400 mt-1">Dilihat seluruh siswa PKL</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-violet-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Khusus Instansi Tertentu</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-300">{totalPlaceSpecific}</div>
          <p className="text-[11px] text-gray-400 mt-1">Tertarget per tempat magang</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-orange-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Disematkan (Pinned)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Pin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">{totalPinned}</div>
          <p className="text-[11px] text-gray-400 mt-1">Tampil prioritas teratas</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-300 border-b border-white/5 pb-2">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>Filter & Pencarian Pengumuman</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul, isi pengumuman, atau pembuat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="relative">
            <Building className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <select
              value={selectedPlaceFilter}
              onChange={(e) => setSelectedPlaceFilter(e.target.value)}
              className="input-field pl-9 text-xs appearance-none"
            >
              <option value="">Semua Target (Global & Semua Tempat PKL)</option>
              <option value="global">🌐 Hanya Pengumuman Global</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  🏢 Khusus: {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-400" />
            Daftar Seluruh Pengumuman ({filtered.length})
          </h3>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-gray-300 font-mono">
            {filtered.length} Data
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-gray-400">Memuat data pengumuman...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Megaphone className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-white text-base">Belum Ada Pengumuman</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              Tidak ada pengumuman yang cocok dengan filter. Klik tombol &ldquo;+ Buat Pengumuman&rdquo; untuk menyiarkan pesan ke siswa PKL.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item) => {
              const isUrgent = item.type === 'urgent'
              const isWarning = item.type === 'warning'
              const isSuccess = item.type === 'success'

              const badgeBg = isUrgent
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : isWarning
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : isSuccess
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                    item.is_pinned
                      ? 'border-amber-500/40 bg-amber-500/[0.03]'
                      : 'border-white/10 bg-white/[0.02] hover:border-blue-500/30'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeBg}`}>
                          {item.type === 'urgent'
                            ? 'Mendesak'
                            : item.type === 'warning'
                            ? 'Peringatan'
                            : item.type === 'success'
                            ? 'Pemberitahuan'
                            : 'Informasi'}
                        </span>

                        {item.is_pinned && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" />
                            Pin
                          </span>
                        )}

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1">
                          {item.place?.name ? (
                            <>
                              <Building className="w-2.5 h-2.5 text-purple-400" />
                              <span>{item.place.name}</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-2.5 h-2.5 text-indigo-400" />
                              <span>Semua Siswa (Global)</span>
                            </>
                          )}
                        </span>
                      </div>

                      <span className="text-[10px] text-gray-400 font-mono">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-300 mt-1 whitespace-pre-line leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">
                        Oleh: <b className="text-gray-200">{item.author?.full_name || 'Admin'}</b> ({item.author?.role === 'pembimbing' ? 'Pembimbing' : 'Superadmin'})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                        title="Edit Pengumuman"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                        title="Hapus Pengumuman"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-6 border border-blue-500/30 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {selectedItem ? 'Edit Pengumuman Siswa' : 'Buat Pengumuman Baru (Superadmin)'}
                  </h3>
                  <p className="text-[11px] text-gray-400">Siarkan pengumuman resmi ke dashboard siswa</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Target Audience */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1.5">Sasaran Siswa Penerima</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setTargetMode('global')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      targetMode === 'global'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span>Semua Siswa (Global)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('place')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      targetMode === 'place'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Khusus Tempat PKL</span>
                  </button>
                </div>

                {targetMode === 'place' && (
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">Pilih Tempat PKL Sasaran</label>
                    <select
                      value={targetPlaceId}
                      required
                      onChange={(e) => setTargetPlaceId(e.target.value)}
                      className="input-field text-xs"
                    >
                      <option value="">-- Pilih Tempat / Instansi PKL --</option>
                      {places.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Pengumuman Hari Libur Nasional & Penyesuaian Jadwal"
                  className="input-field text-xs"
                />
              </div>

              {/* Category / Type */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Kategori / Tipe</label>
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="info">ℹ️ Informasi Umum (Biru)</option>
                  <option value="warning">⚠️ Peringatan Penting (Kuning/Amber)</option>
                  <option value="urgent">🚨 Mendesak / Urgent (Merah)</option>
                  <option value="success">🎉 Pemberitahuan Positif / Sukses (Hijau)</option>
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Isi Pesan Pengumuman</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tuliskan isi pengumuman lengkap di sini..."
                  className="input-field text-xs resize-none"
                />
              </div>

              {/* Pin option */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="admin-pin"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded bg-white/5 border-white/20 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="admin-pin" className="text-gray-300 text-xs cursor-pointer select-none">
                  Sematkan di bagian paling atas (Pin)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2 px-5 text-xs shadow-lg shadow-blue-500/25"
                >
                  {submitting
                    ? 'Menyimpan...'
                    : selectedItem
                    ? 'Simpan Perubahan'
                    : 'Siarkan Pengumuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnnouncementsAdminPage() {
  return (
    <ToastProvider>
      <AnnouncementsAdminPageContent />
    </ToastProvider>
  )
}
