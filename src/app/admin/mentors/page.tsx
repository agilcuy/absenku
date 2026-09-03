'use client'

import React, { useEffect, useState } from 'react'
import {
  GraduationCap,
  Plus,
  Search,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Users,
  Building,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useToast, ToastProvider } from '@/components/Toast'

function MentorsPageContent() {
  const { showToast } = useToast()
  const [mentors, setMentors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMentor, setEditingMentor] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Assigned students modal
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [selectedMentor, setSelectedMentor] = useState<any>(null)

  const loadMentors = async () => {
    try {
      const res = await fetch('/api/mentors')
      if (res.ok) {
        const json = await res.json()
        setMentors(json.mentors || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadMentors()
    showToast('Data pembimbing berhasil diperbarui!', 'success')
  }

  useEffect(() => {
    loadMentors()
  }, [])

  const handleOpenAdd = () => {
    setEditingMentor(null)
    setFormData({ email: '', full_name: '', phone: '' })
    setModalOpen(true)
  }

  const handleOpenEdit = (mentor: any) => {
    setEditingMentor(mentor)
    setFormData({
      email: mentor.email,
      full_name: mentor.full_name,
      phone: mentor.phone || '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (editingMentor) {
        // Update mentor profile
        const res = await fetch(`/api/students/${editingMentor.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: formData.full_name,
            phone: formData.phone,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Gagal memperbarui pembimbing')
        }
        showToast('Data pembimbing berhasil diperbarui', 'success')
      } else {
        // Create mentor
        const res = await fetch('/api/mentors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || 'Gagal menambahkan pembimbing')
        }
        showToast('Pembimbing berhasil ditambahkan', 'success')
      }

      setModalOpen(false)
      loadMentors()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (mentor: any) => {
    try {
      const res = await fetch(`/api/students/${mentor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !mentor.is_active }),
      })
      if (res.ok) {
        showToast(
          `Pembimbing berhasil ${mentor.is_active ? 'dinonaktifkan' : 'diaktifkan'}`,
          'success'
        )
        loadMentors()
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  const filtered = mentors.filter((m) => {
    const q = search.toLowerCase()
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="glass-card p-6 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Manajemen Pengguna</span>
          </div>
          <h1 className="text-2xl font-black text-white">Data Pembimbing PKL</h1>
          <p className="text-xs text-gray-400 mt-1">
            Kelola data pembimbing, penugasan siswa, dan pemantauan bimbingan PKL
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2.5 px-3.5 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40"
            title="Perbarui data pembimbing"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>

          <button onClick={handleOpenAdd} className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Tambah Pembimbing</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="glass-card p-4 border border-white/10 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari pembimbing (nama/email/HP)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field text-xs pl-9 w-full"
          />
        </div>
        <span className="text-xs text-gray-400">Total: {filtered.length} Pembimbing</span>
      </div>

      {/* Mentors Grid / Cards */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-xs">Memuat data pembimbing...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
          <GraduationCap className="w-8 h-8 opacity-20" />
          <span>Belum ada pembimbing terdaftar.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mentor) => (
            <div
              key={mentor.id}
              className="glass-card p-5 border border-white/10 flex flex-col justify-between gap-4 hover:border-indigo-500/40 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-base border border-purple-500/30">
                      {mentor.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{mentor.full_name}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          mentor.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {mentor.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenEdit(mentor)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
                    title="Edit Data"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{mentor.email}</span>
                  </div>
                  {mentor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{mentor.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Students Summary */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    setSelectedMentor(mentor)
                    setStudentModalOpen(true)
                  }}
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{mentor.assigned_students_count} Siswa Bimbingan</span>
                </button>

                <button
                  onClick={() => handleToggleActive(mentor)}
                  className={`text-[11px] font-medium ${
                    mentor.is_active ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {mentor.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
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
                {editingMentor ? 'Edit Pembimbing' : 'Tambah Pembimbing Baru'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Nama Lengkap Pembimbing *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. Bambang Sutrisno, M.Kom"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Alamat Email (Akun Login Google) *
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingMentor}
                  placeholder="emailpembimbing@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field w-full text-xs disabled:opacity-50"
                />
                {!editingMentor && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Gunakan email Google yang aktif agar pembimbing dapat login langsung via Google OAuth.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
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
                  {submitting ? 'Menyimpan...' : 'Simpan Pembimbing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Assigned Students List */}
      {studentModalOpen && selectedMentor && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-6 border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-white">Daftar Siswa Bimbingan</h3>
                <p className="text-xs text-purple-400 font-medium">{selectedMentor.full_name}</p>
              </div>
              <button
                onClick={() => setStudentModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-white/5 text-xs">
              {selectedMentor.assigned_students?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Belum ada siswa yang ditugaskan ke pembimbing ini.
                </div>
              ) : (
                selectedMentor.assigned_students.map((s: any) => (
                  <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{s.full_name}</p>
                      <p className="text-[11px] text-gray-400">
                        {s.class_name || 'Kelas -'} • {s.major || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                        <Building className="w-3 h-3" /> {s.place_name}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setStudentModalOpen(false)}
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

export default function MentorsPage() {
  return (
    <ToastProvider>
      <MentorsPageContent />
    </ToastProvider>
  )
}
