'use client'

import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  User,
  Building,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle,
  Activity,
  Award,
  Edit3,
  Camera,
  X,
  AlertTriangle,
  Sparkles,
  MessageCircle,
} from 'lucide-react'
import StudentNavbar from '@/components/StudentNavbar'
import { formatDate, formatWhatsAppUrl } from '@/lib/utils'
import { useToast, ToastProvider } from '@/components/Toast'

function StudentProfileContent() {
  const { showToast } = useToast()
  const searchParams = useSearchParams()

  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [availablePlaces, setAvailablePlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    class_name: '',
    major: '',
    internship_place_id: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/students/profile')
      if (res.ok) {
        const json = await res.json()
        const p = json.profile
        setProfile(p)
        setAvailablePlaces(json.places || [])

        setFormData({
          full_name: p.full_name || '',
          username: p.username || '',
          phone: p.phone || '',
          class_name: p.class_name || '',
          major: p.major || '',
          internship_place_id: p.internship_place_id || '',
        })

        // Also fetch attendance statistics
        if (p?.id) {
          const resDetail = await fetch(`/api/students/${p.id}`)
          if (resDetail.ok) {
            const d = await resDetail.json()
            setStats(d.stats)
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setEditModalOpen(true)
    }
  }, [searchParams])

  const handleOpenEdit = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        phone: profile.phone || '',
        class_name: profile.class_name || '',
        major: profile.major || '',
        internship_place_id: profile.internship_place_id || '',
      })
      setAvatarFile(null)
      setAvatarPreview(null)
    }
    setEditModalOpen(true)
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 5 MB', 'error')
      return
    }

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const data = new FormData()
      data.append('full_name', formData.full_name)
      data.append('username', formData.username)
      data.append('phone', formData.phone)
      data.append('class_name', formData.class_name)
      data.append('major', formData.major)
      if (formData.internship_place_id) {
        data.append('internship_place_id', formData.internship_place_id)
      }
      if (avatarFile) {
        data.append('avatar', avatarFile)
      }

      const res = await fetch('/api/students/profile', {
        method: 'PUT',
        body: data,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan biodata')

      showToast('Biodata diri berhasil diperbarui!', 'success')
      setEditModalOpen(false)
      loadProfile()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const isSuperadmin = profile?.role === 'superadmin'
  const isProfileIncomplete =
    !isSuperadmin &&
    (!profile?.class_name || !profile?.major || !profile?.phone || !profile?.username)

  return (
    <div className="min-h-screen bg-[#06070d] text-gray-100 flex flex-col pb-12">
      <StudentNavbar user={profile} />

      <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <User className="w-6 h-6 text-indigo-400" />
              <span>{isSuperadmin ? 'Profil Superadmin & Pembimbing' : 'Profil & Biodata Siswa'}</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {isSuperadmin
                ? 'Data akun pengelola sistem, instruktur pembimbing, dan absensi mandiri'
                : 'Data identitas diri, kelas, jurusan, penempatan PKL, dan rekap kehadiran'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isSuperadmin && (
              <a
                href="/admin"
                className="btn-outline border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
              >
                <span>⚡</span>
                <span>Panel Admin</span>
              </a>
            )}
            <button
              onClick={handleOpenEdit}
              className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 self-start sm:self-auto shadow-lg shadow-indigo-500/20"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profil</span>
            </button>
          </div>
        </div>

        {/* Biodata Incomplete Alert Banner (Khusus Siswa) */}
        {isProfileIncomplete && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">
                  Biodata Diri Anda Belum Lengkap!
                </h4>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Harap isi kelas, jurusan, username, dan nomor WhatsApp agar data absensi dan penempatan PKL Anda valid.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenEdit}
              className="btn-outline border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs py-2 px-3 whitespace-nowrap self-start sm:self-auto font-bold"
            >
              Isi Biodata Sekarang
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs">Memuat profil...</div>
        ) : !profile ? (
          <div className="glass-card p-12 text-center text-gray-400 text-xs">
            Data profil tidak ditemukan.
          </div>
        ) : (
          <>
            {/* Identity Card */}
            <div className="glass-card p-6 border border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-5 relative overflow-hidden">
              <div className="orb orb-purple w-48 h-48 top-[-20px] right-[-20px]" />

              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-3xl font-black border-2 border-white/10 shadow-2xl flex-shrink-0 overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    profile.full_name?.charAt(0).toUpperCase()
                  )}
                </div>
                <button
                  onClick={handleOpenEdit}
                  className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition text-[10px] font-semibold gap-1"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ubah Foto</span>
                </button>
              </div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white">{profile.full_name}</h2>
                  {profile.username && (
                    <span className="text-xs text-indigo-400 font-mono">@{profile.username}</span>
                  )}
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {isSuperadmin ? '👑 Superadmin' : profile.internship_status || 'Aktif'}
                  </span>
                </div>

                <p className="text-xs text-indigo-300 font-medium mb-3">
                  {isSuperadmin
                    ? 'Administrator Utama Sistem & Pembimbing Siswa PKL'
                    : `${profile.class_name ? profile.class_name : 'Kelas belum diisi'} • ${
                        profile.major || 'Jurusan belum diisi'
                      }`}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{profile.phone || 'Nomor HP belum diisi'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Placement & Mentor Cards */}
            {isSuperadmin ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5 border border-indigo-500/20 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase">Instansi Induk</p>
                    <p className="text-sm font-bold text-white mt-0.5 truncate">
                      {profile.internship_places?.name || 'Kominfo Tanggamus (egov)'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Pusat Manajemen Sistem Absensi & E-Government
                    </p>
                  </div>
                </div>

                <div className="glass-card p-5 border border-purple-500/20 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex-shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase">Peran Pembimbing</p>
                    <p className="text-sm font-bold text-white mt-0.5 truncate">
                      Pembimbing Siswa PKL
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Membimbing siswa dan meninjau surat izin di Portal Pembimbing.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5 border border-white/10 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase">Instansi / Tempat PKL</p>
                    <p className="text-sm font-bold text-white mt-0.5 truncate">
                      {profile.internship_places?.name || 'Belum Ditentukan'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {profile.internship_places?.address || 'Pilih tempat PKL pada menu edit biodata'}
                    </p>
                  </div>
                </div>

                <div className="glass-card p-5 border border-white/10 flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex-shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-400 font-semibold uppercase">Pembimbing PKL</p>
                      <p className="text-sm font-bold text-white mt-0.5 truncate">
                        {profile.mentor?.full_name || 'Ditugaskan oleh Admin'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {profile.mentor?.email || 'Hubungi admin sekolah jika belum ada pembimbing'}
                      </p>
                    </div>
                  </div>

                  {profile.mentor?.phone && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] text-gray-300 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        {profile.mentor.phone}
                      </span>
                      <a
                        href={formatWhatsAppUrl(
                          profile.mentor.phone,
                          profile.mentor.full_name,
                          profile.full_name,
                          profile.internship_places?.name
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition active:scale-95"
                        title="Chat WhatsApp Pembimbing"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                        <span>Chat WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PKL Period Timeline */}
            <div className="glass-card p-5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 font-semibold uppercase">Periode Praktik Kerja Lapangan</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {profile.start_date ? formatDate(profile.start_date) : 'Tanggal Mulai (-)'} s/d{' '}
                    {profile.end_date ? formatDate(profile.end_date) : 'Tanggal Selesai (-)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance & Discipline Stats */}
            <div className="glass-card p-5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  Statistik Akumulasi Kehadiran & Disiplin
                </h3>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {stats?.presenceRate ?? 100}% Disiplin
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 font-bold block">Tepat Waktu</span>
                  <span className="text-xl font-black text-white">{stats?.hadir || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-400 font-bold block">Terlambat</span>
                  <span className="text-xl font-black text-white">{stats?.terlambat || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] text-blue-400 font-bold block">Izin</span>
                  <span className="text-xl font-black text-white">{stats?.izin || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[10px] text-purple-400 font-bold block">Sakit</span>
                  <span className="text-xl font-black text-white">{stats?.sakit || 0}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-rose-400 font-bold block">Alfa</span>
                  <span className="text-xl font-black text-white">{stats?.alpha || 0}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Edit Biodata Modal */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isSuperadmin ? 'Edit Data Profil Pengguna' : 'Lengkapi / Edit Biodata Diri'}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {isSuperadmin
                      ? 'Perbarui identitas, username, dan kontak WhatsApp Anda'
                      : 'Pastikan data valid untuk keperluan absensi & penempatan PKL'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-indigo-300" />
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Pilih Foto Profil</span>
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">Maks. 5 MB (JPG, PNG)</p>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-field w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Username Unik</label>
                  <input
                    type="text"
                    placeholder="contoh: ahmad_r"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">No. WhatsApp / HP *</label>
                  <input
                    type="tel"
                    required
                    placeholder="08xxxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Kelas {isSuperadmin ? '(Opsional)' : '*'}
                  </label>
                  <input
                    type="text"
                    required={!isSuperadmin}
                    placeholder="Contoh: XII RPL 1"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Jurusan {isSuperadmin ? '(Opsional)' : '*'}
                  </label>
                  <input
                    type="text"
                    required={!isSuperadmin}
                    placeholder="Contoh: Rekayasa Perangkat Lunak"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Tempat / Instansi PKL {isSuperadmin ? '(Opsional)' : ''}
                </label>
                <select
                  value={formData.internship_place_id}
                  onChange={(e) => setFormData({ ...formData, internship_place_id: e.target.value })}
                  className="input-field w-full text-xs"
                >
                  <option value="">-- Pilih Instansi / Perusahaan PKL --</option>
                  {availablePlaces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.pic_name ? `(PIC: ${p.pic_name})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  {isSuperadmin
                    ? 'Dapat memilih Kominfo Tanggamus (egov) atau membiarkannya default'
                    : 'Pilih tempat instansi PKL yang sudah disediakan oleh admin sekolah.'}
                </p>
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
                  {submitting ? 'Menyimpan...' : 'Simpan Biodata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudentProfilePage() {
  return (
    <ToastProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#06070d] flex items-center justify-center text-gray-400 text-xs">
            Memuat profil...
          </div>
        }
      >
        <StudentProfileContent />
      </Suspense>
    </ToastProvider>
  )
}
