'use client'

import React from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, XCircle, ArrowRight, ShieldAlert, Sparkles, X } from 'lucide-react'

interface MissingFieldItem {
  key: string
  label: string
  desc: string
}

interface BiodataAlertModalProps {
  isOpen: boolean
  onClose: () => void
  studentName?: string
  missingFields: MissingFieldItem[]
}

export default function BiodataAlertModal({
  isOpen,
  onClose,
  studentName,
  missingFields,
}: BiodataAlertModalProps) {
  if (!isOpen) return null

  const firstName = studentName ? studentName.split(' ')[0] : 'Siswa'

  return (
    <div className="modal-overlay z-50 p-4">
      <div className="glass-card w-full max-w-lg overflow-hidden border border-amber-500/40 shadow-2xl relative flex flex-col animate-fade-in-up bg-[#0d0f18]/95 backdrop-blur-2xl">
        {/* Glow ambient background */}
        <div className="orb orb-purple w-56 h-56 top-[-30px] right-[-30px] opacity-40" />

        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between relative z-10 bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Pemberitahuan Wajib Siswa PKL</span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white mt-0.5">
                Biodata Anda Belum Lengkap!
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            title="Tutup Sementara"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4 relative z-10 overflow-y-auto max-h-[70vh]">
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
            Halo <span className="font-bold text-amber-300">{firstName}</span>, akun Anda terdeteksi <b className="text-white">belum melengkapi data diri / profil</b>.
            Sesuai ketentuan, peserta didik PKL <span className="text-amber-400 font-bold underline">wajib mengisi biodata lengkap</span> agar penempatan PKL, pembimbing, dan absensi Anda tercatat sah.
          </p>

          {/* Checklist of Missing Information */}
          <div className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Data yang Perlu Anda Lengkapi:
            </span>

            {missingFields.map((field) => (
              <div
                key={field.key}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20"
              >
                <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-200">{field.label}</span>
                    <span className="text-[10px] text-rose-400 font-semibold uppercase bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      Wajib Diisi
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{field.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Warning notice box */}
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">⚠️</span>
            <span className="leading-snug">
              <b>Perhatian Penting:</b> Sistem tidak akan mengizinkan Anda melakukan absensi masuk atau pulang sebelum data diri Anda diisi dengan benar.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3 bg-black/40 relative z-10">
          <button
            onClick={onClose}
            className="w-full sm:w-auto btn-outline text-xs py-2.5 px-4 text-gray-400 hover:text-white order-2 sm:order-1 text-center"
          >
            Nanti Dulu
          </button>
          <Link
            href="/dashboard/profile?edit=true"
            onClick={onClose}
            className="w-full sm:w-auto btn-primary text-xs py-3 px-5 font-bold flex items-center justify-center gap-2 order-1 sm:order-2 shadow-lg shadow-indigo-500/30"
          >
            <Sparkles className="w-4 h-4" />
            <span>Lengkapi Biodata Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
