import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { getTodayJakarta, getNowJakarta, isWorkingDay, parseTime } from '@/lib/utils'

export async function GET() {
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

    const isSuperAdmin = await isUserSuperadmin(user, adminClient)
    const isMentor = profile?.role === 'pembimbing'

    if (!isSuperAdmin && !isMentor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const todayStr = getTodayJakarta()
    const now = getNowJakarta()

    // 1. Settings & Holiday
    const { data: settings } = await adminClient
      .from('settings')
      .select('*')
      .limit(1)
      .single()

    const checkOutConfig = settings?.check_out_time || '16:30:00'
    const workingDays = settings?.working_days || [1, 2, 3, 4, 5]

    const { data: holiday } = await adminClient
      .from('holidays')
      .select('name')
      .eq('date', todayStr)
      .maybeSingle()

    const isTodayWorkDay = isWorkingDay(now, workingDays) && !holiday

    // 2. Active students with relations, filtered by internship place for mentors
    let studentQuery = adminClient
      .from('users')
      .select(
        'id, full_name, email, phone, avatar_url, class_name, major, start_date, end_date, is_online, last_seen, internship_status, internship_place_id, internship_places(id, name), mentor:mentor_id(id, full_name)'
      )
      .eq('role', 'student')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (isMentor && !isSuperAdmin) {
      if (profile?.internship_place_id) {
        studentQuery = studentQuery.or(
          `internship_place_id.eq.${profile.internship_place_id},mentor_id.eq.${user.id}`
        )
      } else {
        studentQuery = studentQuery.eq('mentor_id', user.id)
      }
    }

    const { data: students, error: studentError } = await studentQuery
    if (studentError) throw studentError

    const totalStudents = students?.length || 0
    const studentIdSet = new Set((students || []).map((s: any) => s.id))

    // 3. Today's attendances
    const { data: todayAttendances } = await adminClient
      .from('attendances')
      .select('*, attendance_photos(*)')
      .eq('date', todayStr)

    const attendanceMap: Record<string, any> = {}
    ;(todayAttendances || []).forEach((att: any) => {
      if (studentIdSet.has(att.user_id)) {
        attendanceMap[att.user_id] = att
      }
    })

    let presentToday = 0
    let onTimeToday = 0
    let lateToday = 0
    let izinToday = 0
    let sakitToday = 0
    let alphaToday = 0
    let checkedInToday = 0
    let checkedOutToday = 0

    const attendedUserIds = new Set<string>()

    if (todayAttendances) {
      todayAttendances.forEach((att) => {
        if (!studentIdSet.has(att.user_id)) return
        attendedUserIds.add(att.user_id)
        if (att.check_in_time) {
          checkedInToday++
          if (att.check_in_status === 'on_time') {
            presentToday++
            onTimeToday++
          } else if (att.check_in_status === 'late') {
            presentToday++
            lateToday++
          }
        }
        if (att.check_out_time) {
          checkedOutToday++
        }
        if (att.check_in_status === 'izin') {
          izinToday++
        } else if (att.check_in_status === 'sakit') {
          sakitToday++
        } else if (att.check_in_status === 'alpha') {
          alphaToday++
        }
      })
    }

    // Auto-calculate Alpha & active obligations based on PKL period
    const { hours: coHours, minutes: coMinutes } = parseTime(checkOutConfig)
    const isPastCheckOut =
      now.getHours() > coHours || (now.getHours() === coHours && now.getMinutes() >= coMinutes)

    let notCheckedIn = 0
    let activeObligationStudents = 0

    // Online / Offline count (threshold: 45 seconds)
    const presenceThreshold = new Date(Date.now() - 45 * 1000)
    let onlineStudents = 0
    let offlineStudents = 0

    const studentListWithStatus = (students || []).map((s: any) => {
      const isOnline =
        s.last_seen && new Date(s.last_seen) >= presenceThreshold

      if (isOnline) onlineStudents++
      else offlineStudents++

      // Check PKL Period validity for today
      let isWithinPeriod = true
      if (s.start_date && todayStr < s.start_date) isWithinPeriod = false
      if (s.end_date && todayStr > s.end_date) isWithinPeriod = false

      if (isWithinPeriod) {
        activeObligationStudents++
        if (!attendedUserIds.has(s.id)) {
          notCheckedIn++
          if (isTodayWorkDay && isPastCheckOut) {
            alphaToday++
          }
        }
      }

      return {
        ...s,
        is_online: isOnline,
        is_within_period: isWithinPeriod,
        today_attendance: attendanceMap[s.id] || null,
      }
    })

    const attendanceRate =
      activeObligationStudents > 0
        ? Math.round(((presentToday + izinToday + sakitToday) / activeObligationStudents) * 100)
        : 100

    // 4. Multi-device check
    const ninetySecAgo = new Date(Date.now() - 90 * 1000).toISOString()
    const { data: activeSessions } = await adminClient
      .from('user_sessions')
      .select('id, user_id, device_type, os, browser, users(full_name)')
      .eq('is_active', true)
      .gte('last_active_at', ninetySecAgo)

    const sessionsByUser: Record<string, any[]> = {}
    ;(activeSessions || []).forEach((s: any) => {
      if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = []
      sessionsByUser[s.user_id].push(s)
    })

    const multiDeviceAlerts = Object.entries(sessionsByUser)
      .filter(([_, list]) => list.length > 1)
      .map(([userId, list]) => ({
        user_id: userId,
        user_name: list[0]?.users?.full_name || 'Siswa',
        sessions: list,
      }))

    // 5. Last 7 Days trend
    const { data: pastAttendances } = await adminClient
      .from('attendances')
      .select('date, check_in_status')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true })

    const trendMap: Record<
      string,
      { date: string; tepat: number; terlambat: number; izin: number; sakit: number; alpha: number }
    > = {}
    if (pastAttendances) {
      pastAttendances.forEach((item) => {
        if (!trendMap[item.date]) {
          trendMap[item.date] = { date: item.date, tepat: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0 }
        }
        if (item.check_in_status === 'on_time') trendMap[item.date].tepat++
        else if (item.check_in_status === 'late') trendMap[item.date].terlambat++
        else if (item.check_in_status === 'izin') trendMap[item.date].izin++
        else if (item.check_in_status === 'sakit') trendMap[item.date].sakit++
        else if (item.check_in_status === 'alpha') trendMap[item.date].alpha++
      })
    }
    const weeklyTrend = Object.values(trendMap)

    return NextResponse.json({
      stats: {
        totalStudents,
        onlineStudents,
        offlineStudents,
        presentToday,
        onTimeToday,
        lateToday,
        izinToday,
        sakitToday,
        alphaToday,
        checkedInToday,
        checkedOutToday,
        notCheckedIn,
        attendanceRate,
        multiDeviceCount: multiDeviceAlerts.length,
      },
      students: studentListWithStatus,
      multiDeviceAlerts,
      weeklyTrend,
      today: todayStr,
      isTodayWorkDay,
      holidayName: holiday?.name || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
