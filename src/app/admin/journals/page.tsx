'use client'

import React, { useEffect, useState } from 'react'
import {
  BookOpen,
  Star,
  Search,
  Calendar,
  Eye,
  X,
  Building,
  RefreshCw,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'
import { useToast, ToastProvider } from '@/components/Toast'
import { DailyJournal } from '@/types'

function JournalsAdminPageContent() {
  const { showToast } = useToast()
  const [journals, setJournals] = useState<DailyJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed'>('all')
  const [search, setSearch] = useState('')
  const [needsMigration, setNeedsMigration] = useState(false)

  // Review modal
  const [selectedJournal, setSelectedJournal] = useState<DailyJournal | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [mentorNotes, setMentorNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const loadJournals = async () => {
    try {
      const res = await fetch('/api/journals')
      if (res.ok) {
        const json = await res.json()
        if (json.needsMigration) {
          setNeedsMigration(true)
        } else {
          setJournals(json.journals || [])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadJournals()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadJournals()
    showToast('Data jurnal kegiatan berhasil diperbarui!', 'success')
  }

  const handleOpenReview = (journal: DailyJournal) => {
    setSelectedJournal(journal)
    setRating(journal.mentor_rating || 5)
    setMentorNotes(journal.mentor_notes || '')
    setReviewModalOpen(true)
  }

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJournal) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/journals/${selectedJournal.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, notes: mentorNotes }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan ulasan')

      showToast('Ulasan dan paraf jurnal berhasil disimpan!', 'success')
      setReviewModalOpen(false)
      loadJournals()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered journals
  const filtered = journals.filter((j) => {
    const student = j.users?.full_name?.toLowerCase() || ''
    const title = j.title?.toLowerCase() || ''
    const desc = j.description?.toLowerCase() || ''
    const q = search.toLowerCase()

    const matchSearch = student.includes(q) || title.includes(q) || desc.includes(q)

    if (statusFilter === 'pending') return matchSearch && !j.mentor_rating
    if (statusFilter === 'reviewed') return matchSearch && !!j.mentor_rating
    return matchSearch
  })

  // Stats
  const totalCount = journals.length
  const pendingCount = journals.filter((j) => !j.mentor_rating).length
  const reviewedCount = journals.filter((j) => !!j.mentor_rating).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manajemen Kegiatan PKL</span>
          </div>
          <h1 className="text-2xl font-black text-white">Jurnal Kegiatan Harian Siswa</h1>
          <p className="text-xs text-gray-400 mt-1">
            Periksa laporan kerja harian, beri rating bintang, dan cantumkan paraf / evaluasi pembimbing teknis.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-outline text-xs py-2 px-3.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
        </button>
      </div>

      {/* Migration Alert */}
      {needsMigration && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block text-sm">
              Tabel Database Jurnal Belum Dibuat
            </span>
            <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
              Silakan buka <b>Supabase Dashboard ➔ SQL Editor</b>, lalu jalankan file{' '}
              <code>migration_v4.sql</code> untuk mengaktifkan fitur penyimpanan jurnal kegiatan harian.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total Laporan</span>
          <p className="text-2xl font-black text-white mt-1">{totalCount}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.02]">
          <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Menunggu Review</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{pendingCount}</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02]">
          <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">Sudah Diparaf ⭐</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{reviewedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari siswa atau tugas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field text-xs pl-9 w-full"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Perlu Review ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('reviewed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === 'reviewed'
                ? 'bg-amber-600 text-white'
                : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            Selesai ({reviewedCount})
          </button>
        </div>
      </div>

      {/* Journal List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-gray-400">Memuat jurnal kegiatan...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-gray-400 rounded-2xl flex flex-col items-center gap-2">
          <BookOpen className="w-8 h-8 opacity-20" />
          <span>Tidak ada jurnal kegiatan yang sesuai kriteria.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((j) => (
            <div
              key={j.id}
              className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col gap-3.5 hover:border-indigo-500/30 transition shadow-lg"
            >
              {/* Student Identity & Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-sm border border-indigo-500/30 flex-shrink-0">
                    {j.users?.avatar_url ? (
                      <img src={j.users.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      j.users?.full_name?.charAt(0).toUpperCase() || 'S'
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{j.users?.full_name}</h3>
                    <p className="text-[11px] text-gray-400">
                      {j.users?.class_name || 'Kelas -'} • {j.users?.major || '-'} • {j.users?.internship_places?.name || 'Kominfo Tanggamus'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-mono font-semibold text-gray-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    {formatDate(j.date)}
                  </span>
                </div>
              </div>

              {/* Task Details */}
              <div>
                <h4 className="font-bold text-white text-base mb-1">{j.title}</h4>
                <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                  {j.description}
                </p>
              </div>

              {/* Photo Documentation */}
              {j.photo_url && (
                <div>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(j.photo_url || null)}
                    className="relative rounded-xl overflow-hidden border border-white/15 max-w-xs group cursor-pointer"
                  >
                    <img
                      src={j.photo_url}
                      alt="Bukti Kerja"
                      className="w-full h-32 object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs text-white font-semibold gap-1">
                      <Eye className="w-4 h-4" /> Lihat Foto Penuh
                    </div>
                  </button>
                </div>
              )}

              {/* Mentor Review Box or Action Button */}
              <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {j.mentor_rating ? (
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
                    <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full text-amber-300 font-bold self-start">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= (j.mentor_rating || 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="ml-1">({j.mentor_rating}/5)</span>
                    </div>

                    {j.mentor_notes && (
                      <p className="text-gray-300 italic text-xs">
                        &quot;{j.mentor_notes}&quot;{' '}
                        <span className="text-[10px] text-gray-500 not-italic">
                          — {j.reviewer?.full_name || 'Pembimbing'}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                    <Clock className="w-4 h-4" />
                    <span>Belum diberikan paraf/rating oleh pembimbing</span>
                  </div>
                )}

                <button
                  onClick={() => handleOpenReview(j)}
                  className={`btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto ${
                    j.mentor_rating ? 'bg-indigo-600/80 hover:bg-indigo-600' : ''
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>{j.mentor_rating ? 'Ubah Rating / Catatan' : 'Beri Rating & Paraf'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedJournal && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-indigo-500/30 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-white text-base">Evaluasi Jurnal PKL</h3>
                <p className="text-xs text-indigo-400">
                  Siswa: {selectedJournal.users?.full_name} ({formatDate(selectedJournal.date)})
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-2">
                  Nilai Kualitas Kerja / Bintang (1 - 5) *
                </label>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-black/30 border border-white/10 justify-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                      className="p-1.5 transition active:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 transition ${
                          s <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400 scale-110'
                            : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-bold text-amber-300 font-mono ml-3">
                    {hoverRating || rating} / 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Catatan Evaluasi / Rekomendasi Teknis
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Pekerjaan rapi, konfigurasi routing sudah tepat. Tingkatkan kecepatan penyambungan FO."
                  value={mentorNotes}
                  onChange={(e) => setMentorNotes(e.target.value)}
                  className="input-field w-full text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5 font-bold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Paraf & Nilai'}
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
              alt="Bukti Kerja"
              className="max-h-[80vh] w-auto mx-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function JournalsAdminPage() {
  return (
    <ToastProvider>
      <JournalsAdminPageContent />
    </ToastProvider>
  )
}
