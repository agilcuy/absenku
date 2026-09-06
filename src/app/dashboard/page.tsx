'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import StudentNavbar from '@/components/StudentNavbar'
import MobileBottomNav from '@/components/MobileBottomNav'
import CameraCaptureModal from '@/components/CameraCaptureModal'
import BiodataAlertModal from '@/components/BiodataAlertModal'
import GpsLocationBadge from '@/components/GpsLocationBadge'
import LeafletMapModal from '@/components/LeafletMapModal'
import MentorContactCard from '@/components/MentorContactCard'
import { ToastProvider, useToast } from '@/components/Toast'
import {
  formatDate,
  formatTime,
  getStatusBadge,
  getStatusEmoji,
  getStatusLabel,
  isCheckInAllowed,
  isCheckOutAllowed,
  formatOvertimeDuration,
  formatOvertimeShort,
} from '@/lib/utils'
import { calculateDistanceMeters, DEFAULT_OFFICE_COORDS, getPlaceCoordinates } from '@/lib/geo'
import {
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  Eye,
  Info,
  RefreshCw,
  Network,
  BookOpen,
  ChevronRight,
  FileText,
  Zap,
  UserCircle,
  Building,
  Flame,
  ArrowUpRight,
  Megaphone,
  Pin,
  X,
} from 'lucide-react'

