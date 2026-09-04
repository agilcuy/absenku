'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import StudentNavbar from '@/components/StudentNavbar'
import CameraCaptureModal from '@/components/CameraCaptureModal'
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
  isCheckOutAllowed,
} from '@/lib/utils'
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
} from 'lucide-react'

function StudentDashboardContent() {
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<any>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)

  // Modals state
  const [cameraModalOpen, setCameraModalOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<'check_in' | 'check_out'>('check_in')
  const [submitting, setSubmitting] = useState(false)

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
        }
      }
    } catch (err) {
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    showToast('Status absensi berhasil diperbarui!', 'success')
  }

  // Handle Action Trigger
  const handleInitiateAction = (action: 'check_in' | 'check_out') => {
    if (action === 'check_out') {
      const checkOutConfig = data?.settings?.check_out_time || '16:30:00'
      if (!isCheckOutAllowed(checkOutConfig)) {
        const timeStr = checkOutConfig.substring(0, 5)
        showToast(
          `Absensi pulang belum tersedia. Absensi pulang dapat dilakukan mulai pukul ${timeStr} WIB.`,
          'warning',
          'Belum Waktunya Pulang'
        )
        return
      }
    }

    if (!coords) {
      showToast('Mohon tunggu sinyal GPS aktif sebelum melakukan absensi.', 'error', 'GPS Diperlukan')
      return
    }

    setActiveAction(action)
    setCameraModalOpen(true)
  }

  // Handle Photo Confirmed & Submit Attendance
  const handlePhotoConfirmed = async (photoFile: File) => {
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
        showToast('Absensi pulang berhasil dicatat. Selamat beristirahat!', 'success', '✅ Absensi Pulang')
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

  return (
    <div className="min-h-screen bg-[#06070d] text-slate-100 pb-20">
      <StudentNavbar user={userProfile} />

      <main className="max-w-xl mx-auto px-4 pt-6 flex flex-col gap-5">
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
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Selamat Datang,{' '}
                {userProfile?.role === 'superadmin'
                  ? userProfile?.full_name || 'Superadmin'
                  : userProfile?.full_name
                  ? userProfile.full_name.split(' ')[0]
                  : 'Peserta Didik'}
                !
              </h1>
              <div className="text-xs text-gray-400 mt-1.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {formatDate(new Date())}
                </span>
                <span>•</span>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold transition"
                  title="Perbarui status absensi"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'Memperbarui...' : 'Perbarui Status'}</span>
                </button>
              </div>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl shadow-inner">
              {userProfile?.role === 'superadmin' ? '👑' : '⚡'}
            </div>
          </div>

          {/* Quick Return to Admin Panel for Superadmin */}
          {userProfile?.role === 'superadmin' && (
            <div className="mt-4 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">👑</span>
                <div>
                  <span className="font-bold text-indigo-300 block">Akun Superadmin & Pembimbing PKL</span>
                  <span className="text-indigo-200/80">Anda dapat melakukan absensi mandiri, mengelola sistem, dan memantau siswa bimbingan.</span>
                </div>
              </div>
              <Link
                href="/admin"
                className="btn-outline border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 text-[11px] py-1.5 px-3 whitespace-nowrap self-start sm:self-auto font-bold flex items-center gap-1"
              >
                <span>Panel Admin</span>
                <span>➔</span>
              </Link>
            </div>
          )}

          {/* Pengingat Lengkapi Biodata jika belum terisi (HANYA untuk Siswa) */}
          {userProfile?.role !== 'superadmin' &&
            userProfile &&
            (!userProfile.class_name || !userProfile.major || !userProfile.phone) && (
              <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block">Biodata Anda Belum Lengkap</span>
                    <span className="text-amber-200/80">Silakan lengkapi kelas, jurusan, no WA, dan tempat PKL Anda.</span>
                  </div>
                </div>
                <Link
                  href="/dashboard/profile?edit=true"
                  className="btn-outline border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-[11px] py-1.5 px-3 whitespace-nowrap self-start sm:self-auto font-bold"
                >
                  Lengkapi Sekarang ➔
                </Link>
              </div>
            )}

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

        {/* GPS Sensor Badge */}
        <GpsLocationBadge onLocationFound={(found) => setCoords(found)} />

        {/* Today Attendance Status Card */}
        <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Status Absensi Hari Ini
            </h2>
            <div className={`badge text-[11px] ${getStatusBadge(attendance?.check_in_status)}`}>
              <span>{getStatusEmoji(attendance?.check_in_status)}</span>
              <span>{getStatusLabel(attendance?.check_in_status)}</span>
            </div>
          </div>

          {/* Dual Check-in / Check-out status cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Check-In Column */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-gray-400 font-medium">Absensi Masuk</span>
                <div className="text-lg font-bold text-white mt-1">
                  {attendance?.check_in_time ? formatTime(attendance.check_in_time) : '--:--'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Target: {settings?.check_in_time ? settings.check_in_time.substring(0, 5) : '07:30'} WIB
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
                      className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[10px] flex items-center gap-1"
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
                      className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" /> Peta
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Check-Out Column */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-gray-400 font-medium">Absensi Pulang</span>
                <div className="text-lg font-bold text-white mt-1">
                  {attendance?.check_out_time ? formatTime(attendance.check_out_time) : '--:--'}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  Mulai: {settings?.check_out_time ? settings.check_out_time.substring(0, 5) : '16:30'} WIB
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
                      className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[10px] flex items-center gap-1"
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
                      className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[10px] flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" /> Peta
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 mt-2">
            {!hasCheckedIn ? (
              <button
                id="btn-absen-masuk"
                onClick={() => handleInitiateAction('check_in')}
                disabled={submitting}
                className="btn-primary w-full py-4 text-sm font-bold justify-center rounded-xl shadow-lg shadow-indigo-500/25"
              >
                <Camera className="w-5 h-5" />
                <span>ABSEN MASUK SEKARANG</span>
              </button>
            ) : !hasCheckedOut ? (
              <button
                id="btn-absen-pulang"
                onClick={() => handleInitiateAction('check_out')}
                disabled={submitting}
                className="w-full py-4 text-sm font-bold rounded-xl justify-center flex items-center gap-2 transition bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
              >
                <Camera className="w-5 h-5" />
                <span>ABSEN PULANG SEKARANG</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Absensi Hari Ini Lengkap (Masuk & Pulang)</span>
              </div>
            )}
          </div>
        </div>

        {/* Mentor Contact & Direct WhatsApp Card (Khusus Siswa) */}
        {userProfile?.role !== 'superadmin' && (
          <MentorContactCard
            mentor={userProfile?.mentor}
            studentName={userProfile?.full_name}
            placeName={userProfile?.internship_places?.name}
          />
        )}

        {/* Attendance Statistics Grid */}
        <div className="grid grid-cols-4 gap-2.5">
          <div className="glass-card p-3 rounded-xl border border-white/5 text-center">
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Hadir</span>
            <p className="text-xl font-black text-white mt-1">{stats?.totalPresent || 0}</p>
          </div>
          <div className="glass-card p-3 rounded-xl border border-white/5 text-center">
            <span className="text-[10px] text-emerald-400 uppercase font-semibold">Tepat</span>
            <p className="text-xl font-black text-emerald-400 mt-1">{stats?.totalOnTime || 0}</p>
          </div>
          <div className="glass-card p-3 rounded-xl border border-white/5 text-center">
            <span className="text-[10px] text-amber-400 uppercase font-semibold">Telat</span>
            <p className="text-xl font-black text-amber-400 mt-1">{stats?.totalLate || 0}</p>
          </div>
          <div className="glass-card p-3 rounded-xl border border-white/5 text-center">
            <span className="text-[10px] text-rose-400 uppercase font-semibold">Alpha</span>
            <p className="text-xl font-black text-rose-400 mt-1">{stats?.totalAlpha || 0}</p>
          </div>
        </div>
      </main>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onConfirm={handlePhotoConfirmed}
        loading={submitting}
        title={activeAction === 'check_in' ? 'Foto Absensi Masuk' : 'Foto Absensi Pulang'}
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
      <StudentDashboardContent />
    </ToastProvider>
  )
}
