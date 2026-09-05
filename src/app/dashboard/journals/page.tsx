'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Calendar,
  Camera,
  Star,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  Check,
  ChevronRight,
  User,
  ShieldCheck,
  X,
  Maximize2,
  Minimize2,
  GripHorizontal,
} from 'lucide-react'
import StudentNavbar from '@/components/StudentNavbar'
import MobileBottomNav from '@/components/MobileBottomNav'
import { ToastProvider, useToast } from '@/components/Toast'
import { formatDate, formatTime } from '@/lib/utils'
import { validateImageFile, compressImageFile } from '@/lib/geo'
import { DailyJournal } from '@/types'

function JournalsContent() {
  const { showToast } = useToast()
  const [journals, setJournals] = useState<DailyJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [needsMigration, setNeedsMigration] = useState(false)

  // Modal / Form state
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Photo viewer modal
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)

  // Expandable Daily Activity Drawer & In-place expansion
  const [activeDetailJournal, setActiveDetailJournal] = useState<DailyJournal | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isExpandedEditor, setIsExpandedEditor] = useState(false)

  const loadJournals = useCallback(async () => {
    try {
      const [jRes, uRes] = await Promise.all([
        fetch('/api/journals'),
        fetch('/api/students/profile'),
      ])

      if (jRes.ok) {
        const jData = await jRes.json()
        if (jData.needsMigration) {
          setNeedsMigration(true)
        } else {
          setJournals(jData.journals || [])
        }
      }

      if (uRes.ok) {
        const uData = await uRes.json()
        setUserProfile(uData.user)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJournals()
  }, [loadJournals])

  const todayStr = new Date().toISOString().split('T')[0]
  const todayJournal = journals.find((j) => j.date === todayStr)

  const handleOpenNew = () => {
    setTitle('')
    setDescription('')
    setDate(todayStr)
    setPhotoFile(null)
    setPhotoPreview(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (journal: DailyJournal) => {
    setTitle(journal.title)
    setDescription(journal.description)
    setDate(journal.date)
    setPhotoFile(null)
    setPhotoPreview(journal.photo_url || null)
    setFormOpen(true)
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      showToast(validation.error || 'Format berkas tidak didukung.', 'error')
      return
    }

    try {
      const compressed = await compressImageFile(file, 1280, 1280, 0.82)
      setPhotoFile(compressed)
      setPhotoPreview(URL.createObjectURL(compressed))
    } catch {
      showToast('Gagal memproses foto', 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      showToast('Judul dan rincian kegiatan wajib diisi.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('description', description.trim())
      formData.append('date', date)
      if (photoFile) {
        formData.append('photo', photoFile)
      }

      const res = await fetch('/api/journals', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan jurnal')

      showToast('Jurnal kegiatan harian berhasil disimpan!', 'success')
      setFormOpen(false)
      loadJournals()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 pb-safe-nav">
      <StudentNavbar user={userProfile} />

      <main className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Logbook Kegiatan PKL
          </span>
        </div>

        {/* Hero Header Card */}
        <div className="glass-card p-5 relative overflow-hidden border border-indigo-500/20 shadow-xl mb-6 animate-fade-in">
          <div className="orb orb-purple w-40 h-40 -top-10 -right-10" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 mb-1">
                <BookOpen className="w-4 h-4" />
                <span>Buku Catatan Kerja Harian</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Jurnal Kegiatan Siswa PKL
              </h1>
              <p className="text-xs text-gray-400 mt-1 max-w-lg">
                Catat setiap tugas teknis harian (penyambungan fiber optik, setup router, penanganan tiket gangguan). Catatan ini diverifikasi langsung oleh Pembimbing Teknis.
              </p>
            </div>

            <button
              onClick={handleOpenNew}
              className="btn-primary text-xs py-3 px-5 font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 self-start sm:self-auto whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Tulis Jurnal Baru</span>
            </button>
          </div>

          {/* Today's status alert inside hero */}
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-gray-400">
              Status Jurnal Hari Ini ({formatDate(new Date())}):
            </span>
            {todayJournal ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" /> Sudah Diisi
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Clock className="w-4 h-4 animate-pulse" /> Belum Diisi Hari Ini
              </span>
            )}
          </div>
        </div>

        {/* Database Migration Alert if Table doesn't exist */}
        {needsMigration && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block text-sm">
                Tabel Database Jurnal Belum Dibuat
              </span>
              <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                Superadmin perlu menjalankan file <code>migration_v4.sql</code> di Supabase SQL Editor untuk mengaktifkan fitur penyimpanan jurnal kegiatan ini.
              </p>
            </div>
          </div>
        )}

        {/* Journal Timeline List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Riwayat Jurnal Kegiatan ({journals.length})
            </h2>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">Memuat riwayat jurnal...</div>
          ) : journals.length === 0 ? (
            <div className="glass-card p-10 text-center rounded-2xl border border-white/10 flex flex-col items-center gap-3">
              <BookOpen className="w-10 h-10 text-gray-600" />
              <p className="text-sm font-bold text-white">Belum Ada Jurnal Kegiatan</p>
              <p className="text-xs text-gray-400 max-w-sm">
                Anda belum menulis jurnal kegiatan PKL. Klik tombol &quot;Tulis Jurnal Baru&quot; di atas untuk mencatat tugas hari ini.
              </p>
              <button onClick={handleOpenNew} className="btn-primary text-xs py-2 px-4 mt-2">
                Tulis Sekarang
              </button>
            </div>
          ) : (
            journals.map((journal) => (
              <div
                key={journal.id}
                className="glass-card p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-col gap-3.5 hover:border-indigo-500/30 transition shadow-lg"
              >
                {/* Header: Date + Rating / Review Status */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold font-mono">
                      {new Date(journal.date).getDate()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {formatDate(journal.date)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Dicatat: {formatTime(journal.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Mentor Review Badge / Stars */}
                  <div>
                    {journal.mentor_rating ? (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= (journal.mentor_rating || 0)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] ml-1">Paraf Pembimbing</span>
                      </div>
                    ) : (
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium">
                        Menunggu Review
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {journal.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveDetailJournal(journal)}
                      className="text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-600/30 border border-indigo-500/30 px-2.5 py-1 rounded-xl transition flex items-center gap-1.5 flex-shrink-0 active:scale-95 shadow-sm"
                      title="Buka layar lebar aktivitas harian"
                    >
                      <Maximize2 className="w-3 h-3 text-indigo-400" />
                      <span>Show Daily Activity</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                    {expandedId === journal.id
                      ? journal.description
                      : journal.description.length > 220
                      ? `${journal.description.slice(0, 220)}...`
                      : journal.description}
                  </p>
                  {journal.description.length > 220 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expandedId === journal.id ? null : journal.id)
                      }
                      className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 mt-1.5 inline-flex items-center gap-1 transition"
                    >
                      {expandedId === journal.id ? 'Persempit Teks ▴' : 'Tampilkan Seluruh Deskripsi ▾'}
                    </button>
                  )}
                </div>

                {/* Photo Attachment if available */}
                {journal.photo_url && (
                  <div className="pt-2">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1.5">
                      Foto Dokumentasi Kerja:
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewerUrl(journal.photo_url || null)}
                      className="relative rounded-xl overflow-hidden border border-white/10 max-w-xs group cursor-pointer"
                    >
                      <img
                        src={journal.photo_url}
                        alt="Dokumentasi Kerja"
                        className="w-full h-36 object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white font-medium gap-1">
                        <ImageIcon className="w-4 h-4" /> Klik Perbesar
                      </div>
                    </button>
                  </div>
                )}

                {/* Mentor Feedback / Notes Box if reviewed */}
                {journal.mentor_notes && (
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                    <div className="flex items-center gap-1.5 text-indigo-300 font-bold mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Catatan Pembimbing ({journal.reviewer?.full_name || 'Pembimbing'}):</span>
                    </div>
                    <p className="text-gray-300 italic text-[11px] leading-relaxed">
                      &quot;{journal.mentor_notes}&quot;
                    </p>
                  </div>
                )}

                {/* Edit option if not yet rated */}
                {!journal.mentor_rating && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleOpenEdit(journal)}
                      className="text-[11px] text-gray-400 hover:text-indigo-400 flex items-center gap-1 transition"
                    >
                      <Edit className="w-3 h-3" /> Edit Jurnal
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Form Modal: Tulis / Edit Jurnal */}
      {formOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-lg p-5 sm:p-6 border border-indigo-500/30 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Tulis Jurnal Kegiatan Harian</span>
              </h3>
              <button
                onClick={() => setFormOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Tanggal Kegiatan
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Judul Pekerjaan / Tugas PKL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Crimping Kabel UTP & Pengecekan ODP Fiber Optik"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-gray-300 font-semibold">
                    Rincian Deskripsi Pekerjaan *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsExpandedEditor((prev) => !prev)}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition py-0.5 px-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20"
                  >
                    {isExpandedEditor ? (
                      <>
                        <Minimize2 className="w-3 h-3" />
                        <span>Kecilkan Layar</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3" />
                        <span>Perlebar Layar Ketik</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    rows={isExpandedEditor ? 14 : 5}
                    required
                    placeholder="Jelaskan secara rinci kegiatan yang Anda lakukan hari ini, kendala yang dihadapi, dan hasil akhir pekerjaan..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`input-field w-full text-xs leading-relaxed resize-y ${
                      isExpandedEditor ? 'min-h-[300px]' : 'min-h-[140px]'
                    } max-h-[600px] transition-all`}
                  />
                  {/* Visual Drag Handle Bar */}
                  <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-gray-400 bg-white/[0.02] border-x border-b border-white/10 rounded-b-xl select-none">
                    <GripHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Seret sudut bawah untuk memperlebar / mempersempit layar ketik</span>
                  </div>
                </div>
              </div>

              {/* Photo Upload Attachment */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Foto Dokumentasi Kerja (Opsional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/20 bg-black/40 max-w-xs">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-36 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null)
                        setPhotoPreview(null)
                      }}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-4 border border-dashed border-white/20 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-indigo-500/50 transition bg-white/[0.02]"
                  >
                    <Camera className="w-4 h-4 text-indigo-400" />
                    <span>Pilih Foto Bukti Kerja (Kamera / Galeri)</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="btn-outline text-xs py-2.5 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2.5 px-5 font-bold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewerUrl && (
        <div className="modal-overlay" onClick={() => setViewerUrl(null)}>
          <div className="glass-card max-w-lg p-2 rounded-2xl overflow-hidden border border-white/10" onClick={(e) => e.stopPropagation()}>
            <img src={viewerUrl} alt="Dokumentasi Full" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
            <button onClick={() => setViewerUrl(null)} className="w-full btn-outline text-xs mt-2 py-2 text-center">
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Show Daily Activity: Full Expandable Drawer / Screen */}
      {activeDetailJournal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setActiveDetailJournal(null)}
        >
          <div
            className="glass-card w-full max-w-2xl bg-[#0b0e18] border border-indigo-500/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto animate-fade-in-up flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Draggable Down Indicator Handle */}
            <div
              className="w-16 h-1.5 bg-white/30 hover:bg-white/50 rounded-full mx-auto mb-4 cursor-pointer transition active:scale-95"
              title="Klik atau geser untuk menutup"
              onClick={() => setActiveDetailJournal(null)}
            />

            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                    Daily Activity Report
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(activeDetailJournal.date)}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                  {activeDetailJournal.title}
                </h2>
              </div>
              <button
                onClick={() => setActiveDetailJournal(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Content - Widened Full Screen Reading */}
            <div className="space-y-5 flex-1">
              {/* Full Description */}
              <div>
                <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Rincian Lengkap Aktivitas Harian</span>
                </h4>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-line shadow-inner max-h-72 overflow-y-auto custom-scrollbar">
                  {activeDetailJournal.description}
                </div>
              </div>

              {/* Photo Attachment if available */}
              {activeDetailJournal.photo_url && (
                <div>
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dokumentasi Pekerjaan Teknis</span>
                  </h4>
                  <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/50 max-h-[380px] flex items-center justify-center">
                    <img
                      src={activeDetailJournal.photo_url}
                      alt="Dokumentasi Kerja"
                      className="w-full h-full object-contain max-h-[380px]"
                    />
                  </div>
                </div>
              )}

              {/* Mentor Feedback if rated */}
              {activeDetailJournal.mentor_notes && (
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      Paraf & Catatan Pembimbing Lapangan
                    </span>
                    {activeDetailJournal.mentor_rating && (
                      <div className="flex items-center gap-1 text-amber-300 text-xs font-bold font-mono">
                        <span>⭐ {activeDetailJournal.mentor_rating} / 5</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 italic leading-relaxed">
                    &quot;{activeDetailJournal.mentor_notes}&quot;
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveDetailJournal(null)}
                  className="btn-primary text-xs py-2 px-5 font-bold"
                >
                  Tutup Tampilan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  )
}

export default function StudentJournalsPage() {
  return (
    <ToastProvider>
      <JournalsContent />
    </ToastProvider>
  )
}
