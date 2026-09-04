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
  RefreshCw,
  Sparkles,
  Calendar as CalendarIcon,
  PartyPopper,
  CheckCircle,
  Tag,
  Info,
} from 'lucide-react'
import { useToast } from '@/components/Toast'
import {
  formatDate,
  formatTime,
  getStatusBadge,
  getStatusEmoji,
  getStatusLabel,
  MONTH_NAMES,
} from '@/lib/utils'
import { getHolidayInfo, getHolidaysForMonth } from '@/lib/nationalHolidays'

export default function AdminCalendarPage() {
  const { showToast } = useToast()
  const today = new Date()
  const todayDateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`

  const [currentMonth, setCurrentMonth] = useState(today.getMonth()) // 0-11
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState(todayDateStr)
  const [monthData, setMonthData] = useState<Record<string, any[]>>({})
  const [customHolidays, setCustomHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [liveTime, setLiveTime] = useState('')
  const [lastSyncTime, setLastSyncTime] = useState('')

  // Live Realtime Clock (Running every second in WIB)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setLiveTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta',
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch all attendances for the displayed month & load custom holidays
  const loadMonthData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const monthNum = (currentMonth + 1).toString()
      const [resAtt, resHolidays] = await Promise.all([
        fetch(`/api/admin/attendances?month=${monthNum}&year=${currentYear}`),
        fetch('/api/holidays'),
      ])

      if (resAtt.ok) {
        const json = await resAtt.json()
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

      if (resHolidays.ok) {
        const hJson = await resHolidays.json()
        setCustomHolidays(hJson.holidays || [])
      }

      const now = new Date()
      setLastSyncTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        })
      )
    } catch (err) {
      console.error('Failed to load calendar data:', err)
    } finally {
      if (!isSilent) setLoading(false)
      setRefreshing(false)
    }
  }, [currentMonth, currentYear])

  useEffect(() => {
    loadMonthData()
  }, [loadMonthData])

  // Periodic Auto-Sync (Realtime polling every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      loadMonthData(true)
    }, 30000)
    return () => clearInterval(interval)
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

  const jumpToToday = () => {
    const now = new Date()
    setCurrentMonth(now.getMonth())
    setCurrentYear(now.getFullYear())
    setSelectedDate(todayDateStr)
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
    // Determine if it's Sunday (0 in JS getDay)
    const dayOfWeek = new Date(currentYear, currentMonth, d).getDay()
    const isSunday = dayOfWeek === 0
    const holidayInfo = getHolidayInfo(dateKey, customHolidays)

    calendarDays.push({
      day: d,
      dateStr: dateKey,
      isSunday,
      holiday: holidayInfo,
    })
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadMonthData()
    showToast('Data kalender absensi berhasil disinkronisasi!', 'success')
  }

  // Selected date students and holiday info
  const selectedAttendances = monthData[selectedDate] || []
  const selectedHolidayInfo = getHolidayInfo(selectedDate, customHolidays)
  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const isSelectedDateSunday = !isNaN(selectedDateObj.getTime()) && selectedDateObj.getDay() === 0

  // All holidays & cuti bersama in current month
  const monthHolidays = getHolidaysForMonth(currentYear, currentMonth, customHolidays)

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Live Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE REALTIME</span>
            </span>
            {liveTime && (
              <span className="text-xs text-gray-300 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                {liveTime} WIB
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" />
            Kalender Absensi Realtime & Hari Libur
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Pantau absensi harian peserta didik, tanggal merah, Hari Libur Nasional & Cuti Bersama resmi SKB 3 Menteri
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={jumpToToday}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 font-semibold"
            title="Lompat ke tanggal hari ini"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Hari Ini</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-white/10 hover:border-indigo-500/40 text-gray-300"
            title="Sinkronisasi ulang data kalender"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
            <span>{refreshing ? 'Sinkron...' : 'Perbarui'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View (2 cols) */}
        <div className="lg:col-span-2 glass-card p-5 border border-white/10 flex flex-col gap-4 relative overflow-hidden">
          <div className="orb orb-purple w-48 h-48 top-[-30px] right-[-30px] opacity-30" />

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h2>
              {currentMonth === today.getMonth() && currentYear === today.getFullYear() && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                  Bulan Berjalan
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={prevMonth}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition hover:text-white"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={jumpToToday}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition"
              >
                Hari Ini
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition hover:text-white"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header (Senin s/d Minggu, Minggu = Merah) */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-gray-400 py-1 border-b border-white/5">
            <div>Senin</div>
            <div>Selasa</div>
            <div>Rabu</div>
            <div>Kamis</div>
            <div>Jumat</div>
            <div className="text-gray-400">Sabtu</div>
            <div className="text-rose-400 font-black">Minggu</div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 relative z-10">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-20 sm:h-22 rounded-xl bg-transparent" />
              }

              const isSelected = cell.dateStr === selectedDate
              const isToday = cell.dateStr === todayDateStr
              const isHoliday = cell.holiday.isHoliday
              const isCuti = cell.holiday.isCutiBersama
              const isSunday = cell.isSunday
              const isTanggalMerah = isHoliday || isSunday
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
                  className={`h-20 sm:h-22 p-1.5 sm:p-2 rounded-xl border transition cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-500/25 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/50'
                      : isToday
                      ? 'border-indigo-500/60 bg-indigo-500/10 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                      : isHoliday && isCuti
                      ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/60 hover:bg-amber-500/15'
                      : isHoliday || isSunday
                      ? 'border-rose-500/30 bg-rose-500/10 hover:border-rose-500/60 hover:bg-rose-500/15'
                      : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]'
                  }`}
                >
                  {/* Top Day Number & Badges */}
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-xs font-black ${
                        isHoliday && isCuti
                          ? 'text-amber-400'
                          : isTanggalMerah
                          ? 'text-rose-400'
                          : isToday
                          ? 'text-indigo-300'
                          : isSelected
                          ? 'text-white'
                          : 'text-gray-200'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Today Badge */}
                    {isToday && (
                      <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-indigo-500 text-white shadow">
                        Kini
                      </span>
                    )}

                    {/* Holiday Icon */}
                    {isHoliday && !isToday && (
                      <span className="text-[10px]" title={cell.holiday.name || 'Hari Libur'}>
                        {isCuti ? '🌴' : '🔴'}
                      </span>
                    )}
                  </div>

                  {/* Middle Holiday Name Label (Always Visible & Informative) */}
                  {isHoliday ? (
                    <div
                      className={`text-[8px] sm:text-[9px] font-semibold leading-tight line-clamp-2 px-1 py-0.5 rounded border truncate ${
                        isCuti
                          ? 'text-amber-200 bg-amber-500/20 border-amber-500/30'
                          : 'text-rose-200 bg-rose-500/20 border-rose-500/30'
                      }`}
                      title={cell.holiday.name || 'Hari Libur'}
                    >
                      {cell.holiday.name}
                    </div>
                  ) : (
                    items.length > 0 && (
                      <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono">
                        {items.length} hadir
                      </span>
                    )
                  )}

                  {/* Attendance Indicators Dots */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {hasOnTime && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500" title="Tepat waktu" />
                    )}
                    {hasLate && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm shadow-amber-500" title="Terlambat" />
                    )}
                    {hasAlpha && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-sm shadow-rose-500" title="Alpha" />
                    )}
                    {!hasOnTime && !hasLate && !hasAlpha && items.length === 0 && !isTanggalMerah && (
                      <span className="w-1 h-1 rounded-full bg-gray-700" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-[11px] text-gray-400 flex-wrap relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/40 text-[9px] font-bold text-rose-400 flex items-center justify-center">
                M
              </span>
              <span className="text-rose-300 font-medium">Libur Nasional / Tanggal Merah</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-400 flex items-center justify-center">
                C
              </span>
              <span className="text-amber-300 font-medium">Cuti Bersama Resmi</span>
            </div>
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
              <span className="w-2.5 h-2.5 rounded bg-indigo-500/30 border border-indigo-400" />
              <span>Hari Ini (Aktif)</span>
            </div>
          </div>

          {/* Section Daftar Hari Libur & Cuti Bersama Bulan Ini */}
          <div className="pt-4 border-t border-white/10 relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <PartyPopper className="w-4 h-4 text-rose-400" />
                <span>
                  Daftar Libur Nasional & Cuti Bersama — {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                {monthHolidays.length} Agenda Libur
              </span>
            </div>

            {monthHolidays.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Info className="w-4 h-4 text-gray-500" />
                <span>Tidak ada agenda hari libur nasional atau cuti bersama pada bulan ini (hanya libur rutin akhir pekan).</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {monthHolidays.map((h) => {
                  const isSelected = selectedDate === h.dateStr
                  const isCuti = h.type === 'cuti_bersama'

                  return (
                    <button
                      key={h.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(h.dateStr)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-3 ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-500/20 shadow-md ring-1 ring-indigo-400/40'
                          : isCuti
                          ? 'border-amber-500/30 bg-amber-500/10 hover:border-amber-500/50'
                          : 'border-rose-500/30 bg-rose-500/10 hover:border-rose-500/50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl font-bold flex flex-col items-center justify-center text-center flex-shrink-0 ${
                          isCuti
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        <span className="text-sm font-black leading-none">{h.day}</span>
                        <span className="text-[8px] uppercase tracking-wider mt-0.5">
                          {MONTH_NAMES[currentMonth].substring(0, 3)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                              isCuti
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isCuti ? '🌴 Cuti Bersama' : '🔴 Libur Nasional'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white mt-1 truncate">
                          {h.name}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Date Detail List (1 col) */}
        <div className="glass-card p-5 border border-white/10 flex flex-col gap-4 relative overflow-hidden">
          <div className="border-b border-white/10 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                Rincian Tanggal Terpilih
              </span>
              {selectedDate === todayDateStr && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Hari Ini
                </span>
              )}
            </div>
            <h3 className="text-base font-black text-white mt-1">
              {formatDate(selectedDate)}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Total tercatat: <b className="text-white">{selectedAttendances.length}</b> siswa
            </p>
          </div>

          {/* Holiday or Cuti Bersama Banner if Selected Date is Holiday */}
          {selectedHolidayInfo.isHoliday && (
            <div
              className={`p-4 rounded-2xl border text-xs animate-fade-in shadow-xl ${
                selectedHolidayInfo.isCutiBersama
                  ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/10 border-amber-500/40 text-amber-200'
                  : 'bg-gradient-to-r from-rose-500/25 via-red-500/15 to-rose-600/15 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">
                  {selectedHolidayInfo.name?.toLowerCase().includes('fitri') ||
                  selectedHolidayInfo.name?.toLowerCase().includes('adha') ||
                  selectedHolidayInfo.name?.toLowerCase().includes('islam') ||
                  selectedHolidayInfo.name?.toLowerCase().includes('mi\'raj')
                    ? '🕌'
                    : selectedHolidayInfo.name?.toLowerCase().includes('kemerdekaan')
                    ? '🇮🇩'
                    : selectedHolidayInfo.isCutiBersama
                    ? '🌴'
                    : '🎉'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        selectedHolidayInfo.isCutiBersama
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {selectedHolidayInfo.isCutiBersama
                        ? '🌴 Cuti Bersama Resmi'
                        : selectedHolidayInfo.isNational
                        ? '🇮🇩 Hari Libur Nasional Resmi'
                        : '📌 Libur Khusus / Instansi'}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-white mt-1">
                    {selectedHolidayInfo.name}
                  </h4>
                  <p className="text-[11px] opacity-90 mt-1 leading-relaxed">
                    {selectedHolidayInfo.isCutiBersama
                      ? 'Sesuai Keputusan Bersama SKB 3 Menteri, hari ini ditetapkan sebagai Cuti Bersama. Seluruh kegiatan PKL diliburkan.'
                      : 'Sesuai Kalender Nasional Republik Indonesia, hari ini adalah Hari Libur Nasional resmi. Peserta didik PKL tidak diwajibkan melakukan absensi.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sunday Notice if Selected Date is Sunday & not holiday */}
          {isSelectedDateSunday && !selectedHolidayInfo.isHoliday && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-center gap-2">
              <span className="text-base">🏖️</span>
              <span>
                <b>Hari Minggu (Akhir Pekan):</b> Libur rutin mingguan PKL.
              </span>
            </div>
          )}

          {/* Students List on that Date */}
          <div className="flex-1 overflow-y-auto max-h-[440px] space-y-2.5 pr-0.5">
            {selectedAttendances.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                <Clock className="w-8 h-8 opacity-20" />
                <span>
                  {selectedHolidayInfo.isHoliday || isSelectedDateSunday
                    ? 'Tidak ada absensi karena hari libur / cuti bersama.'
                    : 'Belum ada catatan absensi pada tanggal ini.'}
                </span>
              </div>
            ) : (
              selectedAttendances.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition flex items-center justify-between gap-3 text-xs"
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
                    {item.users?.internship_places?.name && (
                      <p className="text-[10px] text-indigo-300/80 truncate mt-0.5">
                        {item.users.internship_places.name}
                      </p>
                    )}
                  </div>

                  <div className={`badge text-[10px] flex-shrink-0 ${getStatusBadge(item.check_in_status)}`}>
                    <span>{getStatusEmoji(item.check_in_status)}</span>
                    <span>{getStatusLabel(item.check_in_status)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {lastSyncTime && (
            <div className="pt-2 border-t border-white/5 text-[10px] text-gray-500 text-center flex items-center justify-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Sinkronisasi terakhir: {lastSyncTime} WIB</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
