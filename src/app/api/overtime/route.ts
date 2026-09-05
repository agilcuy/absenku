import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCallerAccess } from '@/lib/auth'

// GET overtime records with role-based filtering
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { isAdmin, isMentor, role, profile } = await getCallerAccess(user, adminClient)

    const url = new URL(req.url)
    const placeId = url.searchParams.get('place_id')
    const search = url.searchParams.get('search')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    // Base query: attendances with overtime
    let query = adminClient
      .from('attendances')
      .select(
        '*, users!attendances_user_id_fkey(id, full_name, email, phone, class_name, major, avatar_url, internship_place_id, internship_places(id, name))'
      )
      .or('is_overtime.eq.true,overtime_minutes.gt.0')
      .order('date', { ascending: false })

    // Role-based scoping
    if (role === 'student' && !isAdmin && !isMentor) {
      // Student only sees their own overtime records
      query = query.eq('user_id', user.id)
    } else if (isMentor && !isAdmin) {
      // Mentor sees overtime of students in their assigned internship place or mentored by them
      let studentQuery = adminClient.from('users').select('id').eq('role', 'student')
      if (profile?.internship_place_id) {
        studentQuery = studentQuery.or(
          `internship_place_id.eq.${profile.internship_place_id},mentor_id.eq.${user.id}`
        )
      } else {
        studentQuery = studentQuery.eq('mentor_id', user.id)
      }

      const { data: assignedStudents } = await studentQuery
      const studentIds = (assignedStudents || []).map((s: any) => s.id)
      if (studentIds.length === 0) {
        return NextResponse.json({
          overtimes: [],
          stats: { totalMinutes: 0, totalHours: '0.0', recordCount: 0 },
        })
      }
      query = query.in('user_id', studentIds)
    } else {
      // Superadmin can filter by specific place
      if (placeId) {
        // Find users in this place
        const { data: placeUsers } = await adminClient
          .from('users')
          .select('id')
          .eq('internship_place_id', placeId)
        const placeUserIds = (placeUsers || []).map((u: any) => u.id)
        if (placeUserIds.length === 0) {
          return NextResponse.json({
            overtimes: [],
            stats: { totalMinutes: 0, totalHours: '0.0', recordCount: 0 },
          })
        }
        query = query.in('user_id', placeUserIds)
      }
    }

    if (startDate) {
      query = query.gte('date', startDate)
    }
    if (endDate) {
      query = query.lte('date', endDate)
    }

    const { data: records, error } = await query

    if (error) {
      // If overtime columns don't exist yet in Supabase schema, return empty array gracefully
      if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('overtime')) {
        return NextResponse.json({
          overtimes: [],
          stats: { totalMinutes: 0, totalHours: '0.0', recordCount: 0 },
          needsMigration: true,
        })
      }
      throw error
    }

    let filteredRecords = records || []

    // Client-side search filter by student name / class
    if (search && search.trim()) {
      const sLower = search.trim().toLowerCase()
      filteredRecords = filteredRecords.filter((r: any) => {
        const name = (r.users?.full_name || '').toLowerCase()
        const className = (r.users?.class_name || '').toLowerCase()
        const place = (r.users?.internship_places?.name || '').toLowerCase()
        return name.includes(sLower) || className.includes(sLower) || place.includes(sLower)
      })
    }

    // Compute metrics
    const totalMinutes = filteredRecords.reduce((acc: number, r: any) => acc + (Number(r.overtime_minutes) || 0), 0)
    const totalHours = (totalMinutes / 60).toFixed(1)

    return NextResponse.json({
      overtimes: filteredRecords,
      stats: {
        totalMinutes,
        totalHours,
        recordCount: filteredRecords.length,
      },
    })
  } catch (err: any) {
    console.error('Error fetching overtime records:', err)
    return NextResponse.json({ error: err.message || 'Gagal memuat data lembur' }, { status: 500 })
  }
}
