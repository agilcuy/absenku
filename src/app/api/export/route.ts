import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import { formatDate, formatTime, getStatusLabel } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'xlsx' // 'xlsx' or 'csv'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')

    let query = supabase
      .from('attendances')
      .select('*, users(full_name, email, phone)')
      .order('date', { ascending: false })

    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)
    if (studentId) query = query.eq('user_id', studentId)
    if (status) query = query.eq('check_in_status', status)

    const { data: records, error } = await query
    if (error) throw error

    // Transform into rows
    const rows = (records || []).map((r: any, idx: number) => ({
      No: idx + 1,
      Tanggal: r.date,
      'Nama Siswa': r.users?.full_name || '-',
      'Email Siswa': r.users?.email || '-',
      'No. Telepon': r.users?.phone || '-',
      'Jam Masuk': r.check_in_time ? formatTime(r.check_in_time) : '-',
      'Status Masuk': getStatusLabel(r.check_in_status),
      'Alamat Masuk': r.check_in_address || '-',
      'Jam Pulang': r.check_out_time ? formatTime(r.check_out_time) : '-',
      'Alamat Pulang': r.check_out_address || '-',
      'Tipe Absen': r.is_manual ? 'Manual Admin' : 'Otomatis',
      Catatan: r.note || '-',
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi')

    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `rekap-absensi-${dateStr}`

    if (format === 'csv') {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet)
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
