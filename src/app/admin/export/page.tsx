'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, Download, Filter, Calendar, Users, Building, RefreshCw, Printer } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { cachedFetch, invalidateCache } from '@/lib/apiCache'

export default function AdminExportPage() {
  const { showToast } = useToast()

  const [students, setStudents] = useState<any[]>([])
  const [places, setPlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedPlace, setSelectedPlace] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [downloading, setDownloading] = useState(false)

  const loadData = async (forceFresh = false) => {
    try {
      const [sJson, pJson] = await Promise.all([
        cachedFetch('/api/students', undefined, 20000, forceFresh),
        cachedFetch('/api/internship-places', undefined, 30000, forceFresh),
      ])
      setStudents(sJson.students || [])
      setPlaces(pJson.places || [])
    } catch (err) {
      console.error('Failed to load export filters:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    invalidateCache('/api/students')
    invalidateCache('/api/internship-places')
    await loadData(true)
    showToast('Data kriteria export berhasil diperbarui!', 'success')
  }

  // Filter students dynamically based on selected internship place
  const filteredStudents = selectedPlace
    ? students.filter(
        (s) =>
          s.internship_place_id === selectedPlace ||
          s.internship_places?.id === selectedPlace
      )
    : students

  const handleExport = () => {
    setDownloading(true)
    try {
      const url = new URL('/api/export', window.location.origin)
      url.searchParams.set('format', exportFormat)
      if (startDate) url.searchParams.set('startDate', startDate)
      if (endDate) url.searchParams.set('endDate', endDate)
      if (selectedPlace) url.searchParams.set('placeId', selectedPlace)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
            Export Rekapitulasi Absensi
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Unduh laporan absensi peserta didik dalam format Excel (.xlsx) atau CSV untuk keperluan arsip dinas
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/export/print"
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-lg shadow-indigo-500/20"
            title="Cetak format fisik resmi A4 dengan kop dinas"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap PDF Resmi (A4)</span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40"
            title="Perbarui data filter"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
          </button>
        </div>
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

          {/* Tempat / Lokasi PKL Filter */}
          <div>
            <label className="text-gray-300 font-medium block mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lokasi / Tempat PKL (Pilih Dahulu) *</span>
            </label>
            <select
              value={selectedPlace}
              onChange={(e) => {
                setSelectedPlace(e.target.value)
                setSelectedStudent('') // Reset pilihan siswa agar menyesuaikan tempat PKL yang baru
              }}
              className="input-field"
            >
              <option value="">-- Pilih Lokasi Tempat PKL Terlebih Dahulu --</option>
              {places.map((p) => {
                const countInPlace = students.filter(
                  (s) => s.internship_place_id === p.id || s.internship_places?.id === p.id
                ).length
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({countInPlace} Siswa)
                  </option>
                )
              })}
            </select>
            <p className="text-[10px] text-indigo-300/80 mt-1">
              💡 Pilih lokasi tempat PKL terlebih dahulu untuk memunculkan kolom peserta didik dan mengunduh rekap.
            </p>
          </div>

          {/* Student Filter (HANYA MUNCUL JIKA TEMPAT PKL SUDAH DIPILIH) */}
          {selectedPlace ? (
            <div className="animate-fade-in p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/30 flex flex-col gap-2">
              <label className="text-gray-300 font-medium block flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-indigo-300">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Peserta Didik (Siswa di Tempat PKL Terpilih)</span>
                </span>
                <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {filteredStudents.length} Siswa
                </span>
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="input-field"
              >
                <option value="">
                  Semua Siswa di Lokasi Ini ({filteredStudents.length} Siswa)
                </option>
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} {s.class_name ? `• ${s.class_name}` : ''} ({s.email})
                  </option>
                ))}
              </select>
              {filteredStudents.length === 0 ? (
                <p className="text-[10px] text-amber-400">
                  ⚠️ Belum ada siswa yang ditempatkan di lokasi PKL ini.
                </p>
              ) : (
                <p className="text-[10px] text-gray-400">
                  Pilih "Semua Siswa di Lokasi Ini" untuk rekap kolektif, atau pilih satu siswa untuk rekap individu.
                </p>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-dashed border-white/15 flex items-center gap-2.5 text-gray-400 text-xs">
              <Building className="w-4 h-4 text-indigo-400/60 flex-shrink-0" />
              <span>
                <b>Kolom Peserta Didik Terkunci:</b> Silakan pilih <b>Lokasi / Tempat PKL</b> di atas terlebih dahulu untuk memunculkan kolom peserta didik.
              </span>
            </div>
          )}

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
            disabled={downloading || !selectedPlace}
            className="btn-primary py-3 px-6 text-xs font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
          >
            <Download className="w-4 h-4" />
            <span>
              {!selectedPlace
                ? 'Pilih Tempat PKL Terlebih Dahulu'
                : downloading
                ? 'Memproses Berkas...'
                : `Download Rekapitulasi (${exportFormat.toUpperCase()})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
