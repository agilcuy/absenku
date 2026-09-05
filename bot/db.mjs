import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Membaca .env.local dari root project
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ [BOT WA] Peringatan: Variabel SUPABASE URL atau SERVICE_ROLE_KEY tidak ditemukan di .env.local')
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: { persistSession: false },
})

// Dapatkan tanggal hari ini zona Asia/Jakarta (YYYY-MM-DD)
export function getTodayJakarta() {
  const now = new Date()
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

// Dapatkan jam saat ini zona Asia/Jakarta (HH:MM WIB)
export function getNowJakartaTime() {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date()) + ' WIB'
}

// Cek apakah hari ini hari libur di database
export async function isTodayHoliday(todayStr = getTodayJakarta()) {
  try {
    const { data } = await supabase
      .from('holidays')
      .select('name')
      .eq('date', todayStr)
      .maybeSingle()
    return data ? data.name : null
  } catch (err) {
    console.error('Error checking holiday:', err)
    return null
  }
}

// Ambil data rekap presensi hari ini
export async function getAttendanceRecapData(todayStr = getTodayJakarta()) {
  try {
    // 1. Ambil seluruh siswa aktif
    const { data: students, error: sErr } = await supabase
      .from('users')
      .select('id, full_name, class_name, major, phone, start_date, end_date, internship_place_id, internship_places(id, name)')
      .eq('role', 'student')
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (sErr) throw sErr

    // Filter siswa yang memang sedang dalam masa PKL aktif
    const activeStudents = (students || []).filter((s) => {
      if (s.start_date && todayStr < s.start_date) return false
      if (s.end_date && todayStr > s.end_date) return false
      return true
    })

    // 2. Ambil seluruh absensi hari ini
    const { data: attendances, error: aErr } = await supabase
      .from('attendances')
      .select('user_id, check_in_time, check_in_status, check_out_time')
      .eq('date', todayStr)

    if (aErr) throw aErr

    const attendanceMap = new Map()
    ;(attendances || []).forEach((att) => {
      attendanceMap.set(att.user_id, att)
    })

    const onTimeList = []
    const lateList = []
    const izinList = []
    const sakitList = []
    const belumAbsenList = []

    const byPlace = {}

    activeStudents.forEach((student) => {
      const placeName = student.internship_places?.name || 'Belum Ditentukan'
      if (!byPlace[placeName]) {
        byPlace[placeName] = {
          total: 0,
          onTime: 0,
          late: 0,
          izin: 0,
          sakit: 0,
          belum: 0,
          students: [],
        }
      }
      byPlace[placeName].total++

      const att = attendanceMap.get(student.id)
      const item = {
        name: student.full_name,
        className: student.class_name || '-',
        place: placeName,
        phone: student.phone,
        checkInTime: att?.check_in_time ? new Date(att.check_in_time).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) + ' WIB' : null,
        checkOutTime: att?.check_out_time ? new Date(att.check_out_time).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) + ' WIB' : null,
      }

      if (!att || !att.check_in_status) {
        belumAbsenList.push(item)
        byPlace[placeName].belum++
      } else if (att.check_in_status === 'on_time') {
        onTimeList.push(item)
        byPlace[placeName].onTime++
      } else if (att.check_in_status === 'late') {
        lateList.push(item)
        byPlace[placeName].late++
      } else if (att.check_in_status === 'izin') {
        izinList.push(item)
        byPlace[placeName].izin++
      } else if (att.check_in_status === 'sakit') {
        sakitList.push(item)
        byPlace[placeName].sakit++
      }

      byPlace[placeName].students.push({
        ...item,
        status: att?.check_in_status || 'belum',
      })
    })

    return {
      todayStr,
      totalStudents: activeStudents.length,
      onTimeCount: onTimeList.length,
      lateCount: lateList.length,
      izinCount: izinList.length,
      sakitCount: sakitList.length,
      belumCount: belumAbsenList.length,
      onTimeList,
      lateList,
      izinList,
      sakitList,
      belumAbsenList,
      byPlace,
    }
  } catch (err) {
    console.error('Error in getAttendanceRecapData:', err)
    throw err
  }
}
