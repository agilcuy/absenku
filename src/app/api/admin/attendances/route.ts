import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

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
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let query = supabase
      .from('attendances')
      .select('*, users(id, full_name, email, avatar_url), attendance_photos(*)')
      .order('date', { ascending: false })
      .order('check_in_time', { ascending: false })

    if (date) {
      query = query.eq('date', date)
    }

    if (status) {
      query = query.eq('check_in_status', status)
    }

    if (year && month) {
      const padMonth = month.padStart(2, '0')
      const start = `${year}-${padMonth}-01`
      const end = `${year}-${padMonth}-31`
      query = query.gte('date', start).lte('date', end)
    }

    const { data, error } = await query
    if (error) throw error

    let filtered = data || []
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((att: any) =>
        att.users?.full_name?.toLowerCase().includes(searchLower) ||
        att.users?.email?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json({ attendances: filtered })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Add manual attendance by Superadmin
export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const { user_id, date, check_in_time, check_out_time, check_in_status, note } = body

    if (!user_id || !date || !check_in_status) {
      return NextResponse.json(
        { error: 'Siswa, tanggal, dan status kehadiran wajib diisi.' },
        { status: 400 }
      )
    }

    // Insert or update attendance record
    const { data: newRecord, error } = await supabase
      .from('attendances')
      .upsert({
        user_id,
        date,
        check_in_time: check_in_time ? `${date}T${check_in_time}:00.000Z` : null,
        check_out_time: check_out_time ? `${date}T${check_out_time}:00.000Z` : null,
        check_in_status,
        is_manual: true,
        note: note || 'Ditambahkan manual oleh admin',
      }, { onConflict: 'user_id,date' })
      .select('*, users(full_name, email)')
      .single()

    if (error) throw error

    await logAudit({
      action: 'ADD_MANUAL_ATTENDANCE',
      tableName: 'attendances',
      recordId: newRecord.id,
      newData: newRecord,
    })

    return NextResponse.json({
      success: true,
      message: 'Absensi manual berhasil disimpan.',
      attendance: newRecord,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
