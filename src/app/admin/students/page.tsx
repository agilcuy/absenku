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
  User as UserIcon,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { formatDate } from '@/lib/utils'

export default function AdminStudentsPage() {
  const { showToast } = useToast()

  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)

  // Form states
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/students')
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } catch (err) {
      console.error('Failed to load students:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormEmail('')
    setFormName('')
    setFormPhone('')
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
        body: JSON.stringify({
          email: formEmail,
          full_name: formName,
          phone: formPhone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan peserta didik.')

      showToast('Peserta didik berhasil ditambahkan!', 'success', 'Berhasil')
      setCreateModalOpen(false)
      loadStudents()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (student: any) => {
    setSelectedStudent(student)
    setFormName(student.full_name)
    setFormPhone(student.phone || '')
    setFormActive(student.is_active)
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
        body: JSON.stringify({
          full_name: formName,
          phone: formPhone,
          is_active: formActive,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah data.')

      showToast('Data peserta didik berhasil diperbarui!', 'success', 'Berhasil')
      setEditModalOpen(false)
      loadStudents()
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
      loadStudents()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase()
    return s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Manajemen Peserta Didik
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Kelola daftar siswa PKL yang berhak melakukan absensi dengan akun Google
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn-primary text-xs py-2.5 px-4 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Siswa Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 border border-white/10 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau email siswa..."
          className="bg-transparent text-xs text-white placeholder:text-gray-500 outline-none w-full"
        />
      </div>

      {/* Students Table */}
      <div className="glass-card border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kontak</th>
                <th>Status</th>
                <th>Terdaftar</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-xs text-gray-500">
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-xs text-gray-500">
                    Tidak ada data peserta didik ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {s.avatar_url ? (
                          <img
                            src={s.avatar_url}
                            alt={s.full_name}
                            className="w-8 h-8 rounded-full border border-indigo-500/30 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                            {s.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white text-xs">{s.full_name}</p>
                          <p className="text-[11px] text-gray-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs text-gray-300">
                        {s.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-500" /> {s.phone}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {s.is_active ? (
                        <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                          <CheckCircle className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="badge bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">
                          <XCircle className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs text-gray-400">{formatDate(s.created_at)}</span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Edit Siswa"
                          className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(s)}
                          title="Hapus Siswa"
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE STUDENT MODAL */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Tambah Peserta Didik Baru
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-gray-400 font-medium block mb-1">
                  Email Akun Google <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className="input-field"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Harus sesuai dengan akun Google yang dipakai siswa saat login.
                </p>
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">
                  Nama Lengkap <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama Peserta Didik"
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">
                  Nomor WhatsApp/Telepon (Opsional)
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="0812xxxxxxxx"
                  className="input-field"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-outline py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2 px-4"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Edit Data Peserta Didik
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-gray-400 font-medium block mb-1">Email Google</label>
                <input
                  type="text"
                  disabled
                  value={selectedStudent?.email || ''}
                  className="input-field opacity-60 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Nomor Telepon</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <p className="font-semibold text-white">Status Akun</p>
                  <p className="text-[10px] text-gray-400">Izinkan login ke sistem</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormActive(!formActive)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                    formActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {formActive ? 'Aktif' : 'Nonaktif'}
                </button>
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
                  {submitting ? 'Memperbarui...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card p-6 w-full max-w-sm border border-rose-500/30 shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">Hapus Peserta Didik?</h3>
              <p className="text-xs text-gray-300 mt-2">
                Anda akan menghapus data <b>{selectedStudent?.full_name}</b>.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 text-left">
                ⚠️ <b>Konsekuensi:</b> Semua riwayat kehadiran dan foto yang terkait dengan akun ini akan terhapus secara permanen dari database. Tindakan ini tidak dapat dibatalkan.
              </div>
            </div>

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
    </div>
  )
}
