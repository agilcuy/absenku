'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  CalendarCheck,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import { formatDate, DAY_NAMES } from '@/lib/utils'

export default function AdminSchedulePage() {
  const { showToast } = useToast()

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingDays, setSavingDays] = useState(false)

  // Add holiday modal
  const [modalOpen, setModalOpen] = useState(false)
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayName, setHolidayName] = useState('')
  const [submittingHoliday, setSubmittingHoliday] = useState(false)

  const loadData = useCallback(async () => {
    try {
      // 1. Load settings for working days
      const resSettings = await fetch('/api/settings')
      if (resSettings.ok) {
        const json = await resSettings.json()
        if (json.settings?.working_days) {
          setWorkingDays(json.settings.working_days)
        }
      }

      // 2. Load holidays
      const resHolidays = await fetch('/api/holidays')
      if (resHolidays.ok) {
        const json = await resHolidays.json()
        setHolidays(json.holidays || [])
      }
    } catch (err) {
      console.error('Failed to load schedule data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Toggle working day
  const toggleDay = (dayNum: number) => {
    if (workingDays.includes(dayNum)) {
      if (workingDays.length === 1) {
        showToast('Minimal harus ada 1 hari kerja aktif.', 'warning', 'Peringatan')
        return
      }
      setWorkingDays((prev) => prev.filter((d) => d !== dayNum))
    } else {
      setWorkingDays((prev) => [...prev, dayNum].sort())
    }
  }

  // Save working days
  const handleSaveDays = async () => {
    setSavingDays(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ working_days: workingDays }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan hari kerja.')

      showToast('Konfigurasi hari kerja berhasil disimpan!', 'success', 'Tersimpan')
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSavingDays(false)
    }
  }

  // Add holiday submit
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingHoliday(true)
    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: holidayDate, name: holidayName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menambahkan hari libur.')

      showToast('Hari libur berhasil ditambahkan!', 'success', 'Tersimpan')
      setModalOpen(false)
      setHolidayDate('')
      setHolidayName('')
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    } finally {
      setSubmittingHoliday(false)
    }
  }

  // Delete holiday
  const handleDeleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Hapus hari libur "${name}"?`)) return
    try {
      const res = await fetch(`/api/holidays/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus hari libur.')

      showToast('Hari libur berhasil dihapus.', 'success', 'Dihapus')
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error', 'Error')
    }
  }

  const allDays = [1, 2, 3, 4, 5, 6, 7]

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-indigo-400" />
          Manajemen Hari Kerja & Hari Libur
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Tentukan hari operasional PKL dan tanggal libur khusus agar tidak terhitung Alpha
        </p>
      </div>

      {/* Working Days Card */}
      <div className="glass-card p-6 border border-white/10 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-400" />
              Hari Kerja Operasional
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Hari di mana siswa diwajibkan melakukan absensi masuk & pulang
            </p>
          </div>
          <button
            onClick={handleSaveDays}
            disabled={savingDays}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingDays ? 'Menyimpan...' : 'Simpan Hari Kerja'}</span>
          </button>
        </div>

        {/* Days Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {allDays.map((dayNum) => {
            const isWorking = workingDays.includes(dayNum)
            const dayName = DAY_NAMES[dayNum]

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => toggleDay(dayNum)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                  isWorking
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                    : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/20'
                }`}
              >
                <span className="text-xs font-bold">{dayName}</span>
                <div className="flex items-center gap-1 text-[11px]">
                  {isWorking ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Kerja
                    </span>
                  ) : (
                    <span className="text-gray-500">Libur</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Holidays Card */}
      <div className="glass-card p-6 border border-white/10 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-400" />
              Daftar Hari Libur Khusus
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Tanggal libur nasional atau khusus dinas tidak akan mencatat Alpha
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Hari Libur</span>
          </button>
        </div>

        {/* Holidays List */}
        {loading ? (
          <div className="text-xs text-gray-500 text-center py-6">Memuat daftar libur...</div>
        ) : holidays.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-6 bg-white/[0.01] rounded-xl border border-white/5">
            Belum ada hari libur khusus yang ditambahkan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-white">{h.name}</p>
                  <p className="text-[11px] text-indigo-400 mt-0.5">{formatDate(h.date)}</p>
                </div>
                <button
                  onClick={() => handleDeleteHoliday(h.id, h.name)}
                  title="Hapus Hari Libur"
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD HOLIDAY MODAL */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="glass-card p-6 w-full max-w-sm border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Tambah Hari Libur
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHoliday} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-gray-400 font-medium block mb-1">Tanggal Libur</label>
                <input
                  type="date"
                  required
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="text-gray-400 font-medium block mb-1">Keterangan / Nama Libur</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: HUT Kemerdekaan RI Ke-81"
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline py-2 px-4"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingHoliday}
                  className="btn-primary py-2 px-4"
                >
                  {submittingHoliday ? 'Menyimpan...' : 'Simpan Libur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
