import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCallerAccess } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { isAdmin, isMentor, profile } = await getCallerAccess(user, adminClient)

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month') // 1 - 12
    const year = searchParams.get('year') // 2026
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const studentId = searchParams.get('studentId')

    let query = adminClient
      .from('attendances')
      .select('*, users(id, full_name, email, avatar_url), attendance_photos(*)')
      .order('date', { ascending: false })

    // Strict Authorization:
    // Student can only access their own records
    if (!isAdmin && !isMentor) {
      query = query.eq('user_id', user.id)
    } else if (isMentor && !isAdmin) {
      if (studentId) {
        // Verify student belongs to mentor
        let sCheck = adminClient.from('users').select('id, internship_place_id, mentor_id').eq('id', studentId).single()
        const { data: targetStudent } = await sCheck
        const isSamePlace = profile?.internship_place_id && targetStudent?.internship_place_id === profile.internship_place_id
        const isAssigned = targetStudent?.mentor_id === user.id
        if (!isSamePlace && !isAssigned) {
          return NextResponse.json({ error: 'Forbidden: Siswa bukan bimbingan Anda.' }, { status: 403 })
        }
        query = query.eq('user_id', studentId)
      } else {
        // Mentor sees all students in their purview
        let sQuery = adminClient.from('users').select('id').eq('role', 'student')
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
    } else if (isAdmin && studentId) {
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
      const yNum = parseInt(year)
      const mNum = parseInt(month)
      const padMonth = String(mNum).padStart(2, '0')
      const lastDay = new Date(yNum, mNum, 0).getDate()
      const start = `${yNum}-${padMonth}-01`
      const end = `${yNum}-${padMonth}-${String(lastDay).padStart(2, '0')}`
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
