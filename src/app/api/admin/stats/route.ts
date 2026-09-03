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
    const isAdmin = await isUserSuperadmin(user, adminClient)

    if (!isAdmin) {
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

    // 2. All active students
    const { data: students } = await adminClient
      .from('users')
      .select('id, full_name, email, avatar_url')
      .eq('role', 'student')
      .eq('is_active', true)

    const totalStudents = students?.length || 0

    // 3. Today's attendances
    const { data: todayAttendances } = await adminClient
      .from('attendances')
      .select('*, users(full_name, email, avatar_url)')
      .eq('date', todayStr)

    let presentToday = 0
    let onTimeToday = 0
    let lateToday = 0
    let alphaToday = 0
    let checkedInToday = 0
    let checkedOutToday = 0

    const attendedUserIds = new Set<string>()

    if (todayAttendances) {
      todayAttendances.forEach((att) => {
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
        if (att.check_in_status === 'alpha') {
          alphaToday++
        }
      })
    }

    // Auto-calculate Alpha for students who haven't checked in past checkout time on a working day
    const { hours: coHours, minutes: coMinutes } = parseTime(checkOutConfig)
    const isPastCheckOut =
      now.getHours() > coHours || (now.getHours() === coHours && now.getMinutes() >= coMinutes)

    let notCheckedIn = 0
    if (students) {
      students.forEach((s) => {
        if (!attendedUserIds.has(s.id)) {
          notCheckedIn++
          if (isTodayWorkDay && isPastCheckOut) {
            alphaToday++
          }
        }
      })
    }

    const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0
    const lateRate = presentToday > 0 ? Math.round((lateToday / presentToday) * 100) : 0
    const alphaRate = totalStudents > 0 ? Math.round((alphaToday / totalStudents) * 100) : 0

    // 4. Last 7 Days trend
    const { data: pastAttendances } = await supabase
      .from('attendances')
      .select('date, check_in_status')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: true })

    const trendMap: Record<string, { date: string; tepat: number; terlambat: number; alpha: number }> = {}
    if (pastAttendances) {
      pastAttendances.forEach((item) => {
        if (!trendMap[item.date]) {
          trendMap[item.date] = { date: item.date, tepat: 0, terlambat: 0, alpha: 0 }
        }
        if (item.check_in_status === 'on_time') trendMap[item.date].tepat++
        else if (item.check_in_status === 'late') trendMap[item.date].terlambat++
        else if (item.check_in_status === 'alpha') trendMap[item.date].alpha++
      })
    }
    const weeklyTrend = Object.values(trendMap)

    // 5. Recent live activities (monitoring)
    const { data: recentActivities } = await supabase
      .from('attendances')
      .select('id, date, check_in_time, check_out_time, check_in_status, users(full_name, avatar_url)')
      .eq('date', todayStr)
      .order('updated_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      stats: {
        totalStudents,
        presentToday,
        onTimeToday,
        lateToday,
        alphaToday,
        checkedInToday,
        checkedOutToday,
        notCheckedIn,
        attendanceRate,
        lateRate,
        alphaRate,
      },
      weeklyTrend,
      recentActivities: recentActivities || [],
      today: todayStr,
      isTodayWorkDay,
      holidayName: holiday?.name || null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
