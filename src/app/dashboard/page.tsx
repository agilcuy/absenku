'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
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
  ShieldAlert,
  Network,
  BookOpen,
  ChevronRight,
} from 'lucide-react'

function StudentDashboardContent() {
  const router = useRouter()
  const { showToast } = useToast()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<any>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState<string>('')

  // Live digital clock updater
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

  // Fetch today's data and user profile
  const loadDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/today')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        if (json.userProfile) {
          setUserProfile(json.userProfile)
          if (json.userProfile.role === 'pembimbing') {
            router.replace('/pembimbing')
            return
          }
        }
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

  // Student profile completeness evaluation (Strictly for student role)
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

  // Auto-alert student upon login / initial dashboard load if biodata is incomplete
  useEffect(() => {
    if (isProfileIncomplete && !hasAutoOpenedBiodata && !loading) {
      setBiodataModalOpen(true)
      setHasAutoOpenedBiodata(true)
    }
  }, [isProfileIncomplete, hasAutoOpenedBiodata, loading])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    showToast('Status absensi berhasil diperbarui!', 'success')
  }

  // Handle Action Trigger
  const handleInitiateAction = (action: 'check_in' | 'check_out') => {
    // 0. Strict check: Student must complete biodata before attendance
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

  // Handle Camera Modal Cancelled / Closed without photo
  const handleCameraModalClose = () => {
    setCameraModalOpen(false)
    showToast(
      'Absensi belum tercatat. Anda wajib menyertakan foto bukti kehadiran di lokasi PKL agar absensi dapat dicatat.',
      'warning',
      '⚠️ Foto Wajib Disertakan'
    )
  }

  // Handle Photo Confirmed & Submit Attendance
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
      setCameraModalOpen(false) // Tutup modal setelah selesai (sukses atau gagal)
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

  // If a mentor account reaches this dashboard, render redirect prompt immediately
  if (userProfile?.role === 'pembimbing') {
    return (
      <div className="min-h-screen bg-[#06070d] text-gray-100 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center text-3xl font-bold shadow-xl shadow-purple-500/20 animate-pulse">
          🎓
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Akun Pembimbing PKL Terdeteksi</h2>
          <p className="text-xs text-gray-400 max-w-sm mt-1 leading-relaxed">
            Anda login menggunakan akun Pembimbing PKL. Mengarahkan Anda ke Portal Pembimbing untuk memantau presensi dan mengelola pendaftaran siswa...
          </p>
        </div>
        <Link
          href="/pembimbing"
          className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs py-2.5 px-6 font-bold rounded-xl shadow-lg shadow-purple-500/25"
        >
          Buka Portal Pembimbing PKL Sekarang →
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 pb-safe-nav">
      <StudentNavbar user={userProfile} isProfileIncomplete={isProfileIncomplete} />

      <main className="max-w-6xl mx-auto px-4 pt-4 sm:pt-6">
        {/* Urgent Mandatory Biodata Alert Banner */}
        {isProfileIncomplete && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-amber-500/20 border-2 border-amber-500/50 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-amber-300">
                    PERINGATAN: WAJIB LENGKAPI BIODATA SISWA
                  </h3>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                    {missingBiodata.length} Data Belum Lengkap
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  Anda belum mengisi: <b className="text-white">{missingBiodata.map((m) => m.label).join(', ')}</b>. Sesuai ketentuan, Anda <b>tidak dapat melakukan absensi</b> sebelum biodata diri diisi lengkap.
                </p>
              </div>
            </div>

            <button
              onClick={() => setBiodataModalOpen(true)}
              className="btn-primary text-xs py-2.5 px-4 font-bold whitespace-nowrap shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 self-start sm:self-auto"
            >
              <span>Lengkapi Sekarang</span>
              <span>➔</span>
            </button>
          </div>
        )}

        {/* Dual Experience Layout: 2 Columns on Desktop, Clean 1 Column on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* =========================================
              LEFT COLUMN (Hero Absensi & Aksi Utama)
             ========================================= */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Welcome Greeting Card */}
            <div className="glass-card p-5 relative overflow-hidden border border-indigo-500/20 shadow-xl animate-fade-in-up">
              <div className="orb orb-purple w-40 h-40 top-[-20px] right-[-20px]" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {userProfile?.role === 'superadmin'
                        ? 'Absensi Mandiri • Superadmin & Pembimbing'
                        : 'Portal Peserta Didik PKL'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Selamat Datang,{' '}
                    {userProfile?.role === 'superadmin'
                      ? userProfile?.full_name || 'Superadmin'
                      : userProfile?.full_name
                      ? userProfile.full_name.split(' ')[0]
                      : 'Peserta Didik'}
                    !
                  </h2>
                  <div className="text-xs text-gray-400 mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(new Date())}
                    </span>
                    {currentTime && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          {currentTime}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition active:scale-95"
                      title="Perbarui status absensi"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                      <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
                    </button>
                  </div>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                  {userProfile?.role === 'superadmin' ? '👑' : '⚡'}
                </div>
              </div>

              {/* Holiday or Non-working day banner */}
              {isHoliday && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Hari ini Libur: <b>{data.holidayName}</b>. Tidak wajib absensi.</span>
                </div>
              )}

              {!isHoliday && !isWorkingDay && (
                <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2 text-xs text-blue-300">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Hari ini bukan hari kerja PKL. Absensi tidak aktif.</span>
                </div>
              )}
            </div>

            {/* Today Attendance Status Card */}
            <div className="glass-card p-5 border border-white/10 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  Status Kehadiran Hari Ini
                </h3>
                <div className={`badge text-[11px] ${getStatusBadge(attendance?.check_in_status)}`}>
                  <span>{getStatusEmoji(attendance?.check_in_status)}</span>
                  <span>{getStatusLabel(attendance?.check_in_status)}</span>
                </div>
              </div>

              {/* Dual Check-in / Check-out status cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Check-In Column */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-gray-400 font-medium">Absensi Masuk</span>
                    <div className="text-xl font-black text-white mt-1">
                      {attendance?.check_in_time ? formatTime(attendance.check_in_time) : '--:--'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Jadwal: 06:00 - {settings?.check_in_time ? settings.check_in_time.substring(0, 5) : '08:30'} WIB
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
                          className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition"
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
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition"
                        >
                          <MapPin className="w-3 h-3" /> Peta
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Check-Out Column */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 font-medium">Absensi Pulang</span>
                      {attendance?.is_overtime && attendance?.overtime_minutes > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                          <span>⚡ Lembur</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-black text-white mt-1">
                      {attendance?.check_out_time ? formatTime(attendance.check_out_time) : '--:--'}
                    </div>
                    {attendance?.is_overtime && attendance?.overtime_minutes > 0 && (
                      <div className="text-[11px] font-bold text-amber-300 mt-0.5">
                        +{formatOvertimeDuration(attendance.overtime_minutes)}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Jadwal: {userProfile?.internship_places?.work_end_time?.substring(0, 5) || settings?.check_out_time?.substring(0, 5) || '16:30'} - 24:00 WIB
                      {userProfile?.internship_places?.allow_overtime && (
                        <span className="text-amber-300/80 block mt-0.5">
                          ⚡ Lembur: Di atas {userProfile.internship_places.overtime_start_time?.substring(0, 5) || '17:30'} WIB
                        </span>
                      )}
                    </div>
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
                          className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition"
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
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition"
                        >
                          <MapPin className="w-3 h-3" /> Peta
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons (52px Touch-friendly for Mobile) */}
              <div className="flex flex-col gap-2.5 mt-2">
                {!hasCheckedIn ? (
                  <button
                    id="btn-absen-masuk"
                    onClick={() => handleInitiateAction('check_in')}
                    disabled={submitting}
                    className="btn-primary w-full py-4 text-sm font-black justify-center rounded-2xl shadow-xl shadow-indigo-500/30 active:scale-95 transition tracking-wide touch-target"
                  >
                    <Camera className="w-5 h-5 stroke-[2.2]" />
                    <span>ABSEN MASUK SEKARANG</span>
                  </button>
                ) : !hasCheckedOut ? (
                  <button
                    id="btn-absen-pulang"
                    onClick={() => handleInitiateAction('check_out')}
                    disabled={submitting}
                    className="w-full py-4 text-sm font-black rounded-2xl justify-center flex items-center gap-2 transition active:scale-95 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-500/25 tracking-wide touch-target"
                  >
                    <Camera className="w-5 h-5 stroke-[2.2]" />
                    <span>ABSEN PULANG SEKARANG</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center gap-2 text-xs text-emerald-400 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Absensi Hari Ini Telah Lengkap (Masuk & Pulang)</span>
                  </div>
                )}

                {isProfileIncomplete && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-2 text-center text-xs text-amber-300 font-medium">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-400" />
                    <span>Wajib melengkapi biodata profil sebelum dapat absensi</span>
                  </div>
                )}
              </div>
            </div>

            {/* GPS Sensor & Geofencing Badge */}
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

          {/* =========================================
              RIGHT COLUMN (Statistik, Pembimbing, Info)
             ========================================= */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Streak & Consistency Gamification Widget */}
            {(stats?.streak || 0) > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/10 border border-amber-500/30 flex items-center justify-between shadow-lg shadow-orange-500/10 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center flex-shrink-0 text-xl shadow-inner">
                    🔥
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-300">
                        {stats.streak} Hari Tepat Waktu Berturut-turut!
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-200/80 mt-0.5">
                      Pertahankan kedisiplinan Anda sebagai Teknisi PKL teladan.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  +{stats.streak * 10} Poin
                </span>
              </div>
            )}

            {/* Attendance Statistics Grid (Clickable to History) */}
            <Link
              href="/dashboard/history"
              title="Lihat riwayat absensi lengkap"
              className="grid grid-cols-4 gap-2.5 group"
            >
              <div className="glass-card p-3.5 rounded-2xl border border-white/5 text-center group-hover:border-indigo-500/30 transition">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Hadir</span>
                <p className="text-2xl font-black text-white mt-1">{stats?.totalPresent || 0}</p>
              </div>
              <div className="glass-card p-3.5 rounded-2xl border border-emerald-500/20 text-center bg-emerald-500/[0.02] group-hover:border-emerald-500/40 transition">
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Tepat</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">{stats?.totalOnTime || 0}</p>
              </div>
              <div className="glass-card p-3.5 rounded-2xl border border-amber-500/20 text-center bg-amber-500/[0.02] group-hover:border-amber-500/40 transition">
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Telat</span>
                <p className="text-2xl font-black text-amber-400 mt-1">{stats?.totalLate || 0}</p>
              </div>
              <div className="glass-card p-3.5 rounded-2xl border border-rose-500/20 text-center bg-rose-500/[0.02] group-hover:border-rose-500/40 transition">
                <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">Alpha</span>
                <p className="text-2xl font-black text-rose-400 mt-1">{stats?.totalAlpha || 0}</p>
              </div>
            </Link>

            {/* Overtime accumulation banner if student has earned overtime */}
            {stats?.totalOvertimeMinutes > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-black border border-amber-500/30">
                    ⚡
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-300 block">
                      Total Akumulasi Lembur
                    </span>
                    <p className="text-[10px] text-amber-200/80 mt-0.5">
                      Dedikasi jam tambahan selama masa penugasan PKL
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  {formatOvertimeDuration(stats.totalOvertimeMinutes)}
                </span>
              </div>
            )}

            {/* Mentor Contact & Direct WhatsApp Card (Khusus Siswa) */}
            {userProfile?.role !== 'superadmin' && (
              <MentorContactCard
                mentor={userProfile?.mentor}
                studentName={userProfile?.full_name}
                placeName={userProfile?.internship_places?.name}
              />
            )}

            {/* Topologi & Tupoksi Link Card (Khusus instansi penugasan teknis terkait atau superadmin) */}
            {((userProfile?.internship_places?.name || '').toLowerCase().includes('kominfo') ||
              (userProfile?.internship_places?.name || '').toLowerCase().includes('egov') ||
              userProfile?.role === 'superadmin') && (
              <Link
                href="/dashboard/structure"
                className="glass-card p-4 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/40 bg-gradient-to-br from-indigo-500/[0.04] to-cyan-500/[0.02] transition flex items-center justify-between group shadow-sm hover:shadow-indigo-500/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center font-bold group-hover:scale-105 transition">
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                        Topologi Jabatan & Tupoksi
                      </h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                        SOP Teknis
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Hierarki tim teknis jaringan & alur eskalasi penanganan gangguan
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
              </Link>
            )}

            {/* Jurnal Kegiatan Harian PKL Link Card */}
            <Link
              href="/dashboard/journals"
              className="glass-card p-4 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/40 bg-gradient-to-br from-indigo-500/[0.04] to-violet-500/[0.02] transition flex items-center justify-between group shadow-sm hover:shadow-indigo-500/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center font-bold group-hover:scale-105 transition">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                      Jurnal Kegiatan PKL
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                      Logbook Harian
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Catat tugas harian, lampirkan foto kerja & peroleh paraf pembimbing
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (< lg) */}
      <MobileBottomNav
        isProfileIncomplete={isProfileIncomplete}
        onQuickAbsen={() => handleInitiateAction(!hasCheckedIn ? 'check_in' : 'check_out')}
      />


      {/* Camera Capture Modal (Strict Live Camera with Auto Watermarking) */}
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
          <div className="min-h-screen bg-[#06070d] flex items-center justify-center text-gray-400 text-xs">
            Memuat dashboard...
          </div>
        }
      >
        <StudentDashboardContent />
      </React.Suspense>
    </ToastProvider>
  )
}
