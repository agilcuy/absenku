'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Users,
  Eye,
} from 'lucide-react'
import {
  formatDate,
  formatTime,
  getStatusBadge,
  getStatusEmoji,
  getStatusLabel,
  MONTH_NAMES,
} from '@/lib/utils'

export default function AdminCalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()) // 0-11
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0])
  const [monthData, setMonthData] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  // Fetch all attendances for the displayed month
  const loadMonthData = useCallback(async () => {
    setLoading(true)
    try {
      const monthNum = (currentMonth + 1).toString()
      const url = `/api/admin/attendances?month=${monthNum}&year=${currentYear}`
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        const attendances = json.attendances || []

        // Group attendances by date YYYY-MM-DD
        const grouped: Record<string, any[]> = {}
        attendances.forEach((att: any) => {
          if (!grouped[att.date]) {
            grouped[att.date] = []
          }
          grouped[att.date].push(att)
        })
        setMonthData(grouped)
      }
    } catch (err) {
      console.error('Failed to load calendar data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, currentYear])

  useEffect(() => {
    loadMonthData()
  }, [loadMonthData])

  // Calendar navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  // Days in month calculation
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay() // 0 = Sunday
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  // Generate calendar cells (Monday first)
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const calendarDays = []
  for (let i = 0; i < offset; i++) {
    calendarDays.push(null)
  }
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const padDay = d.toString().padStart(2, '0')
    const padMonth = (currentMonth + 1).toString().padStart(2, '0')
    const dateKey = `${currentYear}-${padMonth}-${padDay}`
    calendarDays.push({ day: d, dateStr: dateKey })
  }

  // Selected date students
  const selectedAttendances = monthData[selectedDate] || []

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-indigo-400" />
          Kalender Absensi
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Pilih tanggal untuk melihat rekap kehadiran seluruh peserta didik pada hari tersebut
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View (2 cols) */}
        <div className="lg:col-span-2 glass-card p-5 border border-white/10 flex flex-col gap-4">
          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-base font-bold text-white">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400">
            <div>Sen</div>
            <div>Sel</div>
            <div>Rab</div>
            <div>Kam</div>
            <div>Jum</div>
            <div className="text-rose-400">Sab</div>
            <div className="text-rose-400">Min</div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-transparent" />
              }

              const isSelected = cell.dateStr === selectedDate
              const items = monthData[cell.dateStr] || []

              let hasOnTime = false
              let hasLate = false
              let hasAlpha = false

              items.forEach((item) => {
                if (item.check_in_status === 'on_time') hasOnTime = true
                if (item.check_in_status === 'late') hasLate = true
                if (item.check_in_status === 'alpha') hasAlpha = true
              })

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`h-16 p-2 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/20'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-gray-300'
                    }`}
                  >
                    {cell.day}
                  </span>

                  {/* Indicators */}
                  <div className="flex items-center gap-1">
                    {hasOnTime && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Ada tepat waktu" />}
                    {hasLate && <span className="w-2 h-2 rounded-full bg-amber-400" title="Ada terlambat" />}
                    {hasAlpha && <span className="w-2 h-2 rounded-full bg-rose-400" title="Ada alpha" />}
                    {!hasOnTime && !hasLate && !hasAlpha && items.length === 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-[11px] text-gray-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Tepat Waktu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Terlambat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Alpha</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              <span>Belum Ada Data</span>
            </div>
          </div>
        </div>

        {/* Selected Date Detail List (1 col) */}
        <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
          <div className="border-b border-white/10 pb-3">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
              Rekap Harian
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              {formatDate(selectedDate)}
            </h3>
            <p className="text-[11px] text-gray-400">
              Total tercatat: {selectedAttendances.length} siswa
            </p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[480px] space-y-2.5">
            {selectedAttendances.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500">
                Belum ada catatan absensi pada tanggal ini.
              </div>
            ) : (
              selectedAttendances.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {item.users?.full_name || 'Peserta Didik'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-indigo-400" />
                      <span>Masuk: {item.check_in_time ? formatTime(item.check_in_time) : '-'}</span>
                      {item.check_out_time && (
                        <span>· Pulang: {formatTime(item.check_out_time)}</span>
                      )}
                    </p>
                  </div>

                  <div className={`badge text-[10px] flex-shrink-0 ${getStatusBadge(item.check_in_status)}`}>
                    <span>{getStatusEmoji(item.check_in_status)}</span>
                    <span>{getStatusLabel(item.check_in_status)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
