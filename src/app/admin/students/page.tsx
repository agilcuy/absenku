'use client'

import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Users,
  UserPlus,
  KeyRound,
  Copy,
  MessageCircle,
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
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { formatDate } from '@/lib/utils'
import { cachedFetch, invalidateCache } from '@/lib/apiCache'

function AdminStudentsContent() {
  const { showToast } = useToast()
  const searchParams = useSearchParams()

  const [students, setStudents] = useState<any[]>([])
  const [places, setPlaces] = useState<any[]>([])
  const [mentors, setMentors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'ready' | 'no_username'>('all')

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'student' | 'pembimbing' | 'superadmin'>('student')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [resetStudent, setResetStudent] = useState<any>(null)
  const [newResetPassword, setNewResetPassword] = useState('123')
  const [showResetPass, setShowResetPass] = useState(false)
  const [showCreatePass, setShowCreatePass] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [resetSubmitting, setResetSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    username: '',
    password: '123',
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

  // Load data
  const loadData = useCallback(async (forceFresh = false) => {
    try {
      const [s, p, m] = await Promise.all([
        cachedFetch('/api/students', undefined, 20000, forceFresh),
        cachedFetch('/api/internship-places', undefined, 30000, forceFresh),
        cachedFetch('/api/mentors', undefined, 20000, forceFresh),
      ])
      setStudents(s.students || [])
      setPlaces(p.places || [])
      setMentors(m.mentors || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    invalidateCache('/api/students')
    invalidateCache('/api/internship-places')
    invalidateCache('/api/mentors')
    await loadData(true)
    showToast('Data akun siswa berhasil diperbarui!', 'success')
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  // Check URL query action=create to auto-open modal
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      handleOpenCreate()
    }
  }, [searchParams])

  // Open Create Modal
  const handleOpenCreate = (roleOrEvent?: any) => {
    const role: 'student' | 'pembimbing' | 'superadmin' =
      roleOrEvent === 'pembimbing' || roleOrEvent === 'superadmin'
        ? roleOrEvent
        : 'student'
    setSelectedRole(role)
    setFormData({
      email: '',
      full_name: '',
      username: '',
      password: '123',
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
    setShowCreatePass(false)
    setCreateModalOpen(true)
  }

  // Handle Name Input & Auto Username Suggestion
  const handleNameChange = (name: string) => {
    const rawClean = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')
    setFormData((prev) => {
      const isAutoUsername =
        !prev.username ||
        prev.username === prev.full_name.toLowerCase().trim().replace(/[^a-z0-9]/g, '').slice(0, prev.username.length)
      return {
        ...prev,
        full_name: name,
        username: isAutoUsername ? rawClean.slice(0, 16) : prev.username,
      }
    })
  }

  // Submit Create Unified User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name.trim() || !formData.username.trim()) {
      showToast('Nama lengkap dan Username login wajib diisi!', 'error')
      return
    }

    if (selectedRole === 'pembimbing' && !formData.internship_place_id) {
      showToast('Harap pilih Tempat / Instansi PKL penugasan pembimbing!', 'error')
      return
    }

    setSubmitting(true)
    try {
      const payload: any = {
        role: selectedRole,
        full_name: formData.full_name,
        username: formData.username,
        password: formData.password || '123',
        phone: formData.phone,
        email: formData.email,
      }

      if (selectedRole === 'student') {
        payload.class_name = formData.class_name
        payload.major = formData.major
        payload.internship_place_id = formData.internship_place_id || null
        payload.mentor_id = formData.mentor_id || null
        payload.start_date = formData.start_date || null
        payload.end_date = formData.end_date || null
        payload.internship_status = formData.internship_status || 'aktif'
      } else if (selectedRole === 'pembimbing') {
        payload.internship_place_id = formData.internship_place_id || null
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun pengguna.')

      const roleLabel =
        selectedRole === 'student'
          ? 'Siswa PKL'
          : selectedRole === 'pembimbing'
          ? 'Pembimbing PKL'
          : 'Superadmin'

      showToast(`Akun ${roleLabel} "${formData.full_name}" (@${formData.username}) berhasil dibuat!`, 'success', 'Akun Siap')
      setCreateModalOpen(false)
      invalidateCache('/api/students')
      invalidateCache('/api/mentors')
      invalidateCache('/api/internship-places')
      invalidateCache('/api/admin/stats')
      loadData(true)
    } catch (err: any) {
      showToast(err.message, 'error', 'Gagal Membuat Akun')
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
      password: '',
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

      showToast('Data akun siswa berhasil diperbarui!', 'success', 'Berhasil')
      setEditModalOpen(false)
      invalidateCache('/api/students')
      invalidateCache('/api/admin/stats')
      loadData(true)
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // Open Quick Reset Password Modal
  const handleOpenReset = (student: any) => {
    setResetStudent(student)
    setNewResetPassword('123')
    setShowResetPass(false)
    setResetModalOpen(true)
  }

  // Submit Quick Reset Password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetStudent) return
    if (!newResetPassword.trim()) {
      showToast('Password baru tidak boleh kosong!', 'error')
      return
    }

    setResetSubmitting(true)
    try {
      const res = await fetch(`/api/students/${resetStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newResetPassword.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mereset password.')

      showToast(`Password akun ${resetStudent.full_name} berhasil diubah menjadi: "${newResetPassword}"`, 'success', 'Password Diperbarui')
      setResetModalOpen(false)
      invalidateCache('/api/students')
      loadData(true)
    } catch (err: any) {
      showToast(err.message, 'error', 'Gagal Reset Password')
    } finally {
      setResetSubmitting(false)
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

      showToast('Akun siswa berhasil dihapus dari sistem.', 'success', 'Dihapus')
      setDeleteModalOpen(false)
      invalidateCache('/api/students')
      invalidateCache('/api/admin/stats')
      loadData(true)
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  // Copy Credentials to Clipboard
  const handleCopyCredentials = (student: any) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://absenku-two.vercel.app'
    const username = student.username || student.email
    const text =
      `📋 *AKUN LOGIN SISWA ABSENKU PKL*\n` +
      `👤 *Nama*: ${student.full_name}\n` +
      `🔑 *Username*: ${username}\n` +
      `🔒 *Password*: 123 (atau yang telah ditentukan)\n` +
      `🌐 *Link Login*: ${origin}/login\n\n` +
      `_Silakan buka link di atas dan login dengan username & password Anda._`

    navigator.clipboard.writeText(text)
    setCopiedId(student.id)
    setTimeout(() => setCopiedId(null), 2500)
    showToast(`Kredensial login ${student.full_name} disalin ke clipboard!`, 'success')
  }

  // Share Credentials via WhatsApp
  const handleShareWhatsApp = (student: any) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://absenku-two.vercel.app'
    const username = student.username || student.email
    const text = encodeURIComponent(
      `Halo ${student.full_name},\n\n` +
      `Berikut adalah akun login Anda untuk aplikasi ABSENKU (Sistem Presensi & Jurnal PKL):\n` +
      `👤 Username: ${username}\n` +
      `🔑 Password: 123\n` +
      (student.internship_places?.name ? `🏢 Tempat PKL: ${student.internship_places.name}\n` : '') +
      `🌐 Link Login: ${origin}/login\n\n` +
      `Silakan login untuk melakukan absensi harian dan melengkapi biodata. Terima kasih!`
    )

    const rawPhone = student.phone ? student.phone.replace(/[^0-9]/g, '') : ''
    let waPhone = ''
    if (rawPhone.startsWith('0')) {
      waPhone = '62' + rawPhone.slice(1)
    } else if (rawPhone.startsWith('62')) {
      waPhone = rawPhone
    }

    if (waPhone) {
      window.open(`https://wa.me/${waPhone}?text=${text}`, '_blank')
    } else {
      // Copy to clipboard if no phone number
      navigator.clipboard.writeText(decodeURIComponent(text))
      showToast(`No WhatsApp siswa belum ada. Kredensial telah disalin ke clipboard!`, 'info')
    }
  }

  // Stats calculation
  const totalStudents = students.length
  const readyStudents = students.filter((s) => Boolean(s.username)).length
  const activeStudents = students.filter((s) => s.is_active).length
  const noUsernameCount = totalStudents - readyStudents

  // Filter list
  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase()
    const matchesSearch =
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.username?.toLowerCase().includes(q) ||
      s.class_name?.toLowerCase().includes(q) ||
      s.internship_places?.name?.toLowerCase().includes(q)

    if (!matchesSearch) return false

    if (filterTab === 'ready') return Boolean(s.username)
    if (filterTab === 'no_username') return !s.username
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      {/* =========================================
          HEADER BANNER (Akses Superadmin)
         ========================================= */}
      <div className="glass-card p-6 border border-indigo-500/20 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 font-bold text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Akses Superadmin
            </span>
            <span className="text-gray-500">•</span>
            <span>Manajemen Akun Login Siswa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Kelola Akun Login Siswa PKL
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
            Buat akun login siswa (<b>Username & Password</b>) agar siswa dapat langsung masuk ke aplikasi HP atau web tanpa perlu memasukkan email.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto relative z-10">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2.5 px-3.5 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40 rounded-xl"
            title="Perbarui data siswa"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>

          <button
            id="btn-tambah-akun-siswa"
            onClick={() => handleOpenCreate('student')}
            className="btn-primary text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition"
          >
            <UserPlus className="w-4 h-4 stroke-[2.2]" />
            <span className="font-bold tracking-wide">+ Tambah Akun Pengguna</span>
          </button>
        </div>
      </div>

      {/* =========================================
          SUMMARY CARDS (Top Overview)
         ========================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Siswa</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-white">{totalStudents}</p>
          <span className="text-[10px] text-gray-400 mt-0.5 block">Terdaftar di sistem PKL</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Akun Siap Login</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">{readyStudents}</p>
          <span className="text-[10px] text-emerald-400/80 mt-0.5 block">Memiliki @username aktif</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.02]">
          <div className="flex items-center justify-between text-blue-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Akun Aktif</span>
            <CheckCircle className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-400">{activeStudents}</p>
          <span className="text-[10px] text-blue-400/80 mt-0.5 block">Dapat melakukan absensi</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02]">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Password Bawaan</span>
            <KeyRound className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">123</p>
          <span className="text-[10px] text-amber-400/80 mt-0.5 block">Default akun baru (bisa diganti)</span>
        </div>
      </div>

      {/* =========================================
          QUICK INSTRUCTION CARD
         ========================================= */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm flex-shrink-0">
            💡
          </div>
          <div className="leading-relaxed">
            <p className="font-bold text-white">Cara Praktis Membuatkan Akun Siswa:</p>
            <p className="text-gray-300 text-[11px] mt-0.5">
              Klik <b>"+ Buat Akun Siswa Baru"</b>, lalu masukkan <b>Nama</b> dan <b>Username</b> (contoh bebas: <code>budi</code> / <code>siswa1</code>) dengan password (default <code>123</code>). Berikan ke siswa atau klik tombol <b>Salin</b> / <b>WhatsApp</b> di tabel untuk membagikan akun ke HP siswa!
            </p>
          </div>
        </div>
      </div>

      {/* =========================================
          FILTER & SEARCH BAR
         ========================================= */}
      <div className="glass-card p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama siswa, username (@...), kelas, tempat PKL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field text-xs pl-9 w-full rounded-xl"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl overflow-x-auto self-start sm:self-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Semua ({totalStudents})
          </button>
          <button
            onClick={() => setFilterTab('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              filterTab === 'ready'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Siap Login</span>
            <span className="text-[10px] px-1.5 rounded-full bg-emerald-500/20 text-emerald-400">
              {readyStudents}
            </span>
          </button>
          {noUsernameCount > 0 && (
            <button
              onClick={() => setFilterTab('no_username')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                filterTab === 'no_username'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Belum Ada Username</span>
              <span className="text-[10px] px-1.5 rounded-full bg-amber-500/20 text-amber-400">
                {noUsernameCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================
          STUDENTS & CREDENTIALS TABLE
         ========================================= */}
      <div className="glass-card border border-white/10 overflow-hidden rounded-2xl shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs">Memuat data akun siswa...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-xs flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Tidak ada siswa yang cocok</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {search ? 'Coba ubah kata kunci pencarian Anda.' : 'Belum ada akun siswa terdaftar.'}
              </p>
            </div>
            <button
              onClick={() => handleOpenCreate('student')}
              className="btn-primary text-xs py-2 px-4 rounded-xl mt-2 flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Akun Pengguna</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold bg-black/30">
                  <th className="py-3.5 px-4">Siswa PKL</th>
                  <th className="py-3.5 px-4">Username & Login</th>
                  <th className="py-3.5 px-4">Kontak Siswa</th>
                  <th className="py-3.5 px-4">Tempat PKL & Pembimbing</th>
                  <th className="py-3.5 px-4 text-center">Status Akun</th>
                  <th className="py-3.5 px-4 text-right">Aksi Akun (Kirim / Edit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5 transition group">
                    {/* Siswa PKL */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-violet-600/30 text-indigo-300 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-white/10 shadow-sm">
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
                          <p className="font-bold text-white text-sm group-hover:text-indigo-300 transition">
                            {s.full_name}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {s.class_name ? `${s.class_name} • ` : ''}{s.major || 'Siswa Magang'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Username & Login */}
                    <td className="py-3.5 px-4">
                      {s.username ? (
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            onClick={() => handleCopyCredentials(s)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-xs hover:bg-indigo-500/25 transition group/btn"
                            title="Klik untuk salin info login"
                          >
                            <span>@{s.username}</span>
                            {copiedId === s.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-indigo-400 group-hover/btn:text-white transition" />
                            )}
                          </button>
                          <span className="text-[10px] text-gray-400 truncate max-w-[160px]">
                            {s.email}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                            Belum Ada Username
                          </span>
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="text-[10px] text-indigo-400 hover:underline font-medium"
                          >
                            + Tambah Username
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Kontak Siswa */}
                    <td className="py-3.5 px-4 text-gray-300">
                      {s.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span className="font-mono text-xs text-gray-200">{s.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-[11px] italic">Belum diisi</span>
                      )}
                    </td>

                    {/* Tempat PKL & Pembimbing */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-gray-200 truncate max-w-[180px]">
                        {s.internship_places?.name || '-'}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                        Bim: {s.mentor?.full_name || '-'}
                      </p>
                    </td>

                    {/* Status Akun */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                          s.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {s.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>

                    {/* Aksi Akun */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Tombol Salin Kredensial */}
                        <button
                          onClick={() => handleCopyCredentials(s)}
                          className={`p-2 rounded-xl transition ${
                            copiedId === s.id
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 text-gray-300 hover:text-indigo-300 hover:bg-indigo-500/15 border border-white/5'
                          }`}
                          title="Salin Kredensial Login (Username & Password)"
                        >
                          {copiedId === s.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Tombol Kirim WhatsApp */}
                        <button
                          onClick={() => handleShareWhatsApp(s)}
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition"
                          title="Kirim Akun Login ke WhatsApp Siswa"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        {/* Tombol Ganti / Reset Password */}
                        <button
                          onClick={() => handleOpenReset(s)}
                          className="p-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20 transition"
                          title="Reset Password Akun Siswa"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Tombol Edit Lengkap */}
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition"
                          title="Edit Biodata Siswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Tombol Hapus */}
                        <button
                          onClick={() => handleOpenDelete(s)}
                          className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Hapus Akun Siswa"
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

      {/* =========================================
          MODAL 1: BUAT AKUN PENGGUNA BARU (ROLE ACCESS SELECTOR)
         ========================================= */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-6 border border-indigo-500/30 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto rounded-3xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    selectedRole === 'student'
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : selectedRole === 'pembimbing'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {selectedRole === 'student' ? (
                    <GraduationCap className="w-5 h-5" />
                  ) : selectedRole === 'pembimbing' ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {selectedRole === 'student'
                      ? 'Buat Akun Siswa Baru'
                      : selectedRole === 'pembimbing'
                      ? 'Buat Akun Pembimbing PKL'
                      : 'Buat Akun Superadmin Baru'}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {selectedRole === 'student'
                      ? 'Atur username & password login siswa ke aplikasi'
                      : selectedRole === 'pembimbing'
                      ? 'Atur kredensial & penempatan instansi pembimbing'
                      : 'Atur hak akses & login admin kontrol sistem'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* =========================================
                  MENU AKSES / ROLE SELECTOR (3 OPSI)
                 ========================================= */}
              <div className="space-y-1.5">
                <label className="block text-gray-300 font-bold text-xs">
                  Pilih Menu / Hak Akses Pengguna <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Siswa PKL */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('student')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition text-center ${
                      selectedRole === 'student'
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg ring-2 ring-indigo-500/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <GraduationCap
                      className={`w-5 h-5 ${selectedRole === 'student' ? 'text-indigo-400' : 'text-gray-400'}`}
                    />
                    <span className="font-bold text-xs">Siswa PKL</span>
                    <span className="text-[9px] text-gray-400 leading-tight">Portal Siswa</span>
                  </button>

                  {/* Pembimbing PKL */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('pembimbing')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition text-center ${
                      selectedRole === 'pembimbing'
                        ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg ring-2 ring-purple-500/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Users
                      className={`w-5 h-5 ${selectedRole === 'pembimbing' ? 'text-purple-400' : 'text-gray-400'}`}
                    />
                    <span className="font-bold text-xs">Pembimbing</span>
                    <span className="text-[9px] text-gray-400 leading-tight">Portal Pembimbing</span>
                  </button>

                  {/* Superadmin */}
                  <button
                    type="button"
                    onClick={() => setSelectedRole('superadmin')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition text-center ${
                      selectedRole === 'superadmin'
                        ? 'bg-amber-600/30 border-amber-500 text-white shadow-lg ring-2 ring-amber-500/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <ShieldCheck
                      className={`w-5 h-5 ${selectedRole === 'superadmin' ? 'text-amber-400' : 'text-gray-400'}`}
                    />
                    <span className="font-bold text-xs">Superadmin</span>
                    <span className="text-[9px] text-gray-400 leading-tight">Panel Admin</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Info Banner */}
              {selectedRole === 'student' && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed text-[11px]">
                    <b>Akses Siswa PKL:</b> Cukup isi <b>Nama Lengkap</b>, <b>Username</b>, dan <b>Password</b>. Siswa dapat langsung login ke portal <code>/dashboard</code> untuk presensi GPS, scan QR, dan jurnal harian.
                  </span>
                </div>
              )}

              {selectedRole === 'pembimbing' && (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed text-[11px]">
                    <b>Akses Pembimbing PKL:</b> Pembimbing ditempatkan pada <b>Tempat/Instansi PKL</b> tertentu dan login ke <code>/pembimbing</code> untuk memantau kehadiran serta menyetujui izin siswa pada instansi tersebut.
                  </span>
                </div>
              )}

              {selectedRole === 'superadmin' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed text-[11px]">
                    <b>Akses Superadmin:</b> Memiliki wewenang penuh pada panel <code>/admin</code> untuk mengelola seluruh data siswa, pembimbing, tempat PKL, jam masuk presensi, dan pengaturan sistem.
                  </span>
                </div>
              )}

              {/* Row 1: Nama & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-200 font-bold mb-1">
                    {selectedRole === 'student'
                      ? 'Nama Lengkap Siswa'
                      : selectedRole === 'pembimbing'
                      ? 'Nama Lengkap Pembimbing'
                      : 'Nama Lengkap Superadmin'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      selectedRole === 'student'
                        ? 'Contoh: Ahmad Dahlan'
                        : selectedRole === 'pembimbing'
                        ? 'Contoh: Drs. Bambang Sutrisno'
                        : 'Contoh: Administrator Utama'
                    }
                    value={formData.full_name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="input-field w-full text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-gray-200 font-bold mb-1">
                    Username Login <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                        })
                      }
                      className="input-field w-full text-xs pl-7 rounded-xl font-mono text-indigo-300 font-bold"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Digunakan saat login ke aplikasi</p>
                </div>
              </div>

              {/* Row 2: Password Login & No WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-200 font-bold mb-1">
                    Password Akun <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePass ? 'text' : 'password'}
                      required
                      placeholder="123"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="input-field w-full text-xs pr-9 rounded-xl font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePass(!showCreatePass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showCreatePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Bawaan: <code>123</code> (bebas diganti)</p>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    No. WhatsApp / HP (Opsional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Contoh: 08123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field w-full text-xs rounded-xl"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Untuk kirim info login & notifikasi</p>
                </div>
              </div>

              {/* Email (Opsional jika login Username) */}
              {(selectedRole === 'pembimbing' || selectedRole === 'superadmin') && (
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Alamat Email (Opsional)
                  </label>
                  <input
                    type="email"
                    placeholder={`${formData.username || 'user'}@absenku.local`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field w-full text-xs rounded-xl"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Jika dikosongkan, sistem membuat email otomatis dan user tetap bisa login dengan username.
                  </p>
                </div>
              )}

              {/* =========================================
                  KHUSUS PEMBIMBING: PENEMPATAN INSTANSI PKL
                 ========================================= */}
              {selectedRole === 'pembimbing' && (
                <div className="pt-2 border-t border-purple-500/20">
                  <label className="block text-purple-300 font-bold text-xs mb-1">
                    Tempat / Instansi PKL Penugasan <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={formData.internship_place_id}
                    onChange={(e) => setFormData({ ...formData, internship_place_id: e.target.value })}
                    className="input-field w-full text-xs rounded-xl border-purple-500/30"
                  >
                    <option value="">-- Pilih Tempat / Instansi PKL --</option>
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-purple-300/80 mt-1.5 leading-relaxed">
                    🔒 <b>Penempatan Instansi:</b> Pembimbing ini akan ditempatkan di instansi terpilih dan hanya akan memantau siswa pada instansi tersebut di portal <code>/pembimbing</code>.
                  </p>
                </div>
              )}

              {/* =========================================
                  KHUSUS SISWA: PENEMPATAN & DETAIL PKL
                 ========================================= */}
              {selectedRole === 'student' && (
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Penempatan & Detail PKL Siswa (Opsional)
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 text-[11px] mb-1">Tempat / Instansi PKL</label>
                      <select
                        value={formData.internship_place_id}
                        onChange={(e) => setFormData({ ...formData, internship_place_id: e.target.value })}
                        className="input-field w-full text-xs rounded-xl"
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
                      <label className="block text-gray-400 text-[11px] mb-1">Pembimbing PKL</label>
                      <select
                        value={formData.mentor_id}
                        onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                        className="input-field w-full text-xs rounded-xl"
                      >
                        <option value="">-- Pilih Pembimbing --</option>
                        {mentors.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name} {m.role === 'superadmin' ? '• (Superadmin)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-gray-400 text-[11px] mb-1">Kelas (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Contoh: XII TKJ 1"
                        value={formData.class_name}
                        onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                        className="input-field w-full text-xs rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-[11px] mb-1">Jurusan (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Contoh: TKJ / RPL"
                        value={formData.major}
                        onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                        className="input-field w-full text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-outline text-xs py-2.5 px-4 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`btn-primary text-xs py-2.5 px-5 rounded-xl font-bold flex items-center gap-1.5 shadow-lg ${
                    selectedRole === 'pembimbing'
                      ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/25'
                      : selectedRole === 'superadmin'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25'
                      : 'shadow-indigo-500/25'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Menyimpan...'
                      : selectedRole === 'student'
                      ? 'Simpan & Buat Akun Siswa'
                      : selectedRole === 'pembimbing'
                      ? 'Simpan & Buat Pembimbing'
                      : 'Simpan & Buat Superadmin'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 2: RESET PASSWORD CEPAT (Quick Reset)
         ========================================= */}
      {resetModalOpen && resetStudent && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-sm p-6 border border-amber-500/30 shadow-2xl animate-fade-in-up rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Ganti Password Siswa</h3>
                  <p className="text-[10px] text-gray-400">{resetStudent.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] text-gray-300 block mb-1">Username Siswa:</span>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono font-bold text-indigo-300">
                  @{resetStudent.username || resetStudent.email}
                </div>
              </div>

              <div>
                <label className="block text-gray-200 font-bold mb-1">Password Baru Siswa *</label>
                <div className="relative">
                  <input
                    type={showResetPass ? 'text' : 'password'}
                    required
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="input-field w-full text-xs pr-9 font-mono rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPass(!showResetPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setNewResetPassword('123')}
                    className="text-[10px] text-amber-400 hover:underline font-semibold"
                  >
                    Setel ke "123"
                  </button>
                  <span className="text-gray-500">•</span>
                  <button
                    type="button"
                    onClick={() => setNewResetPassword('123456')}
                    className="text-[10px] text-amber-400 hover:underline font-semibold"
                  >
                    Setel ke "123456"
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="btn-outline text-xs py-2 px-3.5 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="btn-primary bg-amber-600 hover:bg-amber-500 text-xs py-2 px-4 rounded-xl font-bold flex items-center gap-1.5 text-white"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{resetSubmitting ? 'Menyimpan...' : 'Perbarui Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 3: EDIT DATA PESERTA DIDIK LENGKAP
         ========================================= */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-6 border border-white/10 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white text-base">Edit Data Peserta Didik</h3>
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
                    className="input-field w-full text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Username Login</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                    className="input-field w-full text-xs font-mono font-bold text-indigo-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Email Sistem</label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="input-field w-full text-xs opacity-50 cursor-not-allowed rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">No. WhatsApp</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field w-full text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <label className="block text-indigo-300 font-bold mb-1">
                  Ganti / Reset Password Siswa (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field w-full text-xs font-mono rounded-xl"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Ketik password baru (misal: <code>123</code>). Siswa dapat langsung masuk dengan password baru ini.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Kelas</label>
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="input-field w-full text-xs rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Jurusan</label>
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="input-field w-full text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Tempat PKL</label>
                  <select
                    value={formData.internship_place_id}
                    onChange={(e) => setFormData({ ...formData, internship_place_id: e.target.value })}
                    className="input-field w-full text-xs rounded-xl"
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
                    className="input-field w-full text-xs rounded-xl"
                  >
                    <option value="">-- Pilih Pembimbing --</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} {m.role === 'superadmin' ? '• (Superadmin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Status PKL</label>
                  <select
                    value={formData.internship_status}
                    onChange={(e) => setFormData({ ...formData, internship_status: e.target.value })}
                    className="input-field w-full text-xs rounded-xl"
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
                    className="input-field w-full text-xs rounded-xl"
                  >
                    <option value="active">Aktif (Dapat Absen)</option>
                    <option value="inactive">Nonaktif (Diblokir)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5 rounded-xl font-bold"
                >
                  {submitting ? 'Menyimpan...' : 'Perbarui Data Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL 4: HAPUS AKUN SISWA
         ========================================= */}
      {deleteModalOpen && selectedStudent && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-sm p-6 border border-white/10 shadow-2xl animate-fade-in-up text-center rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">Hapus Akun Siswa?</h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <b>{selectedStudent.full_name}</b> (@{selectedStudent.username || selectedStudent.email})? Tindakan ini akan menghapus riwayat kehadiran siswa ini.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="btn-outline text-xs py-2 px-4 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="btn-primary bg-rose-600 hover:bg-rose-500 text-xs py-2 px-5 text-white rounded-xl font-bold"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-gray-400 text-xs">
          Memuat data akun siswa...
        </div>
      }
    >
      <AdminStudentsContent />
    </Suspense>
  )
}
