'use client'

import React, { useEffect, useState } from 'react'
import {
  X,
  User,
  Building,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Camera,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  FileText,
  Activity,
} from 'lucide-react'
import { getStatusBadge, getStatusEmoji, getStatusLabel, formatLastSeen, formatDate, formatTime } from '@/lib/utils'

interface StudentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
}

export default function StudentDetailModal({
  isOpen,
  onClose,
  studentId,
}: StudentDetailModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !studentId) {
      setData(null)
      return
    }

    const fetchDetail = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/students/${studentId}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDetail()
  }, [isOpen, studentId])

  if (!isOpen) return null

  const student = data?.student
  const stats = data?.stats
  const todayAtt = student?.today_attendance

  return (
    <div className="modal-overlay">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-white/10 shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">Detail Lengkap Peserta Didik</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span>Memuat data siswa...</span>
            </div>
          ) : !student ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Data siswa tidak ditemukan.
            </div>
          ) : (
            <>
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl overflow-hidden border-2 border-white/10">
                    {student.avatar_url ? (
                      <img
                        src={student.avatar_url}
                        alt={student.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      student.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Online Indicator */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                      student.is_online ? 'bg-emerald-500' : 'bg-slate-500'
                    }`}
                    title={student.is_online ? 'Sedang Online' : 'Offline'}
                  />
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h4 className="text-lg font-bold text-white">{student.full_name}</h4>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        student.is_online
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {student.is_online ? '🟢 Online' : '⚫ Offline'}
                    </span>
                    {!student.is_active && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                        Nonaktif
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mb-2">
                    {student.class_name ? `${student.class_name}` : 'Kelas belum diset'} •{' '}
                    {student.major || 'Jurusan belum diset'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-gray-300">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" /> {student.email}
                    </span>
                    {student.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400" /> {student.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-gray-400 text-[11px]">
                      <Activity className="w-3 h-3" /> Terakhir aktif: {formatLastSeen(student.last_seen)}
                    </span>
                  </div>
                </div>
              </div>

              {/* PKL Placement & Mentor Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <Building className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 font-medium">Tempat / Instansi PKL</p>
                    <p className="text-sm font-semibold text-white truncate">
                      {student.internship_places?.name || 'Belum Ditempatkan'}
                    </p>
                    {student.internship_places?.pic_name && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        PIC: {student.internship_places.pic_name}{' '}
                        {student.internship_places.pic_phone ? `(${student.internship_places.pic_phone})` : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-400 font-medium">Pembimbing PKL</p>
                    <p className="text-sm font-semibold text-white truncate">
                      {student.mentor?.full_name || 'Belum Ditugaskan'}
                    </p>
                    {student.mentor?.email && (
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                        {student.mentor.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* PKL Period */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>Periode PKL:</span>
                  <span className="font-semibold text-white">
                    {student.start_date ? formatDate(student.start_date) : 'Tgl Mulai (-)'} s/d{' '}
                    {student.end_date ? formatDate(student.end_date) : 'Tgl Selesai (-)'}
                  </span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {student.internship_status || 'aktif'}
                </span>
              </div>

              {/* Attendance Today Section */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <h5 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Absensi Hari Ini
                </h5>

                {todayAtt ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">Status Kehadiran:</span>
                      <span className={`badge text-xs ${getStatusBadge(todayAtt.check_in_status)}`}>
                        {getStatusEmoji(todayAtt.check_in_status)} {getStatusLabel(todayAtt.check_in_status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">Absen Masuk</span>
                        <span className="font-bold text-white">
                          {todayAtt.check_in_time ? formatTime(todayAtt.check_in_time) : '-'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                        <span className="text-gray-400 block text-[10px]">Absen Pulang</span>
                        <span className="font-bold text-white">
                          {todayAtt.check_out_time ? formatTime(todayAtt.check_out_time) : '-'}
                        </span>
                      </div>

                      {todayAtt.is_overtime && todayAtt.overtime_minutes > 0 && (
                        <div className="col-span-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                          <span className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                            ⚡ Waktu Lembur Hari Ini:
                          </span>
                          <span className="font-mono font-bold text-amber-300 text-xs">
                            {Math.floor(todayAtt.overtime_minutes / 60)} Jam {todayAtt.overtime_minutes % 60} Menit
                          </span>
                        </div>
                      )}
                    </div>

                    {todayAtt.check_in_address && (
                      <p className="text-[11px] text-gray-400 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span>{todayAtt.check_in_address}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-gray-400 bg-black/20 rounded-xl border border-white/5">
                    Belum melakukan absensi hari ini.
                  </div>
                )}
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 font-bold block">Hadir</span>
                  <span className="text-lg font-black text-white">{stats?.hadir || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] text-amber-400 font-bold block">Terlambat</span>
                  <span className="text-lg font-black text-white">{stats?.terlambat || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] text-blue-400 font-bold block">Izin</span>
                  <span className="text-lg font-black text-white">{stats?.izin || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[10px] text-purple-400 font-bold block">Sakit</span>
                  <span className="text-lg font-black text-white">{stats?.sakit || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] text-rose-400 font-bold block">Alfa</span>
                  <span className="text-lg font-black text-white">{stats?.alpha || 0}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-[10px] text-indigo-400 font-bold block">Persentase</span>
                  <span className="text-lg font-black text-white">{stats?.presenceRate || 0}%</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-black/40 flex justify-end">
          <button onClick={onClose} className="btn-outline text-xs py-2 px-4">
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
