'use client'

import React, { useEffect, useState } from 'react'
import { Clock, Globe, Shield, Save, Upload, Trash2 } from 'lucide-react'
import { useToast } from '@/components/Toast'

export default function AdminSettingsPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [checkInTime, setCheckInTime] = useState('07:30')
  const [checkOutTime, setCheckOutTime] = useState('16:30')
  const [timezone, setTimezone] = useState('Asia/Jakarta')
  const [siteName, setSiteName] = useState('ABSENKU')
  const [siteDescription, setSiteDescription] = useState(
    'Sistem Absensi Peserta Didik PKL Kominfo Tanggamus'
  )
  const [siteLogoUrl, setSiteLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
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
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
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
      setSaving(false)
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

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-indigo-400" />
          Pengaturan Jam & Identitas Sistem
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Konfigurasi jam masuk, jam pulang, timezone, dan branding website ABSENKU
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Jam & Jadwal Card */}
        <div className="glass-card p-6 border border-white/10 flex flex-col gap-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
            <Clock className="w-4 h-4 text-indigo-400" />
            Konfigurasi Waktu Absensi
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
              <p className="text-[10px] text-gray-500 mt-1">
                Siswa yang absen ≤ jam ini berstatus <b>Tepat Waktu</b>. Lewat dari jam ini berstatus <b>Terlambat</b>. Default: 07:30.
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
              <p className="text-[10px] text-gray-500 mt-1">
                Siswa <b>tidak diizinkan</b> absen pulang sebelum jam ini. Default: 16:30.
              </p>
            </div>
          </div>

          <div>
            <label className="text-gray-300 font-medium text-xs block mb-1.5">
              Zona Waktu Sistem
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
            Identitas Website & Logo
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
                Keterangan / Sub-judul
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
                    <span className="text-2xl">📋</span>
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
            disabled={saving}
            className="btn-primary py-3 px-6 text-xs font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
