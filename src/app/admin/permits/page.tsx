'use client'

import React, { useEffect, useState } from 'react'
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Calendar,
  Eye,
  AlertCircle,
  X,
  Building,
  RefreshCw,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useToast, ToastProvider } from '@/components/Toast'

function PermitsAdminPageContent() {
  const { showToast } = useToast()
  const [permits, setPermits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'menunggu' | 'disetujui' | 'ditolak'>('all')
  const [search, setSearch] = useState('')

  // Detail / Review modal
  const [selectedPermit, setSelectedPermit] = useState<any>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'disetujui' | 'ditolak'>('disetujui')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const loadPermits = async () => {
    try {
      const res = await fetch('/api/permits')
      if (res.ok) {
        const json = await res.json()
        setPermits(json.permits || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPermits()
    showToast('Data izin & sakit berhasil diperbarui!', 'success')
  }

  useEffect(() => {
    loadPermits()
  }, [])

  const handleOpenReview = (permit: any, type: 'disetujui' | 'ditolak') => {
    setSelectedPermit(permit)
    setActionType(type)
    setRejectionReason('')
    setReviewModalOpen(true)
  }

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPermit) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/permits/${selectedPermit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType,
          rejection_reason: rejectionReason,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memproses pengajuan')

      showToast(json.message || 'Status pengajuan berhasil diperbarui', 'success')
      setReviewModalOpen(false)
      loadPermits()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = permits.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = p.users?.full_name?.toLowerCase().includes(q)
      const matchReason = p.reason?.toLowerCase().includes(q)
      if (!matchName && !matchReason) return false
    }
    return true
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="glass-card p-6 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Verifikasi & Disiplin</span>
          </div>
          <h1 className="text-2xl font-black text-white">Pengajuan Izin & Sakit Siswa</h1>
          <p className="text-xs text-gray-400 mt-1">
            Tinjau surat bukti, setujui, atau tolak permohonan ketidakhadiran siswa PKL
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-outline text-xs py-2.5 px-3.5 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40 self-start sm:self-auto"
          title="Perbarui data izin & sakit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
          <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="glass-card p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs self-start">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Semua ({permits.length})
          </button>
          <button
            onClick={() => setStatusFilter('menunggu')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'menunggu'
                ? 'bg-amber-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Menunggu ({permits.filter((p) => p.status === 'menunggu').length})
          </button>
          <button
            onClick={() => setStatusFilter('disetujui')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'disetujui'
                ? 'bg-emerald-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Disetujui ({permits.filter((p) => p.status === 'disetujui').length})
          </button>
          <button
            onClick={() => setStatusFilter('ditolak')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'ditolak' ? 'bg-rose-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Ditolak ({permits.filter((p) => p.status === 'ditolak').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari siswa / alasan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field text-xs pl-9 w-full"
          />
        </div>
      </div>

      {/* Permits List */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-xs">Memuat daftar pengajuan...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
          <FileText className="w-8 h-8 opacity-20" />
          <span>Tidak ada pengajuan izin / sakit pada filter ini.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((permit) => {
            const isPending = permit.status === 'menunggu'
            const isApproved = permit.status === 'disetujui'
            const isRejected = permit.status === 'ditolak'

            return (
              <div
                key={permit.id}
                className="glass-card p-5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-500/40 transition"
              >
                {/* Left: Student & Details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-sm flex-shrink-0 border border-white/10">
                    {permit.users?.full_name?.charAt(0).toUpperCase() || 'S'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-white">{permit.users?.full_name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          permit.type === 'sakit'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {permit.type === 'sakit' ? '🏥 Sakit' : '📝 Izin'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isPending
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : isApproved
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {permit.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 mb-1 leading-relaxed">
                      <span className="font-semibold text-gray-400">Keterangan:</span> {permit.reason}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1 text-indigo-300">
                        <Calendar className="w-3 h-3" />
                        {formatDate(permit.start_date)} s/d {formatDate(permit.end_date)}
                      </span>
                      <span>
                        Kelas: {permit.users?.class_name || '-'} • {permit.users?.internship_places?.name || 'PKL -'}
                      </span>
                    </div>

                    {isRejected && permit.rejection_reason && (
                      <p className="text-[11px] text-rose-300 mt-2 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                        <span className="font-semibold">Alasan Penolakan:</span> {permit.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Proof & Review Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-end md:self-center flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/5 w-full md:w-auto justify-end">
                  {permit.proof_url ? (
                    <button
                      onClick={() => setPreviewImage(permit.proof_url)}
                      className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Lihat Bukti Foto</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-500 italic px-2">Tanpa Bukti Foto</span>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReview(permit, 'disetujui')}
                        className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Setujui</span>
                      </button>
                      <button
                        onClick={() => handleOpenReview(permit, 'ditolak')}
                        className="btn-outline border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedPermit && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white">
                {actionType === 'disetujui' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <p className="font-semibold text-white">{selectedPermit.users?.full_name}</p>
                <p className="text-gray-400">
                  Jenis: <span className="font-bold uppercase text-white">{selectedPermit.type}</span>
                </p>
                <p className="text-gray-400">
                  Periode: {formatDate(selectedPermit.start_date)} s/d {formatDate(selectedPermit.end_date)}
                </p>
              </div>

              {actionType === 'disetujui' ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 leading-relaxed">
                  Menyetujui pengajuan ini akan secara otomatis memperbarui rekaman absensi siswa menjadi{' '}
                  <span className="font-bold uppercase text-white">"{selectedPermit.type}"</span> pada rentang tanggal tersebut.
                </div>
              ) : (
                <div>
                  <label className="block text-gray-300 font-medium mb-1">
                    Alasan Penolakan (Wajib Diisi) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: Bukti surat tidak terbaca / tanggal tidak valid..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
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
                  className={`text-xs py-2 px-5 rounded-xl font-bold transition text-white ${
                    actionType === 'disetujui'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submitting
                    ? 'Memproses...'
                    : actionType === 'disetujui'
                    ? 'Konfirmasi Setujui'
                    : 'Konfirmasi Tolak'}
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
              alt="Bukti Foto"
              className="max-h-[80vh] w-auto mx-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function PermitsAdminPage() {
  return (
    <ToastProvider>
      <PermitsAdminPageContent />
    </ToastProvider>
  )
}
