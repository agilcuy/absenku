import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTodayJakarta, getNowJakarta, isWorkingDay } from '@/lib/utils'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const todayStr = getTodayJakarta()
  const now = getNowJakarta()

  // 1. Get user profile
  let userProfile: any = null
  try {
    const { data, error } = await adminClient
      .from('users')
      .select('*, internship_places(*), mentor:mentor_id(*)')
      .eq('id', user.id)
      .maybeSingle()
    if (!error && data) {
      userProfile = data
    }
  } catch {
    // Ignore relation error
  }

  if (!userProfile) {
    const { data } = await adminClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    userProfile = data
  }

  // 2. Get system settings
  const { data: settings } = await adminClient
    .from('settings')
    .select('*')
    .limit(1)
    .single()

  const defaultSettings = {
    check_in_time: '07:30:00',
    check_out_time: '16:30:00',
    timezone: 'Asia/Jakarta',
    working_days: [1, 2, 3, 4, 5],
    site_name: 'ABSENKU',
  }
  const activeSettings = settings || defaultSettings

  // 3. Check if today is a holiday
  const { data: holiday } = await adminClient
    .from('holidays')
    .select('*')
    .eq('date', todayStr)
    .maybeSingle()

  const isTodayHoliday = !!holiday
  const isTodayWorkingDay = isWorkingDay(now, activeSettings.working_days)

  // 4. Get student attendance for today
  const { data: attendance } = await adminClient
    .from('attendances')
    .select('*, attendance_photos(*)')
    .eq('user_id', user.id)
    .eq('date', todayStr)
    .maybeSingle()

  // 5. Get student statistics
  const { data: allAttendances } = await adminClient
    .from('attendances')
    .select('check_in_status')
    .eq('user_id', user.id)

  let totalPresent = 0
  let totalOnTime = 0
  let totalLate = 0
  let totalAlpha = 0

  if (allAttendances) {
    allAttendances.forEach((a) => {
      if (a.check_in_status === 'on_time') {
        totalPresent++
        totalOnTime++
      } else if (a.check_in_status === 'late') {
        totalPresent++
        totalLate++
      } else if (a.check_in_status === 'alpha') {
        totalAlpha++
      }
    })
  }

  return NextResponse.json({
    today: todayStr,
    attendance,
    settings: activeSettings,
    userProfile: userProfile || {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url,
    },
    isHoliday: isTodayHoliday,
    holidayName: holiday?.name || null,
    isWorkingDay: isTodayWorkingDay,
    stats: {
      totalPresent,
      totalOnTime,
      totalLate,
      totalAlpha,
    },
  })
}
