'use client'

import React, { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  User,
  Building,
  GraduationCap,
  Phone,
  Camera,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast, ToastProvider } from '@/components/Toast'

function OnboardingContent() {
  const router = useRouter()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [places, setPlaces] = useState<any[]>([])

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [className, setClassName] = useState('')
  const [major, setMajor] = useState('')
  const [internshipPlaceId, setInternshipPlaceId] = useState('')

  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/students/profile')
        if (res.ok) {
          const json = await res.json()
          const p = json.profile
          setProfile(p)
          setPlaces(json.places || [])

          // Role checks: Superadmin & Pembimbing bypass onboarding completely
          if (p.role === 'superadmin' || p.email?.toLowerCase() === 'mikrotikagil@gmail.com') {
            router.push('/admin')
            return
          }
          if (p.role === 'pembimbing') {
            router.push('/pembimbing')
            return
          }

          // Prefill
          setFullName(p.full_name || '')
          setUsername(p.username || '')
          setPhone(p.phone || '')
          setClassName(p.class_name || '')
          setMajor(p.major || '')

          // Set internship place if already assigned
          if (p.internship_place_id) {
            setInternshipPlaceId(p.internship_place_id)
          }

          // If biodata is already complete, redirect directly to dashboard
          if (p.class_name && p.major && p.phone && p.internship_place_id) {
            router.push('/dashboard')
            return
          }
        } else if (res.status === 401) {
          router.push('/login')
          return
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      showToast('Nama lengkap wajib diisi.', 'error')
      return
    }
    if (!phone.trim()) {
      showToast('Nomor WhatsApp / HP wajib diisi.', 'error')
      return
    }
    if (!className.trim()) {
      showToast('Kelas wajib diisi (contoh: XII RPL 1).', 'error')
      return
    }
    if (!major.trim()) {
      showToast('Jurusan wajib diisi (contoh: Rekayasa Perangkat Lunak).', 'error')
      return
    }
    if (!internshipPlaceId) {
      showToast('Silakan pilih tempat / instansi PKL.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const data = new FormData()
      data.append('full_name', fullName.trim())
      data.append('username', username.trim())
      data.append('phone', phone.trim())
      data.append('class_name', className.trim())
      data.append('major', major.trim())
      data.append('internship_place_id', internshipPlaceId)
      if (avatarFile) {
        data.append('avatar', avatarFile)
      }

      const res = await fetch('/api/students/profile', {
        method: 'PUT',
        body: data,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan biodata')

      showToast('Biodata berhasil disimpan! Mengarahkan ke Dashboard...', 'success')

      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (err: any) {
      showToast(err.message, 'error')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06070d] flex items-center justify-center text-gray-400 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span>Memuat data biodata siswa...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06070d] text-gray-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 pt-safe pb-safe relative overflow-hidden">
      <div className="orb orb-purple w-96 h-96 top-[-50px] right-[-50px]" />
      <div className="orb orb-blue w-96 h-96 bottom-[-50px] left-[-50px]" />

      {/* Top Navbar Header */}
      <header className="max-w-2xl w-full mx-auto flex items-center justify-between py-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/25">
            📋
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              ABSENKU
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                PKL
              </span>
            </span>
            <p className="text-[10px] text-gray-400">Sistem Presensi PKL</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="text-xs text-gray-400 hover:text-rose-400 flex items-center gap-1 bg-white/5 hover:bg-rose-500/10 border border-white/10 px-3 py-1.5 rounded-xl transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </header>

      {/* Main Onboarding Card */}
      <main className="max-w-xl w-full mx-auto my-auto relative z-10 py-6">
        <div className="glass-card p-6 sm:p-8 border border-indigo-500/30 shadow-2xl backdrop-blur-2xl">
          {/* Header info */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Langkah Pertama: Lengkapi Biodata</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              Halo, {profile?.full_name ? profile.full_name.split(' ')[0] : 'Siswa'}! 👋
            </h1>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-md mx-auto">
              Selamat datang di sistem absensi online. Mohon lengkapi biodata diri Anda terlebih dahulu agar Anda dapat mulai melakukan absensi masuk dan pulang.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-indigo-300" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
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
                  <span>{avatarPreview || profile?.avatar_url ? 'Ganti Foto Profil' : 'Pilih Foto Profil (Opsional)'}</span>
                </button>
                <p className="text-[10px] text-gray-400 mt-1">Format JPG, PNG (Maks. 5 MB)</p>
              </div>
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="block text-gray-300 font-medium mb-1">
                Nama Lengkap Siswa *
              </label>
              <input
                type="text"
                required
                placeholder="Nama Lengkap Anda"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field w-full text-xs"
              />
            </div>

            {/* Username & No WA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Username Unik (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="contoh: ahmad_r"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Nomor WhatsApp / HP *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>
            </div>

            {/* Kelas & Jurusan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Kelas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XII RPL 1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Jurusan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rekayasa Perangkat Lunak"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>
            </div>

            {/* Pilihan Tempat PKL Siswa */}
            <div>
              <label className="block text-gray-300 font-medium mb-1">
                Instansi / Tempat PKL *
              </label>
              <select
                required
                value={internshipPlaceId}
                onChange={(e) => setInternshipPlaceId(e.target.value)}
                className="input-field w-full text-xs"
              >
                <option value="">-- Pilih Instansi / Perusahaan PKL --</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.pic_name ? `(${p.pic_name})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-indigo-300 mt-1">
                Pilih instansi atau perusahaan mitra tempat Anda ditugaskan melaksanakan PKL.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 min-h-[48px] text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 active-press"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Menyimpan Biodata...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan Biodata & Mulai Absensi</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-2xl w-full mx-auto text-center text-[11px] text-gray-500 py-2 relative z-10">
        © {new Date().getFullYear()} ABSENKU — Sistem Monitoring & Presensi PKL
      </footer>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<div className="min-h-screen bg-[#06070d]" />}>
        <OnboardingContent />
      </Suspense>
    </ToastProvider>
  )
}
