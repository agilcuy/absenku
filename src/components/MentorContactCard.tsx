'use client'

import React from 'react'
import { GraduationCap, Building, Phone, Mail, MessageCircle, ExternalLink, ShieldCheck, UserCheck } from 'lucide-react'
import { formatWhatsAppUrl } from '@/lib/utils'

interface MentorContactCardProps {
  mentor?: {
    id?: string
    full_name?: string
    email?: string
    phone?: string
    avatar_url?: string
    internship_places?: {
      id?: string
      name?: string
      address?: string
    }
  } | null
  studentName?: string
  placeName?: string
}

export default function MentorContactCard({
  mentor,
  studentName,
  placeName,
}: MentorContactCardProps) {
  if (!mentor) {
    return (
      <div className="glass-card p-4 sm:p-5 border border-purple-500/20 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Pembimbing PKL Anda
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Belum ada pembimbing yang ditugaskan ke akun Anda. Silakan hubungi Administrator.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const resolvedPlace = mentor.internship_places?.name || placeName
  const waUrl = mentor.phone
    ? formatWhatsAppUrl(mentor.phone, mentor.full_name, studentName, resolvedPlace)
    : null

  return (
    <div className="glass-card p-4 sm:p-5 border border-purple-500/30 relative overflow-hidden shadow-lg shadow-purple-950/20 group">
      {/* Background ambient glow */}
      <div className="orb orb-purple w-36 h-36 top-[-20px] right-[-20px] opacity-40 pointer-events-none" />

      {/* Header section */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-widest block">
              Pembimbing PKL Anda
            </span>
            <span className="text-xs font-bold text-white">
              Konsultasi & Koordinasi Bimbingan
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Pembimbing Aktif
        </span>
      </div>

      {/* Body: Mentor Info & Direct Contact */}
      <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Mentor profile snippet */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500/30 to-indigo-500/20 border border-purple-400/40 text-purple-200 font-black text-lg flex items-center justify-center shadow-inner flex-shrink-0">
            {mentor.full_name?.charAt(0).toUpperCase() || 'P'}
          </div>

          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-purple-300 transition">
              {mentor.full_name}
            </h4>

            <div className="flex flex-col gap-1 mt-1 text-[11px] text-gray-400">
              {resolvedPlace && (
                <div className="flex items-center gap-1.5 text-purple-300 font-medium truncate">
                  <Building className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="truncate">{resolvedPlace}</span>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {mentor.phone && (
                  <span className="flex items-center gap-1 text-gray-300 font-mono text-[11px]">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    {mentor.phone}
                  </span>
                )}
                {mentor.email && (
                  <span className="flex items-center gap-1 text-gray-400 truncate">
                    <Mail className="w-3 h-3 text-gray-500" />
                    <span className="truncate">{mentor.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Direct Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          {waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/40 active:scale-95"
              title={`Chat WhatsApp langsung dengan ${mentor.full_name}`}
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Chat WhatsApp</span>
            </a>
          ) : (
            <div className="text-[11px] text-gray-500 italic bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/5">
              Nomor WA belum tersedia
            </div>
          )}

          {mentor.email && (
            <a
              href={`mailto:${mentor.email}?subject=${encodeURIComponent(
                `Konsultasi PKL - ${studentName || 'Peserta Didik'}`
              )}`}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition active:scale-95"
              title="Kirim Email"
            >
              <Mail className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
