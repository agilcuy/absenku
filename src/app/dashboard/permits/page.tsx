'use client'

import React, { useEffect, useState, useRef } from 'react'
import {
  FileText,
  Plus,
  Upload,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  Image as ImageIcon,
  X,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react'
import StudentNavbar from '@/components/StudentNavbar'
import { formatDate } from '@/lib/utils'
import { useToast, ToastProvider } from '@/components/Toast'

function StudentPermitsContent() {
  const { showToast } = useToast()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [permits, setPermits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Submit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [permitType, setPermitType] = useState<'izin' | 'sakit'>('izin')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    try {
      const [resToday, resPermits] = await Promise.all([
        fetch('/api/attendance/today'),
        fetch('/api/permits'),
      ])

      if (resToday.ok) {
        const t = await resToday.json()
        setUserProfile(t.userProfile)
      }
      if (resPermits.ok) {
        const p = await resPermits.json()
        setPermits(p.permits || [])
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
    await loadData()
    showToast('Riwayat pengajuan berhasil diperbarui!', 'success')
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 5 MB', 'error')
      return
    }

    setProofFile(file)
    const reader = new FileReader()
    reader.onload = () => setProofPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      showToast('Alasan pengajuan wajib diisi', 'error')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('type', permitType)
      formData.append('start_date', startDate)
      formData.append('end_date', endDate)
      formData.append('reason', reason.trim())
      if (proofFile) {
        formData.append('proof', proofFile)
      }

      const res = await fetch('/api/permits', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal mengirim pengajuan')

      showToast(json.message || 'Pengajuan berhasil dikirim!', 'success')
      setModalOpen(false)
      setReason('')
      setProofFile(null)
      setProofPreview(null)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#06070d] text-gray-100 flex flex-col pb-12">
      <StudentNavbar user={userProfile} />

      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Header */}
        <div className="glass-card p-6 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <FileText className="w-4 h-4" />
              <span>Layanan Siswa PKL</span>
            </div>
            <h1 className="text-2xl font-black text-white">Pengajuan Izin & Sakit</h1>
            <p className="text-xs text-gray-400 mt-1">
              Ajukan permohonan izin atau surat sakit secara online langsung ke Pembimbing PKL
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-outline text-xs py-2.5 px-3.5 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40"
              title="Perbarui riwayat pengajuan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
              <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
            </button>

            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pengajuan Baru</span>
            </button>
          </div>
        </div>

        {/* Permits History */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Riwayat Pengajuan Anda
          </h3>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-xs">Memuat riwayat pengajuan...</div>
          ) : permits.length === 0 ? (
            <div className="glass-card p-12 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 opacity-20" />
              <span>Anda belum pernah membuat pengajuan izin atau sakit.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {permits.map((p) => {
                const isPending = p.status === 'menunggu'
                const isApproved = p.status === 'disetujui'
                const isRejected = p.status === 'ditolak'

                return (
                  <div
                    key={p.id}
                    className="glass-card p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            p.type === 'sakit'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {p.type === 'sakit' ? '🏥 Sakit' : '📝 Izin'}
                        </span>

                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            isPending
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {p.status}
                        </span>

                        <span className="text-xs text-indigo-300 font-medium">
                          {formatDate(p.start_date)} s/d {formatDate(p.end_date)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed mb-1">
                        <span className="text-gray-400">Alasan:</span> {p.reason}
                      </p>

                      {isRejected && p.rejection_reason && (
                        <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg mt-2">
                          <span className="font-semibold">Catatan Penolakan:</span> {p.rejection_reason}
                        </p>
                      )}

                      {isApproved && (
                        <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Absensi otomatis tercatat sebagai "{p.type.toUpperCase()}"</span>
                        </p>
                      )}
                    </div>

                    {p.proof_url && (
                      <button
                        onClick={() => setPreviewImage(p.proof_url)}
                        className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-center"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Lihat Bukti</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Form Submission */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 shadow-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white">Form Pengajuan Izin / Sakit</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Type Selection */}
              <div>
                <label className="block text-gray-300 font-medium mb-1.5">Jenis Pengajuan *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPermitType('izin')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                      permitType === 'izin'
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>📝</span>
                    <span>Izin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermitType('sakit')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                      permitType === 'sakit'
                        ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>🏥</span>
                    <span>Sakit</span>
                  </button>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Mulai Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Sampai Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Alasan & Keterangan Lengkap *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={
                    permitType === 'sakit'
                      ? 'Contoh: Mengalami demam tinggi dan flu berdasarkan diagnosa dokter...'
                      : 'Contoh: Menghadiri keperluan penting keluarga di luar kota...'
                  }
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>

              {/* Proof Attachment */}
              <div>
                <label className="block text-gray-300 font-medium mb-1">
                  Upload Bukti Foto (Surat Dokter / Surat Izin)
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {proofPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/20">
                    <img
                      src={proofPreview}
                      alt="Preview Bukti"
                      className="max-h-48 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProofFile(null)
                        setProofPreview(null)
                      }}
                      className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-black"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-white/10 hover:border-indigo-500/40 bg-white/5 flex flex-col items-center justify-center gap-1.5 transition text-gray-400 hover:text-white"
                  >
                    <Upload className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-medium">Klik untuk Ambil Foto / Pilih File</span>
                    <span className="text-[10px] text-gray-500">JPG, PNG atau JPEG (Maks. 5 MB)</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
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

export default function StudentPermitsPage() {
  return (
    <ToastProvider>
      <StudentPermitsContent />
    </ToastProvider>
  )
}
