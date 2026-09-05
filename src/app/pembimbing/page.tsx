'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  GraduationCap,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Building,
  RefreshCw,
  LogOut,
  Search,
  Eye,
  EyeOff,
  X,
  Activity,
  AlertCircle,
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { formatDate, formatTime, getStatusBadge, getStatusEmoji, getStatusLabel, formatLastSeen } from '@/lib/utils'
import NotificationCenter from '@/components/NotificationCenter'
import StudentDetailModal from '@/components/StudentDetailModal'
import { useToast, ToastProvider } from '@/components/Toast'

function PembimbingPortalContent() {
  const router = useRouter()
  const { showToast } = useToast()

  const [mentor, setMentor] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [permits, setPermits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  // Detail modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentModalOpen, setStudentModalOpen] = useState(false)

  // Student CRUD states (Pembimbing only manages students, no superadmin)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<any>(null)
  const [submittingStudent, setSubmittingStudent] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    password: '123',
    phone: '',
    email: '',
    class_name: '',
    major: '',
    start_date: '',
    end_date: '',
    internship_status: 'aktif',
    is_active: true,
  })

  // Permit review modal
  const [selectedPermit, setSelectedPermit] = useState<any>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'disetujui' | 'ditolak'>('disetujui')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      // 1. Get current auth user & verify role
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 1b. Get mentor profile from server API (ensures reliable access bypassing browser RLS)
      let profile: any = null
      try {
        const resProf = await fetch('/api/students/profile')
        if (resProf.ok) {
          const profJson = await resProf.json()
          profile = profJson.profile
        }
      } catch (e) {
        console.warn('Could not load profile from server API:', e)
      }

      if (!profile) {
        const { data: clientProfile } = await supabase
          .from('users')
          .select('*, internship_places(id, name, address)')
          .eq('id', user.id)
          .maybeSingle()
        profile = clientProfile
      }

      if (!profile || (profile.role !== 'pembimbing' && profile.role !== 'superadmin')) {
        router.push('/dashboard')
        return
      }
      setMentor(profile)

      // 2. Fetch permits and stats (both backend endpoints now automatically filter by mentor's internship place)
      const [resPermits, resStudents] = await Promise.all([
        fetch('/api/permits'),
        fetch('/api/admin/stats'),
      ])

      if (resPermits.ok) {
        const pData = await resPermits.json()
        setPermits(pData.permits || [])
      }

      if (resStudents.ok) {
        const sData = await resStudents.json()
        const allFetched = sData.students || []
        // Strict client-side filter to ensure mentor only sees students from their assigned PKL place
        const myStudents = allFetched.filter((s: any) => {
          if (profile?.role === 'superadmin') return true
          const isSamePlace =
            profile?.internship_place_id &&
            (s.internship_place_id === profile.internship_place_id ||
              s.internship_places?.id === profile.internship_place_id)
          const isAssigned = s.mentor?.id === user.id || s.mentor_id === user.id
          return isSamePlace || isAssigned
        })
        setStudents(myStudents)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 25000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // --- STUDENT CRUD HANDLERS (PEMBIMBING ACCESS ONLY FOR STUDENTS, NO SUPERADMIN) ---
  const handleOpenCreate = () => {
    setFormData({
      full_name: '',
      username: '',
      password: '123',
      phone: '',
      email: '',
      class_name: '',
      major: '',
      start_date: '',
      end_date: '',
      internship_status: 'aktif',
      is_active: true,
    })
    setShowPassword(false)
    setCreateModalOpen(true)
  }

  const handleNameChange = (name: string) => {
    const rawClean = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '')
    setFormData((prev) => {
      const isAutoUsername =
        !prev.username ||
        prev.username ===
          prev.full_name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, '')
            .slice(0, prev.username.length)
      return {
        ...prev,
        full_name: name,
        username: isAutoUsername ? rawClean.slice(0, 16) : prev.username,
      }
    })
  }

  const handleCreateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name.trim() || !formData.username.trim()) {
      showToast('Nama lengkap dan Username siswa wajib diisi!', 'error')
      return
    }

    setSubmittingStudent(true)
    try {
      const payload: any = {
        role: 'student', // Strict role: student only
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password || '123',
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        class_name: formData.class_name?.trim() || null,
        major: formData.major?.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        internship_status: formData.internship_status || 'aktif',
        internship_place_id: mentor?.internship_place_id || null,
        mentor_id: mentor?.id || null,
      }

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menambahkan data siswa.')

      showToast(`Siswa "${formData.full_name}" (@${formData.username}) berhasil ditambahkan!`, 'success')
      setCreateModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingStudent(false)
    }
  }

  const handleOpenEdit = (student: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedStudentForEdit(student)
    setFormData({
      full_name: student.full_name || '',
      username: student.username || '',
      password: '',
      phone: student.phone || '',
      email: student.email || '',
      class_name: student.class_name || '',
      major: student.major || '',
      start_date: student.start_date || '',
      end_date: student.end_date || '',
      internship_status: student.internship_status || 'aktif',
      is_active: student.is_active !== false,
    })
    setShowPassword(false)
    setEditModalOpen(true)
  }

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentForEdit) return
    if (!formData.full_name.trim() || !formData.username.trim()) {
      showToast('Nama lengkap dan Username siswa wajib diisi!', 'error')
      return
    }

    setSubmittingStudent(true)
    try {
      const payload: any = {
        full_name: formData.full_name.trim(),
        username: formData.username.trim().toLowerCase(),
        phone: formData.phone?.trim() || null,
        class_name: formData.class_name?.trim() || null,
        major: formData.major?.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        internship_status: formData.internship_status,
        is_active: formData.is_active,
      }

      if (formData.password && formData.password.trim()) {
        payload.password = formData.password.trim()
      }

      const res = await fetch(`/api/students/${selectedStudentForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui data siswa.')

      showToast(`Data siswa "${formData.full_name}" berhasil diperbarui!`, 'success')
      setEditModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingStudent(false)
    }
  }

  const handleOpenDelete = (student: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setStudentToDelete(student)
    setDeleteModalOpen(true)
  }

  const handleDeleteSubmit = async () => {
    if (!studentToDelete) return
    setDeletingStudent(true)
    try {
      const res = await fetch(`/api/students/${studentToDelete.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus siswa.')

      showToast(`Siswa "${studentToDelete.full_name}" berhasil dihapus.`, 'success')
      setDeleteModalOpen(false)
      setStudentToDelete(null)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setDeletingStudent(false)
    }
  }

  const handleOpenReview = (permit: any, type: 'disetujui' | 'ditolak') => {
    setSelectedPermit(permit)
    setActionType(type)
    setRejectionReason('')
    setReviewModalOpen(true)
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPermit) return
    setSubmittingReview(true)

    try {
      const res = await fetch(`/api/permits/${selectedPermit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType,
          rejection_reason: rejectionReason,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memproses pengajuan')

      showToast(json.message || 'Status pengajuan berhasil diperbarui', 'success')
      setReviewModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  const pendingPermits = permits.filter((p) => p.status === 'menunggu')
  const onlineCount = students.filter((s) => s.is_online).length
  const hadirCount = students.filter(
    (s) => s.today_attendance && ['on_time', 'late'].includes(s.today_attendance.check_in_status)
  ).length

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.class_name?.toLowerCase().includes(q) ||
      s.internship_places?.name?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="min-h-screen bg-[#06070d] text-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 h-16 bg-[#0a0d17]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/20">
            🎓
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
              ABSENKU
              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold border border-purple-500/30">
                PEMBIMBING
              </span>
            </span>
            <p className="text-[10px] text-gray-400">Portal Guru Pembimbing PKL</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {mentor?.role === 'superadmin' && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1.5 rounded-xl transition font-bold"
              title="Kembali ke Panel Superadmin"
            >
              <span>⚡</span>
              <span>Panel Superadmin</span>
            </Link>
          )}

          {/* Tombol Tambah Siswa di Topbar */}
          <button
            onClick={handleOpenCreate}
            className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-bold shadow-md shadow-purple-500/20 whitespace-nowrap"
            title="Daftarkan Siswa PKL Baru"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ Tambah Siswa</span>
          </button>

          <NotificationCenter />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3 py-1.5 rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        {/* Welcome Banner */}
        <div className="glass-card p-6 border border-purple-500/20 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="orb orb-purple w-56 h-56 top-[-30px] right-[-30px]" />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>Portal Pembimbing PKL</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              Halo, {mentor?.full_name || 'Bapak/Ibu Pembimbing'}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <span className="text-xs text-gray-400">
                {formatDate(new Date())}
              </span>
              <span className="text-gray-600">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Building className="w-3 h-3 text-purple-400" />
                <span>
                  {mentor?.internship_places?.name
                    ? `Tempat PKL: ${mentor.internship_places.name}`
                    : mentor?.role === 'superadmin'
                    ? 'Semua Tempat PKL (Akses Superadmin)'
                    : 'Belum Ditugaskan ke Tempat PKL'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleOpenCreate}
              className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-lg shadow-purple-500/20"
              title="Daftarkan Siswa PKL Baru"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Siswa Baru</span>
            </button>

            <button
              onClick={async () => {
                setRefreshing(true)
                await loadData()
                showToast('Data bimbingan berhasil diperbarui!', 'success')
              }}
              disabled={refreshing}
              className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-purple-500/30 hover:bg-purple-500/15"
              title="Perbarui data bimbingan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : 'text-gray-400'}`} />
              <span className="hidden sm:inline">{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
            <span className="text-[11px] text-gray-400 font-semibold uppercase">Siswa Bimbingan</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-white">{students.length}</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
          </div>

          <div className="glass-card p-4 border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
            <span className="text-[11px] text-emerald-400 font-semibold uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online Sekarang
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-400">{onlineCount}</span>
              <span className="text-[10px] text-gray-400">Aktif web</span>
            </div>
          </div>

          <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
            <span className="text-[11px] text-gray-400 font-semibold uppercase">Hadir Hari Ini</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-white">{hadirCount}</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5 flex flex-col justify-between">
            <span className="text-[11px] text-amber-400 font-semibold uppercase">Perlu Ditinjau</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-400">{pendingPermits.length}</span>
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Pending Permits Section (Fitur 1) */}
        {pendingPermits.length > 0 && (
          <div className="glass-card p-5 border border-amber-500/30 bg-amber-500/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Permohonan Izin / Sakit Menunggu Persetujuan Anda ({pendingPermits.length})
              </h3>
            </div>

            <div className="divide-y divide-white/10 text-xs">
              {pendingPermits.map((permit) => (
                <div
                  key={permit.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">{permit.users?.full_name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          permit.type === 'sakit'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {permit.type === 'sakit' ? '🏥 Sakit' : '📝 Izin'}
                      </span>
                      <span className="text-gray-400">
                        ({formatDate(permit.start_date)} s/d {formatDate(permit.end_date)})
                      </span>
                    </div>
                    <p className="text-gray-300">Alasan: {permit.reason}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {permit.proof_url && (
                      <button
                        onClick={() => setPreviewImage(permit.proof_url)}
                        className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-indigo-400" />
                        <span>Foto</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenReview(permit, 'disetujui')}
                      className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Setujui</span>
                    </button>
                    <button
                      onClick={() => handleOpenReview(permit, 'ditolak')}
                      className="btn-outline border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tool Bar Khusus Pembimbing PKL */}
        <div className="glass-card p-4 sm:p-5 border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/20 flex-shrink-0">
              <UserPlus className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Tool Pendaftaran & Manajemen Siswa PKL
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  Akses Pembimbing
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Tambahkan akun siswa baru untuk instansi penugasan PKL Anda, perbarui data, atau reset password login.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="btn-primary bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-purple-500/30 flex-shrink-0 active:scale-95 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Siswa Baru</span>
          </button>
        </div>

        {/* Students Table */}
        <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Daftar Siswa Bimbingan</h3>
              <p className="text-xs text-gray-400">
                Kelola data akun siswa dan pantau kehadiran presensi di instansi Anda
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari siswa / kelas / tempat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field text-xs pl-9 w-full"
                />
              </div>

              <button
                onClick={handleOpenCreate}
                className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-lg shadow-purple-500/20 whitespace-nowrap flex-shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tambah Siswa</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">Memuat data siswa...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 px-4 text-center glass-card border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-300 flex items-center justify-center">
                <Users className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Belum Ada Siswa Bimbingan</p>
                <p className="text-xs text-gray-400 max-w-sm mt-1">
                  {search
                    ? 'Tidak ditemukan siswa yang sesuai dengan filter pencarian.'
                    : 'Mulai daftarkan siswa PKL untuk instansi penugasan bimbingan Anda sekarang.'}
                </p>
              </div>
              {!search && (
                <button
                  onClick={handleOpenCreate}
                  className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs py-2.5 px-5 flex items-center gap-2 font-bold rounded-xl shadow-lg shadow-purple-500/25 mt-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Tambah Siswa PKL Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-semibold">
                    <th className="py-3 px-3">Siswa</th>
                    <th className="py-3 px-3">Tempat PKL</th>
                    <th className="py-3 px-3">Status Presence</th>
                    <th className="py-3 px-3">Absensi Hari Ini</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map((s) => {
                    const todayAtt = s.today_attendance

                    return (
                      <tr
                        key={s.id}
                        onClick={() => {
                          setSelectedStudentId(s.id)
                          setStudentModalOpen(true)
                        }}
                        className="hover:bg-white/5 transition cursor-pointer"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs border border-white/10 overflow-hidden flex-shrink-0">
                                {s.avatar_url ? (
                                  <img
                                    src={s.avatar_url}
                                    alt={s.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  s.full_name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                                  s.is_online ? 'bg-emerald-500' : 'bg-slate-500'
                                }`}
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-white">{s.full_name}</p>
                              <p className="text-[10px] text-gray-400">
                                {s.class_name || 'Kelas -'} • {s.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-medium text-gray-200">
                            {s.internship_places?.name || 'Belum Ditempatkan'}
                          </p>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              s.is_online
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                s.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            {s.is_online ? 'Online' : 'Offline'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          {todayAtt ? (
                            <span className={`badge text-[11px] ${getStatusBadge(todayAtt.check_in_status)}`}>
                              <span>{getStatusEmoji(todayAtt.check_in_status)}</span>
                              <span>{getStatusLabel(todayAtt.check_in_status)}</span>
                              {todayAtt.check_in_time && (
                                <span className="text-[10px] opacity-75">
                                  ({formatTime(todayAtt.check_in_time)})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                              Belum Absen
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedStudentId(s.id)
                                setStudentModalOpen(true)
                              }}
                              className="btn-outline text-[11px] py-1 px-2.5 hover:bg-white/10"
                              title="Lihat Detail & Kehadiran"
                            >
                              Detail
                            </button>
                            <button
                              onClick={(e) => handleOpenEdit(s, e)}
                              className="btn-outline border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-[11px] py-1 px-2.5 flex items-center gap-1"
                              title="Edit Data Siswa & Reset Password"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={(e) => handleOpenDelete(s, e)}
                              className="btn-outline border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-[11px] py-1 px-2 flex items-center"
                              title="Hapus Siswa dari Bimbingan"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {reviewModalOpen && selectedPermit && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white">
                {actionType === 'disetujui' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <p className="font-semibold text-white">{selectedPermit.users?.full_name}</p>
                <p className="text-gray-400">
                  Jenis: <span className="font-bold uppercase text-white">{selectedPermit.type}</span>
                </p>
                <p className="text-gray-400">
                  Periode: {formatDate(selectedPermit.start_date)} s/d {formatDate(selectedPermit.end_date)}
                </p>
              </div>

              {actionType === 'disetujui' ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 leading-relaxed">
                  Menyetujui pengajuan ini akan secara otomatis memperbarui rekaman absensi siswa menjadi status{' '}
                  <span className="font-bold uppercase text-white">"{selectedPermit.type}"</span>.
                </div>
              ) : (
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Alasan Penolakan (Wajib Diisi) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: Bukti surat dokter tidak jelas..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`text-xs py-2 px-5 rounded-xl font-bold transition text-white ${
                    actionType === 'disetujui'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submittingReview ? 'Memproses...' : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div
            className="glass-card max-w-xl max-h-[85vh] p-2 overflow-hidden border border-white/20 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Bukti Foto"
              className="max-h-[80vh] w-auto mx-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Create Student Modal (Pembimbing Access) */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-6 border border-white/15 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Tambah Siswa PKL Baru</h3>
                  <p className="text-[11px] text-gray-400">Buat akun akses dan data registrasi peserta didik magang</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tempat PKL & Pembimbing Info Badge */}
            <div className="p-3 mb-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-2.5 text-xs text-purple-200">
              <Building className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">
                  Instansi: {mentor?.internship_places?.name || 'Instansi Penugasan Pembimbing'}
                </p>
                <p className="text-[11px] text-purple-300/80 mt-0.5">
                  Siswa ini akan otomatis terhubung di bawah bimbingan <span className="font-semibold text-white">{mentor?.full_name}</span>.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateStudentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Rizky"
                  value={formData.full_name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="rizky123"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                      })
                    }
                    className="input-field w-full text-xs"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Digunakan siswa untuk login</p>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Password Awal *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Default: 123"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="input-field w-full text-xs pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Standar: 123</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Email Siswa (Opsional)
                  </label>
                  <input
                    type="email"
                    placeholder="siswa@gmail.com (Opsional)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Kelas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: XII RPL 1 / XI TKJ 2"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Jurusan / Program Keahlian
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rekayasa Perangkat Lunak"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Tanggal Mulai PKL
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Tanggal Selesai PKL
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Status Penugasan PKL
                </label>
                <select
                  value={formData.internship_status}
                  onChange={(e) => setFormData({ ...formData, internship_status: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  <option value="aktif">🟢 Aktif (Sedang Berjalan)</option>
                  <option value="selesai">🔵 Selesai Magang</option>
                  <option value="ditarik">🔴 Ditarik / Batal</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-white/5 border border-white/10 text-[11px] text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Akun dibuat dengan hak akses Siswa. Siswa dapat login menggunakan username & password.</span>
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
                  disabled={submittingStudent}
                  className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs py-2 px-5 font-bold shadow-lg shadow-purple-500/20"
                >
                  {submittingStudent ? 'Menyimpan...' : 'Simpan & Buat Akun Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal (Pembimbing Access) */}
      {editModalOpen && selectedStudentForEdit && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-6 border border-white/15 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Edit Data Siswa PKL</h3>
                  <p className="text-[11px] text-gray-400">
                    Perbarui profil atau reset password: {selectedStudentForEdit.full_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStudentSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                      })
                    }
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-300 font-medium">
                      Reset Password (Opsional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, password: '123' })}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-bold"
                    >
                      Reset "123"
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Kosongkan jika tidak ubah"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="input-field w-full text-xs pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    type="tel"
                    placeholder="08123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Email Siswa
                  </label>
                  <input
                    type="email"
                    disabled
                    value={formData.email}
                    className="input-field w-full text-xs opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Kelas
                  </label>
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Jurusan
                  </label>
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
                  <label className="block text-gray-300 font-medium mb-1">
                    Tanggal Mulai PKL
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Tanggal Selesai PKL
                  </label>
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
                  <label className="block text-gray-300 font-medium mb-1">
                    Status Penugasan PKL
                  </label>
                  <select
                    value={formData.internship_status}
                    onChange={(e) => setFormData({ ...formData, internship_status: e.target.value })}
                    className="input-field w-full text-xs"
                  >
                    <option value="aktif">🟢 Aktif (Sedang Berjalan)</option>
                    <option value="selesai">🔵 Selesai Magang</option>
                    <option value="ditarik">🔴 Ditarik / Batal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Status Akun Login
                  </label>
                  <select
                    value={formData.is_active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                    className="input-field w-full text-xs"
                  >
                    <option value="true">🟢 Akun Aktif (Bisa Login)</option>
                    <option value="false">🔴 Nonaktif (Diblokir Sementara)</option>
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
                  disabled={submittingStudent}
                  className="btn-primary bg-purple-600 hover:bg-purple-500 text-xs py-2 px-5 font-bold shadow-lg shadow-purple-500/20"
                >
                  {submittingStudent ? 'Menyimpan...' : 'Simpan Perubahan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Modal (Pembimbing Access) */}
      {deleteModalOpen && studentToDelete && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-sm p-6 border border-rose-500/30 shadow-2xl animate-fade-in-up">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold mb-3 border border-rose-500/30">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Hapus Siswa Bimbingan?</h3>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus data siswa <span className="font-bold text-white">{studentToDelete.full_name}</span>?
              Semua data akun dan rekaman kehadiran siswa ini akan dihapus dari instansi Anda.
            </p>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="btn-outline py-2 px-4"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingStudent}
                onClick={handleDeleteSubmit}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-xl transition"
              >
                {deletingStudent ? 'Menghapus...' : 'Ya, Hapus Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      <StudentDetailModal
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        studentId={selectedStudentId}
      />
    </div>
  )
}

export default function PembimbingPortalPage() {
  return (
    <ToastProvider>
      <PembimbingPortalContent />
    </ToastProvider>
  )
}
