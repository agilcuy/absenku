'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Mail,
  Phone,
  Building,
  GraduationCap,
  Calendar,
  User as UserIcon,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { formatDate } from '@/lib/utils'

export default function AdminStudentsPage() {
  const { showToast } = useToast()

  const [students, setStudents] = useState<any[]>([])
  const [places, setPlaces] = useState<any[]>([])
  const [mentors, setMentors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    username: '',
    phone: '',
    class_name: '',
    major: '',
    internship_place_id: '',
    mentor_id: '',
    start_date: '',
    end_date: '',
    internship_status: 'aktif',
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [resStudents, resPlaces, resMentors] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/internship-places'),
        fetch('/api/mentors'),
      ])

      if (resStudents.ok) {
        const d = await resStudents.json()
        setStudents(d.students || [])
      }
      if (resPlaces.ok) {
        const d = await resPlaces.json()
        setPlaces(d.places || [])
      }
      if (resMentors.ok) {
        const d = await resMentors.json()
        setMentors(d.mentors || [])
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      email: '',
      full_name: '',
      username: '',
      phone: '',
      class_name: '',
      major: '',
      internship_place_id: '',
      mentor_id: '',
      start_date: '',
      end_date: '',
      internship_status: 'aktif',
      is_active: true,
    })
    setCreateModalOpen(true)
  }

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan peserta didik.')

      showToast('Peserta didik berhasil ditambahkan!', 'success', 'Berhasil')
      setCreateModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (student: any) => {
    setSelectedStudent(student)
    setFormData({
      email: student.email,
      full_name: student.full_name,
      username: student.username || '',
      phone: student.phone || '',
      class_name: student.class_name || '',
      major: student.major || '',
      internship_place_id: student.internship_place_id || '',
      mentor_id: student.mentor_id || '',
      start_date: student.start_date || '',
      end_date: student.end_date || '',
      internship_status: student.internship_status || 'aktif',
      is_active: student.is_active,
    })
    setEditModalOpen(true)
  }

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah data.')

      showToast('Data peserta didik berhasil diperbarui!', 'success', 'Berhasil')
      setEditModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Delete Modal
  const handleOpenDelete = (student: any) => {
    setSelectedStudent(student)
    setDeleteModalOpen(true)
  }

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedStudent) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus siswa.')

      showToast('Peserta didik berhasil dihapus dari sistem.', 'success', 'Dihapus')
      setDeleteModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.username?.toLowerCase().includes(q) ||
      s.class_name?.toLowerCase().includes(q) ||
      s.internship_places?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="glass-card p-6 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Manajemen Pengguna</span>
          </div>
          <h1 className="text-2xl font-black text-white">Data Peserta Didik PKL</h1>
          <p className="text-xs text-gray-400 mt-1">
            Kelola profil lengkap siswa, penempatan instansi mitra, pembimbing, dan periode PKL
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Siswa Baru</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="glass-card p-4 border border-white/10 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, username, kelas, tempat PKL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field text-xs pl-9 w-full"
          />
        </div>
        <span className="text-xs text-gray-400">Total: {filteredStudents.length} Siswa</span>
      </div>

      {/* Table */}
      <div className="glass-card border border-white/10 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs">Memuat data siswa...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
            <Users className="w-8 h-8 opacity-20" />
            <span>Belum ada peserta didik yang terdaftar.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold bg-black/30">
                  <th className="py-3.5 px-4">Nama Siswa</th>
                  <th className="py-3.5 px-4">Kelas & Jurusan</th>
                  <th className="py-3.5 px-4">Tempat PKL & Pembimbing</th>
                  <th className="py-3.5 px-4">Periode PKL</th>
                  <th className="py-3.5 px-4">Status PKL</th>
                  <th className="py-3.5 px-4">Status Akun</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5 transition">
                    {/* Nama Siswa */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-white/10">
                          {s.avatar_url ? (
                            <img
                              src={s.avatar_url}
                              alt={s.full_name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            s.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{s.full_name}</p>
                          <p className="text-[10px] text-gray-400">
                            {s.username ? `@${s.username} • ` : ''}
                            {s.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Kelas & Jurusan */}
                    <td className="py-3.5 px-4 text-gray-300">
                      <p className="font-medium text-white">{s.class_name || '-'}</p>
                      <p className="text-[10px] text-gray-400">{s.major || '-'}</p>
                    </td>

                    {/* Tempat PKL & Pembimbing */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-gray-200 truncate max-w-[170px]">
                        {s.internship_places?.name || '-'}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[170px]">
                        Bim: {s.mentor?.full_name || '-'}
                      </p>
                    </td>

                    {/* Periode PKL */}
                    <td className="py-3.5 px-4 text-gray-300">
                      <p className="text-[11px]">
                        {s.start_date ? formatDate(s.start_date) : '-'} s/d{' '}
                        {s.end_date ? formatDate(s.end_date) : '-'}
                      </p>
                    </td>

                    {/* Status PKL */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          s.internship_status === 'selesai'
                            ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            : s.internship_status === 'belum_mulai'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {s.internship_status || 'aktif'}
                      </span>
                    </td>

                    {/* Status Akun */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          s.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {s.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-6 border border-white/10 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white">Tambah Peserta Didik Baru</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2">
                <span className="text-base">💡</span>
                <span className="leading-relaxed">
                  <b>Cukup masukkan Email & Nama Siswa:</b> Kolom lainnya bersifat opsional karena siswa dapat langsung melengkapi sendiri biodata dirinya (kelas, jurusan, no WhatsApp, foto, & instansi PKL) saat login ke web.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Rizki Pratama"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Username (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Bisa diisi sendiri oleh siswa"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Email Google Login *</label>
                  <input
                    type="email"
                    required
                    placeholder="siswa@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">No. WhatsApp / HP (Opsional)</label>
                  <input
                    type="tel"
                    placeholder="Bisa diisi sendiri oleh siswa"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Kelas (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: XII TKJ 1 (Bisa diisi siswa)"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Jurusan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: RPL (Bisa diisi siswa)"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Tempat / Instansi PKL</label>
                  <select
                    value={formData.internship_place_id}
                    onChange={(e) => setFormData({ ...formData, internship_place_id: e.target.value })}
                    className="input-field w-full text-xs"
                  >
                    <option value="">-- Pilih Tempat PKL --</option>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Pembimbing PKL</label>
                  <select
                    value={formData.mentor_id}
                    onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                    className="input-field w-full text-xs"
                  >
                    <option value="">-- Pilih Pembimbing --</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Tanggal Mulai PKL</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Tanggal Selesai PKL</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Status PKL</label>
                <select
                  value={formData.internship_status}
                  onChange={(e) => setFormData({ ...formData, internship_status: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  <option value="belum_mulai">Belum Mulai</option>
                  <option value="aktif">Sedang Berjalan (Aktif)</option>
                  <option value="selesai">Selesai</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-6 border border-white/10 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white">Edit Data Peserta Didik</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="input-field w-full text-xs opacity-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">No. WhatsApp</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Kelas</label>
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Jurusan</label>
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Tempat PKL</label>
                  <select
                    value={formData.internship_place_id}
                    onChange={(e) => setFormData({ ...formData, internship_place_id: e.target.value })}
                    className="input-field w-full text-xs"
                  >
                    <option value="">-- Pilih Tempat PKL --</option>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Pembimbing PKL</label>
                  <select
                    value={formData.mentor_id}
                    onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                    className="input-field w-full text-xs"
                  >
                    <option value="">-- Pilih Pembimbing --</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Tanggal Mulai PKL</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Tanggal Selesai PKL</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Status PKL</label>
                  <select
                    value={formData.internship_status}
                    onChange={(e) => setFormData({ ...formData, internship_status: e.target.value })}
                    className="input-field w-full text-xs"
                  >
                    <option value="belum_mulai">Belum Mulai</option>
                    <option value="aktif">Sedang Berjalan (Aktif)</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Status Akun</label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                    className="input-field w-full text-xs"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5"
                >
                  {submitting ? 'Menyimpan...' : 'Perbarui Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete */}
      {deleteModalOpen && selectedStudent && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-sm p-6 border border-white/10 shadow-2xl animate-fade-in-up text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Hapus Peserta Didik?</h3>
            <p className="text-xs text-gray-400 mb-4">
              Apakah Anda yakin ingin menghapus data <b>{selectedStudent.full_name}</b>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="btn-outline text-xs py-2 px-4"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="btn-primary bg-rose-600 hover:bg-rose-500 text-xs py-2 px-5 text-white"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
