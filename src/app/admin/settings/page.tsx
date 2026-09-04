'use client'

import React, { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Clock,
  Globe,
  Save,
  Upload,
  Trash2,
  CalendarCheck,
  Calendar as CalendarIcon,
  Plus,
  CheckCircle,
  X,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { formatDate, DAY_NAMES } from '@/lib/utils'

function SettingsContent() {
  const { showToast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialTab = searchParams.get('tab') === 'schedule' ? 'schedule' : 'general'
  const [activeTab, setActiveTab] = useState<'general' | 'schedule'>(initialTab)

  // Tab 1: Jam & Identitas
  const [loadingGeneral, setLoadingGeneral] = useState(true)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [checkInTime, setCheckInTime] = useState('07:30')
  const [checkOutTime, setCheckOutTime] = useState('16:30')
  const [timezone, setTimezone] = useState('Asia/Jakarta')
  const [siteName, setSiteName] = useState('ABSENKU')
  const [siteDescription, setSiteDescription] = useState(
    'Sistem Absensi Peserta Didik PKL Kominfo Tanggamus'
  )
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null)

  // Tab 2: Hari Kerja & Libur
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [holidays, setHolidays] = useState<any[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(true)
  const [savingDays, setSavingDays] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayName, setHolidayName] = useState('')
  const [submittingHoliday, setSubmittingHoliday] = useState(false)

  // Load General Settings
  useEffect(() => {
    const loadGeneral = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const json = await res.json()
          const s = json.settings
          if (s) {
            setCheckInTime(s.check_in_time ? s.check_in_time.substring(0, 5) : '07:30')
            setCheckOutTime(s.check_out_time ? s.check_out_time.substring(0, 5) : '16:30')
            setTimezone(s.timezone || 'Asia/Jakarta')
            setSiteName(s.site_name || 'ABSENKU')
            setSiteDescription(
              s.site_description || 'Sistem Absensi Peserta Didik PKL Kominfo Tanggamus'
            )
            setSiteLogoUrl(s.site_logo_url || null)
            if (s.working_days) {
              setWorkingDays(s.working_days)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load general settings:', err)
      } finally {
        setLoadingGeneral(false)
        setLoadingSchedule(false)
      }
    }

    loadGeneral()
  }, [])

  // Load Holidays for Tab 2
  const loadHolidays = useCallback(async () => {
    try {
      const res = await fetch('/api/holidays')
      if (res.ok) {
        const json = await res.json()
        setHolidays(json.holidays || [])
      }
    } catch (err) {
      console.error('Failed to load holidays:', err)
    }
  }, [])

  useEffect(() => {
    loadHolidays()
  }, [loadHolidays])

  // Save General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingGeneral(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in_time: `${checkInTime}:00`,
          check_out_time: `${checkOutTime}:00`,
          timezone,
          site_name: siteName,
          site_description: siteDescription,
          site_logo_url: siteLogoUrl,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan pengaturan.')

      showToast('Pengaturan jam dan identitas sistem berhasil disimpan!', 'success', 'Tersimpan')
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSavingGeneral(false)
    }
  }

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (PNG, JPG, WEBP).', 'error', 'Format Salah')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSiteLogoUrl(reader.result as string)
      showToast('Logo berhasil diunggah. Klik Simpan untuk mempermanenkan.', 'info', 'Logo Siap')
    }
    reader.readAsDataURL(file)
  }

  // Toggle working day
  const toggleDay = (dayNum: number) => {
    if (workingDays.includes(dayNum)) {
      if (workingDays.length === 1) {
        showToast('Minimal harus ada 1 hari kerja aktif.', 'warning', 'Peringatan')
        return
      }
      setWorkingDays((prev) => prev.filter((d) => d !== dayNum))
    } else {
      setWorkingDays((prev) => [...prev, dayNum].sort())
    }
  }

  // Save working days
  const handleSaveDays = async () => {
    setSavingDays(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ working_days: workingDays }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan hari kerja.')

      showToast('Konfigurasi hari kerja operasional berhasil disimpan!', 'success', 'Tersimpan')
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSavingDays(false)
    }
  }

  // Add holiday submit
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingHoliday(true)
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: holidayDate, name: holidayName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menambahkan hari libur.')

      showToast('Hari libur berhasil ditambahkan!', 'success', 'Tersimpan')
      setModalOpen(false)
      setHolidayDate('')
      setHolidayName('')
      loadHolidays()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmittingHoliday(false)
    }
  }

  // Delete holiday
  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Hapus hari libur "${name}"?`)) return
    try {
      const res = await fetch(`/api/holidays/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus hari libur.')

      showToast('Hari libur berhasil dihapus.', 'success', 'Dihapus')
      loadHolidays()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    }
  }

  const allDays = [1, 2, 3, 4, 5, 6, 7]

  const switchTab = (tab: 'general' | 'schedule') => {
    setActiveTab(tab)
    router.replace(`/admin/settings?tab=${tab}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-violet-950/70 p-6 border border-indigo-500/20 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Konfigurasi Pusat</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Pengaturan Sistem & Operasional
            </h1>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl">
              Kelola batas jam absensi, identitas website dinas, jadwal hari kerja aktif, serta daftar hari libur resmi.
            </p>
          </div>

          {/* Tab Navigation Pill */}
          <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => switchTab('general')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'general'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Jam & Identitas</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('schedule')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'schedule'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Hari Kerja & Libur</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          TAB 1: JAM & IDENTITAS SISTEM
         ============================================================ */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="flex flex-col gap-6">
          {/* Jam Absensi Card */}
          <div className="glass-card p-6 border border-white/10 flex flex-col gap-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
              <Clock className="w-4 h-4 text-indigo-400" />
              Batas Waktu Absensi Masuk & Pulang
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-gray-300 font-medium block mb-1.5">
                  Batas Jam Masuk (WIB)
                </label>
                <input
                  type="time"
                  required
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="input-field"
                />
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  Absen masuk dibuka pukul <b>06:00 WIB</b>. Absen tepat waktu $\le$ <b>{checkInTime} WIB</b>. Absen setelah jam tersebut otomatis tercatat <b>Terlambat</b>.
                </p>
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1.5">
                  Batas Awal Absen Pulang (WIB)
                </label>
                <input
                  type="time"
                  required
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="input-field"
                />
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  Absen pulang baru dapat dilakukan mulai pukul <b>{checkOutTime} WIB</b> sampai <b>24:00 WIB</b>. Sebelum jam ini tombol pulang terkunci.
                </p>
              </div>
            </div>

            <div>
              <label className="text-gray-300 font-medium text-xs block mb-1.5">
                Zona Waktu Server
              </label>
              <input
                type="text"
                disabled
                value={`${timezone} (WIB / Waktu Indonesia Barat)`}
                className="input-field opacity-60 cursor-not-allowed text-xs"
              />
            </div>
          </div>

          {/* Identitas Website & Logo */}
          <div className="glass-card p-6 border border-white/10 flex flex-col gap-5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
              <Globe className="w-4 h-4 text-indigo-400" />
              Identitas Aplikasi & Logo Instansi
            </h2>

            <div className="flex flex-col gap-4 text-xs">
              <div>
                <label className="text-gray-300 font-medium block mb-1.5">
                  Nama Aplikasi
                </label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1.5">
                  Keterangan / Sub-judul Sistem
                </label>
                <input
                  type="text"
                  required
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="text-gray-300 font-medium block mb-1.5">
                  Logo Instansi (Kominfo / PKL)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                    {siteLogoUrl ? (
                      <img
                        src={siteLogoUrl}
                        alt="Logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-2xl">⚡</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="btn-outline text-xs py-2 px-3 cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo Baru</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    {siteLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setSiteLogoUrl(null)}
                        className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition"
                        title="Hapus Logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={savingGeneral}
              className="btn-primary py-3 px-6 text-xs font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingGeneral ? 'Menyimpan...' : 'Simpan Pengaturan Jam & Identitas'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================
          TAB 2: HARI KERJA & HARI LIBUR
         ============================================================ */}
      {activeTab === 'schedule' && (
        <div className="flex flex-col gap-6">
          {/* Working Days Card */}
          <div className="glass-card p-6 border border-white/10 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-indigo-400" />
                  Hari Kerja Operasional PKL
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Klik hari di bawah untuk mengaktifkan/menonaktifkan kewajiban absensi
                </p>
              </div>
              <button
                onClick={handleSaveDays}
                disabled={savingDays}
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingDays ? 'Menyimpan...' : 'Simpan Hari Kerja'}</span>
              </button>
            </div>

            {/* Days Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {allDays.map((dayNum) => {
                const isWorking = workingDays.includes(dayNum)
                const dayName = DAY_NAMES[dayNum]

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => toggleDay(dayNum)}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                      isWorking
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-bold">{dayName}</span>
                    <div className="flex items-center gap-1 text-[11px]">
                      {isWorking ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Kerja
                        </span>
                      ) : (
                        <span className="text-gray-500">Libur</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Holidays Card */}
          <div className="glass-card p-6 border border-white/10 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-indigo-400" />
                  Daftar Hari Libur Khusus & Tambahan
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Pada tanggal ini, sistem tidak akan menghitung siswa sebagai Alpha / tidak hadir
                </p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Hari Libur</span>
              </button>
            </div>

            {/* Holidays List */}
            {loadingSchedule ? (
              <div className="text-xs text-gray-500 text-center py-6">Memuat daftar libur...</div>
            ) : holidays.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-6 bg-white/[0.01] rounded-xl border border-white/5">
                Belum ada hari libur khusus yang ditambahkan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs hover:border-white/15 transition"
                  >
                    <div>
                      <p className="font-bold text-white">{h.name}</p>
                      <p className="text-[11px] text-indigo-400 mt-0.5">{formatDate(h.date)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(h.id, h.name)}
                      title="Hapus Hari Libur"
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 border border-white/10 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Tambah Hari Libur Khusus
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="text-gray-300 font-medium block mb-1.5">
                  Tanggal Libur
                </label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-gray-300 font-medium block mb-1.5">
                  Keterangan / Nama Hari Libur
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: HUT Kab. Tanggamus, Cuti Bersama Daerah"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingHoliday}
                  className="btn-primary py-2 px-4"
                >
                  {submittingHoliday ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-500">Memuat pengaturan sistem...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