function StudentDashboardContent() {
  const router = useRouter()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<any>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([])

  // Live digital clock updater (WIB)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Modals state
  const [cameraModalOpen, setCameraModalOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<'check_in' | 'check_out'>('check_in')
  const [submitting, setSubmitting] = useState(false)
  const [biodataModalOpen, setBiodataModalOpen] = useState(false)
  const [hasAutoOpenedBiodata, setHasAutoOpenedBiodata] = useState(false)

  // Map & Photo Preview modal
  const [mapModal, setMapModal] = useState<{
    isOpen: boolean
    lat: number
    lng: number
    title: string
    address?: string
  }>({
    isOpen: false,
    lat: 0,
    lng: 0,
    title: '',
  })

  const [photoPreviewModal, setPhotoPreviewModal] = useState<{
    isOpen: boolean
    url: string
    title: string
  }>({
    isOpen: false,
    url: '',
    title: '',
  })

  // Fetch today's data, announcements, and verify authentication
  const loadDashboardData = useCallback(async () => {
    try {
      const [resToday, resAnnounce] = await Promise.all([
        fetch('/api/attendance/today'),
        fetch('/api/announcements'),
      ])

      // If user session is unauthenticated or expired, auto-redirect to login
      if (resToday.status === 401) {
        router.replace('/login')
        return
      }

      if (resToday.ok) {
        const json = await resToday.json()
        setData(json)
        if (json.userProfile) {
          setUserProfile(json.userProfile)
          // If a mentor logs in here, redirect to mentor portal
          if (json.userProfile.role === 'pembimbing') {
            router.replace('/pembimbing')
            return
          }
        }
      }

      if (resAnnounce.ok) {
        const aJson = await resAnnounce.json()
        setAnnouncements(aJson.announcements || [])
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Student profile completeness evaluation
  const isStudent = userProfile && userProfile.role === 'student'
  const missingBiodata: { key: string; label: string; desc: string }[] = []
  if (isStudent) {
    if (!userProfile?.class_name?.trim()) {
      missingBiodata.push({
        key: 'class_name',
        label: 'Kelas',
        desc: 'Contoh: XII RPL 1, XII TKJ 2',
      })
    }
    if (!userProfile?.major?.trim()) {
      missingBiodata.push({
        key: 'major',
        label: 'Jurusan',
        desc: 'Contoh: Rekayasa Perangkat Lunak, Multimedia',
      })
    }
    if (!userProfile?.phone?.trim()) {
      missingBiodata.push({
        key: 'phone',
        label: 'No. WhatsApp / HP',
        desc: 'Nomor WhatsApp aktif untuk koordinasi pembimbing PKL',
      })
    }
    if (!userProfile?.internship_place_id) {
      missingBiodata.push({
        key: 'internship_place_id',
        label: 'Tempat / Instansi PKL',
        desc: 'Instansi tempat pelaksanaan Praktik Kerja Lapangan Anda',
      })
    }
  }
  const isProfileIncomplete = isStudent && missingBiodata.length > 0

  // Auto-alert student upon initial load if biodata is incomplete
  useEffect(() => {
    if (isProfileIncomplete && !hasAutoOpenedBiodata && !loading) {
      setBiodataModalOpen(true)
      setHasAutoOpenedBiodata(true)
    }
  }, [isProfileIncomplete, hasAutoOpenedBiodata, loading])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    showToast('Status presensi berhasil diperbarui!', 'success')
  }

  // Handle Action Trigger (Check-In / Check-Out)
  const handleInitiateAction = (action: 'check_in' | 'check_out') => {
    if (isProfileIncomplete) {
      showToast(
        `Anda wajib melengkapi biodata diri (${missingBiodata.map((m) => m.label).join(', ')}) di menu Profil sebelum dapat melakukan absensi!`,
        'error',
        '⚠️ Biodata Belum Lengkap'
      )
      setBiodataModalOpen(true)
      return
    }

    if (action === 'check_in') {
      if (!isCheckInAllowed('06:00:00')) {
        const scheduleEnd = data?.settings?.check_in_time ? data.settings.check_in_time.substring(0, 5) : '08:30'
        showToast(
          `Absensi masuk belum dibuka. Absensi pagi dibuka mulai pukul 06:00 s.d ${scheduleEnd} WIB.`,
          'warning',
          'Belum Waktunya Masuk'
        )
        return
      }
    }

    if (action === 'check_out') {
      const checkOutConfig = data?.settings?.check_out_time || '16:30:00'
      if (!isCheckOutAllowed(checkOutConfig)) {
        const timeStr = checkOutConfig.substring(0, 5)
        showToast(
          `Absensi pulang belum tersedia. Absensi pulang dapat dilakukan mulai pukul ${timeStr} s.d 24:00 (12 malam) WIB.`,
          'warning',
          'Belum Waktunya Pulang'
        )
        return
      }
    }

    if (!coords) {
      showToast(
        'Sinyal GPS belum aktif! Harap izinkan akses lokasi (GPS) pada browser/HP Anda untuk melakukan absensi.',
        'error',
        'GPS Diperlukan'
      )
      return
    }

    if (isStudent) {
      const place = userProfile?.internship_places || null
      const resolved = getPlaceCoordinates(place)
      const placeLat = resolved?.lat ?? (place?.latitude || DEFAULT_OFFICE_COORDS.lat)
      const placeLng = resolved?.lng ?? (place?.longitude || DEFAULT_OFFICE_COORDS.lng)
      const placeRadius = resolved?.radiusMeters ?? (place?.radius_meters || DEFAULT_OFFICE_COORDS.radiusMeters)
      const placeName = resolved?.name || place?.name || DEFAULT_OFFICE_COORDS.name

      const distance = calculateDistanceMeters(coords.lat, coords.lng, placeLat, placeLng)
      if (distance > placeRadius) {
        showToast(
          `Anda terdeteksi berjarak ${Math.round(distance)} meter dari ${placeName}. Batas maksimal absensi adalah radius ${placeRadius} meter. Harap lakukan absensi langsung di area kantor!`,
          'error',
          '⚠️ Di Luar Radius Lokasi PKL'
        )
        return
      }
    }

    setActiveAction(action)
    setCameraModalOpen(true)
  }

  const handleCameraModalClose = () => {
    setCameraModalOpen(false)
    showToast(
      'Absensi belum tercatat. Anda wajib menyertakan foto bukti kehadiran di lokasi PKL agar absensi dapat dicatat.',
      'warning',
      '⚠️ Foto Wajib Disertakan'
    )
  }

  const handlePhotoConfirmed = async (photoFile: File) => {
    if (!photoFile || photoFile.size === 0) {
      showToast(
        'Foto kehadiran wajib dilampirkan! Absensi Anda tidak akan tercatat tanpa foto.',
        'error',
        'Foto Wajib'
      )
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('photo', photoFile)
      if (coords) {
        formData.append('lat', coords.lat.toString())
        formData.append('lng', coords.lng.toString())
      }

      const endpoint =
        activeAction === 'check_in' ? '/api/attendance/check-in' : '/api/attendance/check-out'

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const resJson = await res.json()

      if (!res.ok) {
        throw new Error(resJson.error || 'Gagal menyimpan absensi.')
      }

      if (activeAction === 'check_in') {
        const isLate = resJson.status === 'late'
        showToast(
          isLate
            ? 'Absensi masuk tercatat: Terlambat. Tetap semangat bertugas!'
            : 'Absensi masuk tercatat: Tepat Waktu. Luar biasa!',
          isLate ? 'warning' : 'success',
          isLate ? '⚠️ Absensi Berhasil (Terlambat)' : '✅ Absensi Berhasil'
        )
      } else {
        if (resJson.isOvertime && resJson.overtimeFormatted) {
          showToast(
            `Absensi pulang berhasil dicatat (⚡ Durasi Lembur: ${resJson.overtimeFormatted}). Terima kasih atas dedikasi kerja Anda!`,
            'success',
            '⚡ Lembur Berhasil Dicatat'
          )
        } else {
          showToast('Absensi pulang berhasil dicatat. Selamat beristirahat!', 'success', '✅ Absensi Pulang')
        }
      }

      await loadDashboardData()
    } catch (err: any) {
      showToast(err.message, 'error', 'Gagal Absen')
    } finally {
      setSubmitting(false)
      setCameraModalOpen(false)
    }
  }

  const attendance = data?.attendance
  const settings = data?.settings
  const stats = data?.stats
  const isHoliday = data?.isHoliday
  const isWorkingDay = data?.isWorkingDay

  // Check photos
  const checkInPhoto = attendance?.attendance_photos?.find((p: any) => p.type === 'check_in')
  const checkOutPhoto = attendance?.attendance_photos?.find((p: any) => p.type === 'check_out')

  const hasCheckedIn = !!attendance?.check_in_time
  const hasCheckedOut = !!attendance?.check_out_time

  // If mentor role reaches this dashboard, redirect immediately
  if (userProfile?.role === 'pembimbing') {
    return (
      <div className="min-h-screen bg-[#06070d] text-gray-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center text-3xl font-bold shadow-xl shadow-purple-500/20 animate-pulse">
          🎓
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Akun Pembimbing PKL Terdeteksi</h2>
          <p className="text-xs text-gray-400 max-w-sm mt-1 leading-relaxed">
            Mengarahkan Anda ke Portal Pembimbing PKL...
          </p>
        </div>
        <Link
          href="/pembimbing"
          className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 text-xs py-2.5 px-6 font-bold rounded-xl shadow-lg shadow-purple-500/25"
        >
          Buka Portal Pembimbing →
        </Link>
      </div>
    )
  }

  // Smooth Skeleton Loader on initial fetch
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 pb-safe-nav">
        <StudentNavbar user={userProfile} isProfileIncomplete={false} />
        <main className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 space-y-5 animate-pulse">
          <div className="h-28 rounded-2xl bg-white/5 border border-white/10" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-5">
              <div className="h-64 rounded-2xl bg-white/5 border border-white/10" />
              <div className="h-44 rounded-2xl bg-white/5 border border-white/10" />
            </div>
            <div className="lg:col-span-5 space-y-5">
              <div className="h-32 rounded-2xl bg-white/5 border border-white/10" />
              <div className="h-48 rounded-2xl bg-white/5 border border-white/10" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  const studentShortName = userProfile?.full_name ? userProfile.full_name.split(' ')[0] : 'Siswa'
  const placeName = userProfile?.internship_places?.name || 'Instansi Penugasan PKL'
  const placeAddress = userProfile?.internship_places?.address || ''

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 pb-safe-nav">
      <StudentNavbar user={userProfile} isProfileIncomplete={isProfileIncomplete} />

      <main className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6 space-y-5">
        {/* ========================================================
            1. TOP PROFILE & LIVE TIME BAR (Compact, Modern, Neat)
           ======================================================== */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-indigo-500/20 shadow-xl relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/30">
          <div className="orb orb-purple w-44 h-44 top-[-30px] right-[-30px] pointer-events-none opacity-40" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            {/* Student Info */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-lg shadow-indigo-500/25 flex-shrink-0">
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  (studentShortName.charAt(0) || 'S').toUpperCase()
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Halo, {studentShortName}!
                  </h2>
                  <div className={`badge text-[10px] py-0.5 px-2 ${getStatusBadge(attendance?.check_in_status)}`}>
                    <span>{getStatusEmoji(attendance?.check_in_status)}</span>
                    <span>{getStatusLabel(attendance?.check_in_status)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                    <Building className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="truncate max-w-[200px] sm:max-w-xs">{placeName}</span>
                  </span>
                  {(userProfile?.class_name || userProfile?.major) && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-300">
                        {userProfile.class_name} {userProfile.major ? `(${userProfile.major})` : ''}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live Clock & Refresh Action */}
            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
              <div className="text-left sm:text-right">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{formatDate(new Date())}</span>
                </div>
                <div className="font-mono text-sm sm:text-base font-black text-indigo-300 tracking-tight mt-0.5 flex items-center sm:justify-end gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{currentTime || '08:00 WIB'}</span>
                </div>
              </div>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 active:scale-95 transition flex items-center justify-center flex-shrink-0"
                title="Segarkan status data absensi"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Holiday / Non-working day notification */}
          {isHoliday && (
            <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Hari ini Libur Resmi: <b>{data.holidayName}</b>. Presensi kehadiran tidak wajib.</span>
            </div>
          )}

          {!isHoliday && !isWorkingDay && (
            <div className="mt-3.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2 text-xs text-blue-300">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Hari ini bukan hari kerja operasional PKL. Sistem absensi tidak diwajibkan.</span>
            </div>
          )}
        </div>

        {/* Biodata Incomplete Alert Banner */}
        {isProfileIncomplete && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-amber-500/20 border border-amber-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                  Lengkapi Biodata Siswa
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                    {missingBiodata.length} Belum Diisi
                  </span>
                </h4>
                <p className="text-xs text-amber-200/90 mt-0.5">
                  Harap isi: <b className="text-white">{missingBiodata.map((m) => m.label).join(', ')}</b> agar dapat melakukan absensi.
                </p>
              </div>
            </div>

            <button
              onClick={() => setBiodataModalOpen(true)}
              className="btn-primary text-xs py-2 px-4 font-bold whitespace-nowrap shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 self-start sm:self-auto"
            >
              <span>Lengkapi Sekarang</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Active Broadcast Announcements (Global or Specific to this Student's PKL Place) */}
        {announcements
          .filter((a) => !dismissedAnnouncements.includes(a.id))
          .map((a) => {
            const isUrgent = a.type === 'urgent'
            const isWarning = a.type === 'warning'
            const isSuccess = a.type === 'success'

            const borderClass = isUrgent
              ? 'border-rose-500/50 bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-rose-950/20'
              : isWarning
              ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-amber-950/20'
              : isSuccess
              ? 'border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-emerald-950/20'
              : 'border-blue-500/40 bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-indigo-950/20'

            const badgeBg = isUrgent
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : isWarning
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : isSuccess
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'

            const iconColor = isUrgent
              ? 'text-rose-400'
              : isWarning
              ? 'text-amber-400'
              : isSuccess
              ? 'text-emerald-400'
              : 'text-blue-400'

            return (
              <div
                key={a.id}
                className={`p-4 rounded-2xl border ${borderClass} shadow-xl relative overflow-hidden animate-fade-in`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${badgeBg}`}
                    >
                      <Megaphone className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeBg}`}
                        >
                          {a.type === 'urgent'
                            ? 'MENDESAK'
                            : a.type === 'warning'
                            ? 'PERINGATAN'
                            : a.type === 'success'
                            ? 'PEMBERITAHUAN'
                            : 'INFORMASI'}
                        </span>

                        {a.is_pinned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" />
                            Disematkan
                          </span>
                        )}

                        <span className="text-[11px] text-gray-400">
                          {a.place?.name ? `🏢 Khusus: ${a.place.name}` : '🌐 Pengumuman Pusat'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-white">{a.title}</h4>
                      <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                        {a.content}
                      </p>

                      <div className="text-[10px] text-gray-400 pt-1 flex items-center gap-2">
                        <span>
                          Oleh: <b>{a.author?.full_name || 'Pembimbing / Admin'}</b>
                        </span>
                        <span>•</span>
                        <span>{formatDate(a.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setDismissedAnnouncements((prev) => [...prev, a.id])}
                    className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition flex-shrink-0"
                    title="Tutup pengumuman"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}

        {/* ========================================================
            2. MAIN DUAL-COLUMN LAYOUT
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: HERO PRESENSI & QUICK ACTION HUB */}
          <div className="lg:col-span-7 space-y-5">
            {/* HERO PRESENSI CARD */}
            <div className="glass-card p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-white">Presensi Kehadiran Hari Ini</h3>
                </div>
                <span className="text-[11px] text-gray-400 font-mono">
                  {formatDate(new Date())}
                </span>
              </div>

              {/* DUAL CHECK-IN / CHECK-OUT BOXES */}
              <div className="grid grid-cols-2 gap-3">
                {/* Masuk Box */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 font-semibold">Absen Masuk</span>
                      {hasCheckedIn && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="Sudah Absen Masuk" />
                      )}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono tracking-tight">
                      {attendance?.check_in_time ? formatTime(attendance.check_in_time) : '--:--'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Batas: 06:00 - {settings?.check_in_time ? settings.check_in_time.substring(0, 5) : '08:30'} WIB
                    </div>
                  </div>

                  {hasCheckedIn && (
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/5">
                      {checkInPhoto && (
                        <button
                          onClick={() =>
                            setPhotoPreviewModal({
                              isOpen: true,
                              url: checkInPhoto.photo_url,
                              title: 'Foto Absensi Masuk',
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" /> Foto
                        </button>
                      )}
                      {attendance?.check_in_lat && attendance?.check_in_lng && (
                        <button
                          onClick={() =>
                            setMapModal({
                              isOpen: true,
                              lat: attendance.check_in_lat,
                              lng: attendance.check_in_lng,
                              title: 'Lokasi Absensi Masuk',
                              address: attendance.check_in_address,
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <MapPin className="w-3 h-3" /> Peta
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pulang Box */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 font-semibold">Absen Pulang</span>
                      {attendance?.is_overtime && attendance?.overtime_minutes > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ⚡ Lembur
                        </span>
                      )}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono tracking-tight">
                      {attendance?.check_out_time ? formatTime(attendance.check_out_time) : '--:--'}
                    </div>
                    {attendance?.is_overtime && attendance?.overtime_minutes > 0 ? (
                      <div className="text-[10px] font-bold text-amber-300 mt-1">
                        +{formatOvertimeDuration(attendance.overtime_minutes)}
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-400 mt-1">
                        Mulai: {userProfile?.internship_places?.work_end_time?.substring(0, 5) || settings?.check_out_time?.substring(0, 5) || '16:30'} WIB
                      </div>
                    )}
                  </div>

                  {hasCheckedOut && (
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/5">
                      {checkOutPhoto && (
                        <button
                          onClick={() =>
                            setPhotoPreviewModal({
                              isOpen: true,
                              url: checkOutPhoto.photo_url,
                              title: 'Foto Absensi Pulang',
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" /> Foto
                        </button>
                      )}
                      {attendance?.check_out_lat && attendance?.check_out_lng && (
                        <button
                          onClick={() =>
                            setMapModal({
                              isOpen: true,
                              lat: attendance.check_out_lat,
                              lng: attendance.check_out_lng,
                              title: 'Lokasi Absensi Pulang',
                              address: attendance.check_out_address,
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <MapPin className="w-3 h-3" /> Peta
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTON (Ergonomic & Touch-Friendly) */}
              <div className="pt-1">
                {!hasCheckedIn ? (
                  <button
                    id="btn-absen-masuk"
                    onClick={() => handleInitiateAction('check_in')}
                    disabled={submitting}
                    className="btn-primary w-full py-3.5 sm:py-4 text-sm font-black justify-center rounded-2xl shadow-xl shadow-indigo-500/30 active:scale-95 transition tracking-wider flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5 stroke-[2.2]" />
                    <span>ABSEN MASUK SEKARANG</span>
                  </button>
                ) : !hasCheckedOut ? (
                  <button
                    id="btn-absen-pulang"
                    onClick={() => handleInitiateAction('check_out')}
                    disabled={submitting}
                    className="w-full py-3.5 sm:py-4 text-sm font-black rounded-2xl justify-center flex items-center gap-2 transition active:scale-95 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-500/25 tracking-wider"
                  >
                    <Camera className="w-5 h-5 stroke-[2.2]" />
                    <span>ABSEN PULANG SEKARANG</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Absensi Hari Ini Telah Lengkap (Masuk & Pulang)</span>
                  </div>
                )}
              </div>

              {/* GPS SENSOR & GEOFENCING STATUS */}
              <GpsLocationBadge
                onLocationFound={(found) => setCoords(found)}
                targetCoords={(() => {
                  const place = userProfile?.internship_places || null
                  const resolved = getPlaceCoordinates(place)
                  if (resolved) {
                    return {
                      lat: resolved.lat,
                      lng: resolved.lng,
                      radiusMeters: resolved.radiusMeters,
                      name: resolved.name,
                    }
                  }
                  if (place?.latitude && place?.longitude) {
                    return {
                      lat: Number(place.latitude),
                      lng: Number(place.longitude),
                      radiusMeters: place.radius_meters ? Number(place.radius_meters) : 200,
                      name: place.name || 'Tempat PKL',
                    }
                  }
                  return null
                })()}
              />
            </div>

            {/* ========================================================
                QUICK ACTION HUB (6 Menu Lengkap - 1-Tap Access)
               ======================================================== */}
            <div className="glass-card p-5 rounded-2xl border border-white/10 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-black text-white">Menu & Layanan Siswa PKL</h3>
                </div>
                <span className="text-[11px] text-gray-400">6 Menu Utama</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* 1. Izin & Sakit */}
                <Link
                  href="/dashboard/permits"
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/25 group-hover:scale-110 transition">
                      <FileText className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 transition" />
                  </div>
                  <div className="mt-3">
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                      Izin & Sakit
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                      Surat dokter & dispensasi
                    </p>
                  </div>
                </Link>

                {/* 2. Jurnal PKL (Logbook) */}
                <Link
                  href="/dashboard/journals"
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25 group-hover:scale-110 transition">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-400 transition" />
                  </div>
                  <div className="mt-3">
                    <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                      Jurnal Kegiatan
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                      Logbook harian & paraf
                    </p>
                  </div>
                </Link>

                {/* 3. Rekap Lembur */}
                <Link
                  href="/dashboard/overtime"
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/25 group-hover:scale-110 transition">
                      <Zap className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-amber-400 transition" />
                  </div>
                  <div className="mt-3">
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                      Rekap Lembur
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                      Riwayat jam tambahan
                    </p>
                  </div>
                </Link>

                {/* 4. Riwayat Presensi */}
                <Link
                  href="/dashboard/history"
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/30 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/25 group-hover:scale-110 transition">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400 transition" />
                  </div>
                  <div className="mt-3">
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition">
                      Riwayat Absensi
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                      Kalender & log kehadiran
                    </p>
                  </div>
                </Link>

                {/* 5. Topologi & SOP Teknis */}
                <Link
                  href="/dashboard/structure"
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/25 group-hover:scale-110 transition">
                      <Network className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 transition" />
                  </div>
                  <div className="mt-3">
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                      Topologi & SOP
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                      Hierarki & alur eskalasi
                    </p>
                  </div>
                </Link>

                {/* 6. Profil Siswa */}
                <Link
                  href="/dashboard/profile"
                  className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 transition group flex flex-col justify-between relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/25 group-hover:scale-110 transition">
                      <UserCircle className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-400 transition" />
                  </div>
                  <div className="mt-3">
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition flex items-center gap-1.5">
                      Profil Siswa
                      {isProfileIncomplete && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                      Biodata diri & akun
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PERFORMA, STATISTIK & PEMBIMBING */}
          <div className="lg:col-span-5 space-y-5">
            {/* RINGKASAN STATISTIK & GAMIFIKASI */}
            <div className="glass-card p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-white">Ringkasan Kehadiran</h3>
                <Link
                  href="/dashboard/history"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <span>Lihat Riwayat</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Streak Widget (if any) */}
              {(stats?.streak || 0) > 0 && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border border-amber-500/30 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      🔥
                    </div>
                    <div>
                      <div className="text-xs font-black text-amber-300">
                        {stats.streak} Hari Tepat Waktu!
                      </div>
                      <p className="text-[10px] text-amber-200/80">Pertahankan kedisiplinan Anda</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    +{stats.streak * 10} Poin
                  </span>
                </div>
              )}

              {/* 4 Attendance Metrics Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="glass-card p-3 rounded-xl border border-white/5 text-center bg-white/[0.02]">
                  <span className="text-[9px] text-gray-400 uppercase font-bold">Hadir</span>
                  <p className="text-xl font-black text-white mt-0.5">{stats?.totalPresent || 0}</p>
                </div>
                <div className="glass-card p-3 rounded-xl border border-emerald-500/20 text-center bg-emerald-500/[0.03]">
                  <span className="text-[9px] text-emerald-400 uppercase font-bold">Tepat</span>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">{stats?.totalOnTime || 0}</p>
                </div>
                <div className="glass-card p-3 rounded-xl border border-amber-500/20 text-center bg-amber-500/[0.03]">
                  <span className="text-[9px] text-amber-400 uppercase font-bold">Telat</span>
                  <p className="text-xl font-black text-amber-400 mt-0.5">{stats?.totalLate || 0}</p>
                </div>
                <div className="glass-card p-3 rounded-xl border border-rose-500/20 text-center bg-rose-500/[0.03]">
                  <span className="text-[9px] text-rose-400 uppercase font-bold">Alpha</span>
                  <p className="text-xl font-black text-rose-400 mt-0.5">{stats?.totalAlpha || 0}</p>
                </div>
              </div>

              {/* Akumulasi Lembur Widget */}
              {stats?.totalOvertimeMinutes > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-black">
                      ⚡
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-300 block">Total Jam Lembur</span>
                      <p className="text-[10px] text-amber-200/70">Waktu kerja lembur tercatat</p>
                    </div>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    {formatOvertimeDuration(stats.totalOvertimeMinutes)}
                  </span>
                </div>
              )}
            </div>

            {/* MENTOR CONTACT CARD */}
            {userProfile?.role !== 'superadmin' && (
              <MentorContactCard
                mentor={userProfile?.mentor}
                studentName={userProfile?.full_name}
                placeName={userProfile?.internship_places?.name}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation (< lg) */}
      <MobileBottomNav
        isProfileIncomplete={isProfileIncomplete}
        onQuickAbsen={() => handleInitiateAction(!hasCheckedIn ? 'check_in' : 'check_out')}
      />

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={handleCameraModalClose}
        onConfirm={handlePhotoConfirmed}
        loading={submitting}
        title={activeAction === 'check_in' ? 'Foto Absensi Masuk (Live)' : 'Foto Absensi Pulang (Live)'}
        allowGallery={false}
        watermarkData={{
          studentName: userProfile?.full_name,
          actionTitle: activeAction === 'check_in' ? 'ABSENSI MASUK' : 'ABSENSI PULANG',
          coords,
          placeName: userProfile?.internship_places?.name || 'TEMPAT PENUGASAN PKL',
        }}
      />

      {/* Biodata Incomplete Alert Modal */}
      <BiodataAlertModal
        isOpen={biodataModalOpen}
        onClose={() => setBiodataModalOpen(false)}
        studentName={userProfile?.full_name}
        missingFields={missingBiodata}
      />

      {/* Leaflet Map Modal */}
      <LeafletMapModal
        isOpen={mapModal.isOpen}
        onClose={() => setMapModal((prev) => ({ ...prev, isOpen: false }))}
        lat={mapModal.lat}
        lng={mapModal.lng}
        title={mapModal.title}
        address={mapModal.address}
      />

      {/* Photo Preview Modal */}
      {photoPreviewModal.isOpen && (
        <div className="modal-overlay">
          <div className="glass-card p-4 max-w-sm w-full border border-white/10 flex flex-col items-center">
            <div className="flex items-center justify-between w-full pb-3 border-b border-white/10 mb-3">
              <h4 className="text-xs font-semibold text-white">{photoPreviewModal.title}</h4>
              <button
                onClick={() => setPhotoPreviewModal({ isOpen: false, url: '', title: '' })}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <img
              src={photoPreviewModal.url}
              alt="Bukti Foto"
              className="w-full max-h-[350px] object-cover rounded-xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function StudentDashboardPage() {
  return (
    <ToastProvider>
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-gray-400 text-xs">
            Memuat dashboard siswa...
          </div>
        }
      >
        <StudentDashboardContent />
      </React.Suspense>
    </ToastProvider>
  )
}
