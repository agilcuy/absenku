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
} from 'lucide-react'
import { useToast, ToastProvider } from '@/components/Toast'

function PlacesPageContent() {
  const { showToast } = useToast()
  const [places, setPlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
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
  })
  const [submitting, setSubmitting] = useState(false)

  // Students in place modal
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedPlaceDetail, setSelectedPlaceDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadPlaces = async () => {
    try {
      const res = await fetch('/api/internship-places')
      if (res.ok) {
        const json = await res.json()
        setPlaces(json.places || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlaces()
  }, [])

  const handleOpenAdd = () => {
    setEditingPlace(null)
    setFormData({ name: '', address: '', phone: '', pic_name: '', pic_phone: '' })
    setModalOpen(true)
  }

  const handleOpenEdit = (place: any) => {
    setEditingPlace(place)
    setFormData({
      name: place.name,
      address: place.address || '',
      phone: place.phone || '',
      pic_name: place.pic_name || '',
      pic_phone: place.pic_phone || '',
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
      loadPlaces()
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
      loadPlaces()
    } catch (err: any) {
      showToast(err.message, 'error')
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

        <button onClick={handleOpenAdd} className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Tambah Tempat PKL</span>
        </button>
      </div>

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
                  placeholder="Contoh: Dinas Kominfo Kab. Tanggamus"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field w-full text-xs"
                />
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
              <div className="py-8 text-center text-xs text-gray-400">Memuat daftar siswa...</div>
            ) : selectedPlaceDetail?.users?.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">
                Belum ada siswa yang ditempatkan di instansi ini.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-white/5 text-xs">
                {selectedPlaceDetail?.users?.map((s: any) => (
                  <div key={s.id} className="py-3 flex items-center justify-between gap-3">
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
