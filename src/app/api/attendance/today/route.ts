import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodayJakarta, getNowJakarta, isWorkingDay } from '@/lib/utils'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const todayStr = getTodayJakarta()
  const now = getNowJakarta()

  // 1. Get system settings
  const { data: settings } = await supabase
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

  // 2. Check if today is a holiday
  const { data: holiday } = await supabase
    .from('holidays')
    .select('*')
    .eq('date', todayStr)
    .maybeSingle()

  const isTodayHoliday = !!holiday
  const isTodayWorkingDay = isWorkingDay(now, activeSettings.working_days)

  // 3. Get student attendance for today
  const { data: attendance } = await supabase
    .from('attendances')
    .select('*, attendance_photos(*)')
    .eq('user_id', user.id)
    .eq('date', todayStr)
    .maybeSingle()

  // 4. Get student statistics
  const { data: allAttendances } = await supabase
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
