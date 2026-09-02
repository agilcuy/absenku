import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = profile?.role === 'superadmin'

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // 1 - 12
    const year = searchParams.get('year') // 2026
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const studentId = searchParams.get('studentId')

    let query = supabase
      .from('attendances')
      .select('*, users(id, full_name, email, avatar_url), attendance_photos(*)')
      .order('date', { ascending: false })

    // Strict Authorization: Student can only access their own records
    if (!isSuperAdmin) {
      query = query.eq('user_id', user.id)
    } else if (studentId) {
      query = query.eq('user_id', studentId)
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    if (status) {
      query = query.eq('check_in_status', status)
    }

    if (year && month) {
      const padMonth = month.padStart(2, '0')
      const start = `${year}-${padMonth}-01`
      const end = `${year}-${padMonth}-31`
      query = query.gte('date', start).lte('date', end)
    } else if (year) {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ attendances: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Gagal memuat riwayat absensi.' },
      { status: 500 }
    )
  }
}
