import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import * as XLSX from 'xlsx'
import { formatTime, getStatusLabel, getTodayJakarta } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'xlsx' // 'xlsx' or 'csv'
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const placeId = searchParams.get('placeId')
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')

    const todayStr = getTodayJakarta()
    // Default range to current month if not specified
    const now = new Date()
    const firstDayMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`
    const effectiveStartDate = startDateParam || firstDayMonth
    const effectiveEndDate = endDateParam || todayStr

    // 1. Fetch system settings & holidays for Alpha calculation
    const [settingsRes, holidaysRes] = await Promise.all([
      adminClient.from('settings').select('working_days').limit(1).single(),
      adminClient.from('holidays').select('date, name'),
    ])

    const workingDaysConfig: number[] = settingsRes.data?.working_days || [1, 2, 3, 4, 5]
    const holidayDates = new Set((holidaysRes.data || []).map((h: any) => h.date))

    // 2. Fetch students query
    let studentQuery = adminClient
      .from('users')
      .select('id, full_name, email, phone, class_name, major, start_date, end_date, internship_place_id, internship_places(id, name)')
      .eq('role', 'student')
      .order('full_name', { ascending: true })

    if (studentId) {
      studentQuery = studentQuery.eq('id', studentId)
    } else if (placeId) {
      studentQuery = studentQuery.eq('internship_place_id', placeId)
    }

    const { data: students, error: studentErr } = await studentQuery
    if (studentErr) throw studentErr

    // 3. Fetch attendance records
    let attQuery = adminClient
      .from('attendances')
      .select('*, users(full_name, email, phone, class_name, major, internship_place_id, internship_places(name))')
      .order('date', { ascending: false })

    if (startDateParam) attQuery = attQuery.gte('date', startDateParam)
    if (endDateParam) attQuery = attQuery.lte('date', endDateParam)
    if (studentId) attQuery = attQuery.eq('user_id', studentId)
    if (status) attQuery = attQuery.eq('check_in_status', status)

    if (placeId && !studentId) {
      const studentIds = (students || []).map((s: any) => s.id)
      if (studentIds.length === 0) {
        attQuery = attQuery.in('user_id', ['00000000-0000-0000-0000-000000000000'])
      } else {
        attQuery = attQuery.in('user_id', studentIds)
      }
    }

    const { data: records, error: attErr } = await attQuery
    if (attErr) throw attErr

    // ============================================================
    // SHEET 1: RINGKASAN MATRIKS PRESENSI (Summary per Student)
    // ============================================================
    // Helper to compute working days in a date window
    const getCalendarWorkingDays = (start: string, end: string): string[] => {
      const days: string[] = []
      const curr = new Date(start)
      const stop = new Date(end)
      // Cap at today to avoid counting future days as alpha
      const maxDate = new Date(todayStr)
      const actualStop = stop < maxDate ? stop : maxDate

      while (curr <= actualStop) {
        const y = curr.getFullYear()
        const m = (curr.getMonth() + 1).toString().padStart(2, '0')
        const d = curr.getDate().toString().padStart(2, '0')
        const dStr = `${y}-${m}-${d}`

        // Day of week in JS: 0=Sun, 1=Mon, ..., 6=Sat. In ABSENKU: 1=Mon...7=Sun
        const jsDay = curr.getDay()
        const appDay = jsDay === 0 ? 7 : jsDay

        if (workingDaysConfig.includes(appDay) && !holidayDates.has(dStr)) {
          days.push(dStr)
        }
        curr.setDate(curr.getDate() + 1)
      }
      return days
    }

    const summaryRows = (students || []).map((s: any, idx: number) => {
      // Determine student active period inside the report window
      const studentStart = s.start_date && s.start_date > effectiveStartDate ? s.start_date : effectiveStartDate
      const studentEnd = s.end_date && s.end_date < effectiveEndDate ? s.end_date : effectiveEndDate

      const studentObligationDays = studentStart <= studentEnd ? getCalendarWorkingDays(studentStart, studentEnd) : []
      const totalObligation = studentObligationDays.length

      // Count attendances for this student
      const userAtts = (records || []).filter((r: any) => r.user_id === s.id)
      const onTimeCount = userAtts.filter((r: any) => r.check_in_status === 'on_time').length
      const lateCount = userAtts.filter((r: any) => r.check_in_status === 'late').length
      const izinCount = userAtts.filter((r: any) => r.check_in_status === 'izin').length
      const sakitCount = userAtts.filter((r: any) => r.check_in_status === 'sakit').length
      const totalPresent = onTimeCount + lateCount

      // Alpha is working days without attendance/permit
      const alphaCount = Math.max(0, totalObligation - (totalPresent + izinCount + sakitCount))
      const ratePercent = totalObligation > 0 ? Math.round(((totalPresent + izinCount + sakitCount) / totalObligation) * 100) : 100

      let predikat = 'Sangat Baik'
      if (ratePercent < 75) predikat = 'Perlu Pembinaan'
      else if (ratePercent < 85) predikat = 'Cukup'
      else if (ratePercent < 95) predikat = 'Baik'

      return {
        No: idx + 1,
        'Nama Peserta PKL': s.full_name,
        'Kelas & Jurusan': [s.class_name, s.major].filter(Boolean).join(' - ') || '-',
        'Tempat PKL': s.internship_places?.name || 'Kominfo Tanggamus',
        'No. WhatsApp': s.phone || '-',
        'Hari Kerja Wajib': totalObligation,
        'Hadir (Tepat Waktu)': onTimeCount,
        'Hadir (Terlambat)': lateCount,
        Izin: izinCount,
        Sakit: sakitCount,
        'Alpha (Tanpa Keterangan)': alphaCount,
        'Total Kehadiran (%)': `${ratePercent}%`,
        'Evaluasi Kehadiran': predikat,
      }
    })

    // ============================================================
    // SHEET 2: RINCIAN LOG PRESENSI HARIAN (Detail Logs)
    // ============================================================
    const detailRows = (records || []).map((r: any, idx: number) => ({
      No: idx + 1,
      Tanggal: r.date,
      'Nama Siswa': r.users?.full_name || '-',
      'Kelas & Jurusan': [r.users?.class_name, r.users?.major].filter(Boolean).join(' - ') || '-',
      'Tempat PKL': r.users?.internship_places?.name || '-',
      'Jam Masuk': r.check_in_time ? formatTime(r.check_in_time) : '-',
      'Status Masuk': getStatusLabel(r.check_in_status),
      'Alamat Masuk': r.check_in_address || '-',
      'Jam Pulang': r.check_out_time ? formatTime(r.check_out_time) : '-',
      'Alamat Pulang': r.check_out_address || '-',
      'Tipe Absen': r.is_manual ? 'Manual Admin' : 'Kamera Langsung & GPS',
      Catatan: r.note || '-',
    }))

    // Generate Workbook
    const workbook = XLSX.utils.book_new()

    // Sheet 1: Ringkasan Matriks
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Ringkasan Presensi')

    // Sheet 2: Detail Logs
    const wsDetail = XLSX.utils.json_to_sheet(detailRows.length > 0 ? detailRows : [{ Keterangan: 'Tidak ada data presensi pada rentang tanggal ini' }])
    XLSX.utils.book_append_sheet(workbook, wsDetail, 'Rincian Log Absensi')

    const dateStr = new Date().toISOString().split('T')[0]
    let filenamePrefix = 'rekap-absensi-kominfo'
    if (placeId) {
      const { data: pData } = await adminClient
        .from('internship_places')
        .select('name')
        .eq('id', placeId)
        .maybeSingle()
      if (pData?.name) {
        const sanitized = pData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        filenamePrefix = `rekap-absensi-${sanitized}`
      }
    }
    const filename = `${filenamePrefix}-${dateStr}`

    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(wsDetail)
      return new NextResponse(csvOutput, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    } else {
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      })
    }
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
