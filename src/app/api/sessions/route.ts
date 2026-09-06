import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'

// GET login activities & sessions (Superadmin)
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
    const activeOnly = searchParams.get('active') === 'true'
    const studentId = searchParams.get('studentId')

    let query = adminClient
      .from('user_sessions')
      .select('*, users(id, full_name, email, avatar_url, class_name, internship_place_id)')
      .order('last_active_at', { ascending: false })
      .limit(100)

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
        return NextResponse.json({ sessions: [], multiDeviceAlerts: [] })
      }
      query = query.in('user_id', studentIds)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (studentId) {
      query = query.eq('user_id', studentId)
    }

    const { data: sessions, error } = await query
    if (error) throw error

    // Detect multi-device active sessions (within last 90 seconds)
    const threshold = new Date(Date.now() - 90 * 1000).toISOString()
    const activeRecent = (sessions || []).filter(
      (s: any) => s.is_active && s.last_active_at >= threshold
    )

    // Group active sessions by user
    const userActiveMap: Record<string, any[]> = {}
    activeRecent.forEach((s: any) => {
      if (!userActiveMap[s.user_id]) userActiveMap[s.user_id] = []
      userActiveMap[s.user_id].push(s)
    })

    const multiDeviceAlerts = Object.entries(userActiveMap)
      .filter(([_, list]) => list.length > 1)
      .map(([userId, list]) => ({
        user_id: userId,
        user_name: list[0]?.users?.full_name || 'Siswa',
        user_email: list[0]?.users?.email,
        sessions: list,
      }))

    return NextResponse.json({
      sessions: sessions || [],
      multiDeviceAlerts,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE terminate session (Superadmin)
export async function DELETE(req: NextRequest) {
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
    const sessionId = searchParams.get('sessionId')
    const userId = searchParams.get('userId')

    const nowIso = new Date().toISOString()

    if (sessionId) {
      // Terminate specific session
      await adminClient
        .from('user_sessions')
        .update({ is_active: false, logout_at: nowIso })
        .eq('id', sessionId)

      return NextResponse.json({ success: true, message: 'Sesi perangkat berhasil diakhiri.' })
    } else if (userId) {
      // Terminate all sessions for a user
      await adminClient
        .from('user_sessions')
        .update({ is_active: false, logout_at: nowIso })
        .eq('user_id', userId)

      // Also set user offline
      await adminClient
        .from('users')
        .update({ is_online: false, last_seen: nowIso })
        .eq('id', userId)

      return NextResponse.json({
        success: true,
        message: 'Semua sesi untuk pengguna ini berhasil diakhiri.',
      })
    }

    return NextResponse.json(
      { error: 'sessionId atau userId wajib disertakan.' },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
