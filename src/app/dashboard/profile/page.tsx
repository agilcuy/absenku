'use client'

import React, { useEffect, useState } from 'react'
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
} from 'lucide-react'
import StudentNavbar from '@/components/StudentNavbar'
import { formatDate } from '@/lib/utils'

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/attendance/today')
        if (res.ok) {
          const json = await res.json()
          const p = json.userProfile
          setProfile(p)

          // Load detail & stats
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

    loadProfile()
  }, [])

  return (
    <div className="min-h-screen bg-[#06070d] text-gray-100 flex flex-col pb-12">
      <StudentNavbar user={profile} />

      <main className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-400" />
            Profil Peserta Didik
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Informasi identitas, penempatan PKL, pembimbing, dan rekapitulasi kedisiplinan Anda
          </p>
        </div>

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

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white">{profile.full_name}</h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {profile.internship_status || 'Aktif'}
                  </span>
                </div>

                <p className="text-xs text-indigo-300 font-medium mb-3">
                  {profile.class_name ? `${profile.class_name}` : 'Kelas belum diset'} •{' '}
                  {profile.major || 'Jurusan belum diset'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Placement & Mentor Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card p-5 border border-white/10 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex-shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase">Instansi / Tempat PKL</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">
                    {profile.internship_places?.name || 'Belum Ditempatkan'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {profile.internship_places?.address || 'Alamat instansi belum diisi'}
                  </p>
                </div>
              </div>

              <div className="glass-card p-5 border border-white/10 flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex-shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase">Pembimbing PKL</p>
                  <p className="text-sm font-bold text-white mt-0.5 truncate">
                    {profile.mentor?.full_name || 'Belum Ditugaskan'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {profile.mentor?.email || 'Hubungi admin sekolah untuk penugasan'}
                  </p>
                </div>
              </div>
            </div>

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

            {/* Attendance & Discipline Stats (Fitur 17) */}
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
    </div>
  )
}
