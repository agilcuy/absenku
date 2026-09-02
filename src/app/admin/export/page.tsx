'use client'

import React, { useState, useEffect } from 'react'
import { FileSpreadsheet, Download, Filter, Calendar, Users } from 'lucide-react'
import { useToast } from '@/components/Toast'

export default function AdminExportPage() {
  const { showToast } = useToast()

  const [students, setStudents] = useState<any[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await fetch('/api/students')
        if (res.ok) {
          const json = await res.json()
          setStudents(json.students || [])
        }
      } catch (err) {
        console.error('Failed to load students:', err)
      }
    }
    loadStudents()
  }, [])

  const handleExport = () => {
    setDownloading(true)
    try {
      const url = new URL('/api/export', window.location.origin)
      url.searchParams.set('format', exportFormat)
      if (startDate) url.searchParams.set('startDate', startDate)
      if (endDate) url.searchParams.set('endDate', endDate)
      if (selectedStudent) url.searchParams.set('studentId', selectedStudent)
      if (selectedStatus) url.searchParams.set('status', selectedStatus)

      window.open(url.toString(), '_blank')
      showToast('File rekap absensi berhasil diunduh!', 'success', 'Export Selesai')
    } catch (err: any) {
      showToast(err.message, 'error', 'Export Gagal')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
          Export Rekapitulasi Absensi
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Unduh laporan absensi peserta didik dalam format Excel (.xlsx) atau CSV untuk keperluan arsip dinas
        </p>
      </div>

      {/* Export Options Card */}
      <div className="glass-card p-6 border border-white/10 flex flex-col gap-5">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-white/10">
          <Filter className="w-4 h-4 text-indigo-400" />
          Filter & Kriteria Rekapitulasi
        </h2>

        <div className="flex flex-col gap-4 text-xs">
          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-gray-300 font-medium block mb-1">
                Dari Tanggal (Mulai)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-gray-300 font-medium block mb-1">
                Sampai Tanggal (Selesai)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* Student Filter */}
          <div>
            <label className="text-gray-300 font-medium block mb-1">
              Peserta Didik Tertentu (Opsional)
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="input-field"
            >
              <option value="">Semua Siswa</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.email})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-gray-300 font-medium block mb-1">
              Status Kehadiran (Opsional)
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input-field"
            >
              <option value="">Semua Status</option>
              <option value="on_time">🟢 Tepat Waktu Saja</option>
              <option value="late">🟡 Terlambat Saja</option>
              <option value="alpha">🔴 Alpha Saja</option>
            </select>
          </div>

          {/* Format Selector */}
          <div>
            <label className="text-gray-300 font-medium block mb-1.5">
              Format Berkas
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                  exportFormat === 'xlsx'
                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                  XLSX
                </div>
                <div>
                  <p className="font-bold text-xs text-white">Microsoft Excel</p>
                  <p className="text-[10px] text-gray-400">Direkomendasikan</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${
                  exportFormat === 'csv'
                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs">
                  CSV
                </div>
                <div>
                  <p className="font-bold text-xs text-white">Comma Separated</p>
                  <p className="text-[10px] text-gray-400">Plain text / raw data</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-end">
          <button
            onClick={handleExport}
            disabled={downloading}
            className="btn-primary py-3 px-6 text-xs font-bold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Memproses Berkas...' : 'Download Rekapitulasi'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
