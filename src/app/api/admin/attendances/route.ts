import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('users')
      .select('role, internship_place_id')
      .eq('id', user.id)
      .maybeSingle()

    const isAdmin = await isUserSuperadmin(user, adminClient)
    const isMentor = profile?.role === 'pembimbing'

    if (!isAdmin && !isMentor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let query = adminClient
      .from('attendances')
      .select('*, users(id, full_name, email, avatar_url, class_name, internship_place_id), attendance_photos(*)')
      .order('date', { ascending: false })
      .order('check_in_time', { ascending: false })

    if (isMentor && !isAdmin) {
      let sQuery = adminClient
        .from('users')
        .select('id')
        .eq('role', 'student')

      if (profile?.internship_place_id) {
        sQuery = sQuery.or(`internship_place_id.eq.${profile.internship_place_id},mentor_id.eq.${user.id}`)
      } else {
        sQuery = sQuery.eq('mentor_id', user.id)
      }

      const { data: mStudents } = await sQuery
      const studentIds = (mStudents || []).map((s: any) => s.id)
      if (studentIds.length === 0) {
        return NextResponse.json({ attendances: [] })
      }
      query = query.in('user_id', studentIds)
    }

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

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)

    if (!isAdmin) {
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
    const { data: newRecord, error } = await adminClient
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
