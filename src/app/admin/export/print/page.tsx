'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Printer, ArrowLeft, RefreshCw, Calendar, User, Building, FileText } from 'lucide-react'
import { formatDate, formatTime, getStatusLabel } from '@/lib/utils'

export default function FormalAttendancePrintPage() {
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear())
  const [attendances, setAttendances] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Load students list
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch('/api/students')
        if (res.ok) {
          const json = await res.json()
          const list = json.students || []
          setStudents(list)
          if (list.length > 0) {
            setSelectedStudentId(list[0].id)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingStudents(false)
      }
    }
    fetchStudents()
  }, [])

  // Load attendances when student, month, or year changes
  useEffect(() => {
    if (!selectedStudentId) return
    const fetchAttendances = async () => {
      setLoading(true)
      try {
        const padMonth = String(selectedMonth).padStart(2, '0')
        const res = await fetch(
          `/api/admin/attendances?month=${padMonth}&year=${selectedYear}`
        )
        if (res.ok) {
          const json = await res.json()
          const all = json.attendances || []
          const filtered = all.filter((a: any) => a.user_id === selectedStudentId)
          // Sort ascending by date for formal chronology
          filtered.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          setAttendances(filtered)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAttendances()
  }, [selectedStudentId, selectedMonth, selectedYear])

  const currentStudent = students.find((s) => s.id === selectedStudentId)

  // Statistics calculation
  const totalRecords = attendances.length
  const onTimeCount = attendances.filter((a) => a.check_in_status === 'on_time').length
  const lateCount = attendances.filter((a) => a.check_in_status === 'late').length
  const permitCount = attendances.filter((a) => a.check_in_status === 'izin' || a.check_in_status === 'sakit').length
  const alphaCount = attendances.filter((a) => a.check_in_status === 'alpha').length
  const presentCount = onTimeCount + lateCount

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-6 px-4 print:p-0 print:bg-white print:text-black">
      {/* SCREEN CONTROLS BAR (Hidden in Print Mode) */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden">
        <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <Link
            href="/admin/export"
            className="btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Export</span>
          </Link>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="input-field text-xs py-2 px-3 bg-slate-800 border-white/15"
              disabled={loadingStudents}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.class_name || 'Siswa'})
                </option>
              ))}
            </select>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input-field text-xs py-2 px-3 bg-slate-800 border-white/15"
            >
              {monthNames.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input-field text-xs py-2 px-3 bg-slate-800 border-white/15"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Print Trigger */}
          <button
            onClick={handlePrint}
            className="btn-primary text-xs py-2.5 px-5 font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/25 whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* ==============================================================
          FORMAL DOCUMENT SHEET (Optimized for A4 Printing)
         ============================================================== */}
      <div className="max-w-4xl mx-auto bg-white text-black p-8 sm:p-12 rounded-xl shadow-2xl print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full font-serif text-sm">
        {/* KOP SURAT RESMI */}
        <div className="border-b-[3px] border-black pb-3 text-center relative">
          <div className="leading-tight">
            <h3 className="text-sm font-bold tracking-wider uppercase font-sans text-gray-600">
              INSTANSI / PERUSAHAAN MITRA PRAKTIK KERJA LAPANGAN (PKL)
            </h3>
            <h2 className="text-xl font-black tracking-wide uppercase font-sans mt-0.5">
              {currentStudent?.internship_places?.name || 'SISTEM ABSENSI & MONITORING PKL'}
            </h2>
            <p className="text-xs font-sans mt-1 text-gray-700">
              {currentStudent?.internship_places?.address || 'Alamat Lokasi Penugasan Praktik Kerja Lapangan'}
            </p>
            {currentStudent?.internship_places?.phone && (
              <p className="text-xs font-sans text-gray-700">
                Kontak Instansi: {currentStudent.internship_places.phone}
              </p>
            )}
          </div>
          {/* Garis Ganda Kop Surat */}
          <div className="mt-2.5 border-t border-black pt-0.5" />
        </div>

        {/* JUDUL DOKUMEN */}
        <div className="text-center my-6">
          <h1 className="text-base font-bold uppercase underline tracking-wide">
            LEMBAR REKAPITULASI KEHADIRAN PRAKTIK KERJA LAPANGAN (PKL)
          </h1>
          <p className="text-xs font-sans text-gray-600 mt-1">
            Periode Bulan: <b>{monthNames[selectedMonth - 1]} {selectedYear}</b>
          </p>
        </div>

        {/* IDENTITAS SISWA */}
        <div className="mb-6 font-sans text-xs grid grid-cols-2 gap-y-1.5 p-3.5 rounded-lg border border-gray-300 bg-gray-50/50">
          <div>
            <span className="text-gray-500 inline-block w-32">Nama Siswa</span>
            <span className="font-bold">: {currentStudent?.full_name || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 inline-block w-32">Tempat PKL</span>
            <span className="font-bold">: {currentStudent?.internship_places?.name || 'Belum Ditentukan'}</span>
          </div>
          <div>
            <span className="text-gray-500 inline-block w-32">Kelas / Jurusan</span>
            <span>: {currentStudent?.class_name || '-'} / {currentStudent?.major || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 inline-block w-32">Pembimbing PKL</span>
            <span>: {currentStudent?.mentor?.full_name || 'Pembimbing Lapangan'}</span>
          </div>
          <div>
            <span className="text-gray-500 inline-block w-32">No. Kontak / WA</span>
            <span>: {currentStudent?.phone || '-'}</span>
          </div>
          <div>
            <span className="text-gray-500 inline-block w-32">PIC Lapangan</span>
            <span className="font-semibold">: {currentStudent?.internship_places?.pic_name || currentStudent?.mentor?.full_name || '-'}</span>
          </div>
        </div>

        {/* TABEL KEHADIRAN */}
        {loading ? (
          <div className="py-12 text-center text-xs font-sans text-gray-500">Memuat data absensi...</div>
        ) : attendances.length === 0 ? (
          <div className="py-12 text-center text-xs font-sans text-gray-500 border border-dashed border-gray-300 rounded-lg">
            Tidak ada riwayat kehadiran tercatat pada bulan {monthNames[selectedMonth - 1]} {selectedYear}.
          </div>
        ) : (
          <table className="w-full border-collapse border border-black font-sans text-[11px] mb-6">
            <thead>
              <tr className="bg-gray-100 text-center font-bold">
                <th className="border border-black px-2 py-2 w-8">No</th>
                <th className="border border-black px-2 py-2 w-28">Hari, Tanggal</th>
                <th className="border border-black px-2 py-2 w-24">Jam Masuk</th>
                <th className="border border-black px-2 py-2 w-24">Jam Pulang</th>
                <th className="border border-black px-2 py-2 w-28">Status Kehadiran</th>
                <th className="border border-black px-2 py-2">Lokasi / Keterangan</th>
                <th className="border border-black px-2 py-2 w-16">Paraf</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((att, idx) => (
                <tr key={att.id} className="text-center">
                  <td className="border border-black px-2 py-1.5">{idx + 1}</td>
                  <td className="border border-black px-2 py-1.5 text-left font-medium">
                    {formatDate(att.date)}
                  </td>
                  <td className="border border-black px-2 py-1.5 font-mono">
                    {att.check_in_time ? formatTime(att.check_in_time) : '-'}
                  </td>
                  <td className="border border-black px-2 py-1.5 font-mono">
                    {att.check_out_time ? formatTime(att.check_out_time) : '-'}
                  </td>
                  <td className="border border-black px-2 py-1.5 font-semibold">
                    {getStatusLabel(att.check_in_status)}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-left text-[10px] text-gray-700 truncate max-w-xs">
                    {att.check_in_address || (att.check_in_lat ? `${att.check_in_lat.toFixed(4)}, ${att.check_in_lng.toFixed(4)}` : '-')}
                  </td>
                  <td className="border border-black px-2 py-1.5 text-[9px] text-gray-400">
                    ✓
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* RINGKASAN REKAPITULASI */}
        <div className="mb-8 p-3 border border-black rounded-md font-sans text-xs flex items-center justify-around bg-gray-50/70">
          <div className="text-center">
            <span className="block text-[10px] text-gray-500 uppercase">Hadir Tepat Waktu</span>
            <span className="text-sm font-bold text-emerald-700">{onTimeCount} Hari</span>
          </div>
          <div className="border-l border-gray-300 h-8" />
          <div className="text-center">
            <span className="block text-[10px] text-gray-500 uppercase">Terlambat</span>
            <span className="text-sm font-bold text-amber-700">{lateCount} Hari</span>
          </div>
          <div className="border-l border-gray-300 h-8" />
          <div className="text-center">
            <span className="block text-[10px] text-gray-500 uppercase">Izin / Sakit</span>
            <span className="text-sm font-bold text-blue-700">{permitCount} Hari</span>
          </div>
          <div className="border-l border-gray-300 h-8" />
          <div className="text-center">
            <span className="block text-[10px] text-gray-500 uppercase">Tanpa Keterangan</span>
            <span className="text-sm font-bold text-rose-700">{alphaCount} Hari</span>
          </div>
          <div className="border-l border-gray-300 h-8" />
          <div className="text-center">
            <span className="block text-[10px] text-gray-500 uppercase">Total Kehadiran</span>
            <span className="text-sm font-black text-black">{presentCount} / {totalRecords} Hari</span>
          </div>
        </div>

        {/* KOLOM TANDA TANGAN RESMI */}
        <div className="font-sans text-xs mt-10">
          <div className="text-right mb-6">
            <p>{currentStudent?.internship_places?.name ? `${currentStudent.internship_places.name}, ` : ''}{formatDate(new Date())}</p>
          </div>

          <div className="grid grid-cols-3 gap-6 text-center">
            {/* Kolom Kiri: Guru Pembimbing Sekolah */}
            <div className="flex flex-col justify-between h-36">
              <p>Mengetahui,<br />Guru Pembimbing Sekolah</p>
              <div>
                <p className="font-bold underline">( .................................................. )</p>
                <p className="text-[10px] text-gray-600 mt-0.5">NIP. ..........................................</p>
              </div>
            </div>

            {/* Kolom Tengah: Siswa PKL */}
            <div className="flex flex-col justify-between h-36">
              <p>Peserta Didik PKL,<br />Yang Bersangkutan</p>
              <div>
                <p className="font-bold underline">
                  ( {currentStudent?.full_name || '..................................................'} )
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">NISN / NIM. .................................</p>
              </div>
            </div>

            {/* Kolom Kanan: Pembimbing / Penanggung Jawab Instansi PKL */}
            <div className="flex flex-col justify-between h-36">
              <p>Menyetujui,<br />Instruktur / Pembimbing Lapangan</p>
              <div>
                <p className="font-bold underline">
                  ( {currentStudent?.mentor?.full_name || currentStudent?.internship_places?.pic_name || '..................................................'} )
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">{currentStudent?.internship_places?.name || 'Instansi Mitra PKL'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
