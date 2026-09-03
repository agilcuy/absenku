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
  X,
  Activity,
  AlertCircle,
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

      // 2. Fetch permits (auto filtered by mentor backend)
      const [resPermits, resStudents] = await Promise.all([
        fetch('/api/permits'),
        fetch('/api/admin/stats'), // gives all students with presence
      ])

      if (resPermits.ok) {
        const pData = await resPermits.json()
        setPermits(pData.permits || [])
      }

      if (resStudents.ok) {
        const sData = await resStudents.json()
        // Filter students where mentor_id === user.id
        const myStudents = (sData.students || []).filter(
          (s: any) => s.mentor?.id === user.id || s.mentor_id === user.id
        )
        setStudents(myStudents)
      }

      // Get mentor user info
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'pembimbing' && profile?.role !== 'superadmin') {
        router.push('/dashboard')
        return
      }
      setMentor(profile)
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
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(new Date())} · Pantau kehadiran dan tinjau surat izin siswa bimbingan Anda
            </p>
          </div>

          <button
            onClick={() => {
              setRefreshing(true)
              loadData()
            }}
            disabled={refreshing}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>
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

        {/* Students Table */}
        <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Daftar Siswa Bimbingan</h3>
              <p className="text-xs text-gray-400">
                Pantau kehadiran real-time dan tempat instansi PKL setiap siswa
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa / kelas / tempat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field text-xs pl-9 w-full"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">Memuat data siswa...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Belum ada siswa yang ditugaskan ke bimbingan Anda.
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedStudentId(s.id)
                              setStudentModalOpen(true)
                            }}
                            className="btn-outline text-[11px] py-1 px-2.5"
                          >
                            Detail
                          </button>
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
