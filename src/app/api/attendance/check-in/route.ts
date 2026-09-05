import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTodayJakarta, getNowJakarta, getAttendanceStatus, isWorkingDay, isCheckInAllowed } from '@/lib/utils'
import { getAddressFromCoords, calculateDistanceMeters, DEFAULT_OFFICE_COORDS, getPlaceCoordinates } from '@/lib/geo'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const todayStr = getTodayJakarta()
    const now = getNowJakarta()

    // 0. Check student profile completeness (mandatory for role === 'student')
    const { data: userProfile } = await adminClient
      .from('users')
      .select('id, role, class_name, major, phone, internship_place_id, internship_places(*)')
      .eq('id', user.id)
      .maybeSingle()

    if (userProfile && userProfile.role === 'student') {
      const missingFields: string[] = []
      if (!userProfile.class_name?.trim()) missingFields.push('Kelas')
      if (!userProfile.major?.trim()) missingFields.push('Jurusan')
      if (!userProfile.phone?.trim()) missingFields.push('Nomor WhatsApp')
      if (!userProfile.internship_place_id) missingFields.push('Tempat PKL')

      if (missingFields.length > 0) {
        return NextResponse.json(
          {
            error: `Biodata Anda belum lengkap (${missingFields.join(', ')}). Harap lengkapi data profil Anda terlebih dahulu agar absensi dapat dicatat.`,
          },
          { status: 400 }
        )
      }
    }

    // 1. Get settings
    const { data: settings } = await adminClient
      .from('settings')
      .select('*')
      .limit(1)
      .single()

    const checkInConfig = settings?.check_in_time || '08:30:00'
    const workingDays = settings?.working_days || [1, 2, 3, 4, 5]

    // 1b. Check if check-in is open (mulai jam 06:00 pagi WIB)
    if (!isCheckInAllowed('06:00:00')) {
      const scheduleEnd = checkInConfig.substring(0, 5)
      return NextResponse.json(
        {
          error: `Absensi masuk belum dibuka. Absensi masuk dibuka mulai pukul 06:00 s.d ${scheduleEnd} WIB.`,
        },
        { status: 400 }
      )
    }

    // 2. Check holiday
    const { data: holiday } = await adminClient
      .from('holidays')
      .select('name')
      .eq('date', todayStr)
      .maybeSingle()

    if (holiday) {
      return NextResponse.json(
        { error: `Hari ini libur (${holiday.name}). Absensi tidak diperlukan.` },
        { status: 400 }
      )
    }

    // 3. Check working day
    if (!isWorkingDay(now, workingDays)) {
      return NextResponse.json(
        { error: 'Hari ini bukan hari kerja. Absensi tidak dapat dilakukan.' },
        { status: 400 }
      )
    }

    // 4. Check existing attendance
    const { data: existing } = await adminClient
      .from('attendances')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle()

    if (existing && existing.check_in_time) {
      return NextResponse.json(
        { error: 'Anda sudah melakukan absensi masuk hari ini.' },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const photoFile = formData.get('photo') as File | null
    const latStr = formData.get('lat') as string | null
    const lngStr = formData.get('lng') as string | null

    // Strict photo validation
    if (!photoFile || !(photoFile instanceof File) || photoFile.size === 0) {
      return NextResponse.json(
        {
          error: 'Foto bukti kehadiran wajib dilampirkan! Absensi tidak akan dicatat oleh sistem tanpa lampiran foto.',
        },
        { status: 400 }
      )
    }

    const lat = latStr ? parseFloat(latStr) : null
    const lng = lngStr ? parseFloat(lngStr) : null

    const isStudent = userProfile?.role === 'student'

    // Strict GPS requirement for students
    if (isStudent && (lat === null || lng === null || isNaN(lat) || isNaN(lng))) {
      return NextResponse.json(
        {
          error:
            'Koordinat GPS wajib aktif! Harap izinkan akses lokasi (GPS) pada browser atau HP Anda agar absensi dapat diverifikasi.',
        },
        { status: 400 }
      )
    }

    let address = 'Lokasi tidak diketahui'
    if (lat !== null && lng !== null) {
      address = await getAddressFromCoords(lat, lng)
    }

    // Geofencing calculation strictly against student's assigned internship place
    const place = (userProfile as any)?.internship_places || null
    const resolvedCoords = getPlaceCoordinates(place)
    const placeLat = resolvedCoords?.lat ?? (place?.latitude !== undefined && place?.latitude !== null ? Number(place.latitude) : null)
    const placeLng = resolvedCoords?.lng ?? (place?.longitude !== undefined && place?.longitude !== null ? Number(place.longitude) : null)
    const placeRadius = resolvedCoords?.radiusMeters ?? (place?.radius_meters ? Number(place.radius_meters) : 200)
    const placeName = resolvedCoords?.name || place?.name || 'Tempat Penugasan PKL'

    let distanceMeters: number | null = null
    let isWithinRadius: boolean = true

    if (lat !== null && lng !== null && placeLat !== null && placeLng !== null) {
      distanceMeters = calculateDistanceMeters(lat, lng, placeLat, placeLng)
      isWithinRadius = distanceMeters <= placeRadius
    }

    // Strict Geofencing enforcement for students (only if place coordinates are configured)
    if (isStudent && placeLat !== null && placeLng !== null && distanceMeters !== null && !isWithinRadius) {
      const roundedDistance = Math.round(distanceMeters)
      return NextResponse.json(
        {
          error: `Anda terdeteksi berjarak ${roundedDistance} meter dari lokasi PKL (${placeName}). Batas maksimal absensi adalah radius ${placeRadius} meter. Harap lakukan absensi langsung di area instansi penugasan PKL Anda.`,
          distanceMeters,
          placeRadius,
          placeName,
        },
        { status: 400 }
      )
    }

    // Determine status (on_time or late)
    const status = getAttendanceStatus(now, checkInConfig)

    // Handle photo upload via adminClient (bypasses RLS)
    let photoUrl = ''
    try {
      const arrayBuffer = await photoFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const fileExt = photoFile.name ? photoFile.name.split('.').pop() || 'jpg' : 'jpg'
      const filePath = `${user.id}/${todayStr}-checkin-${Date.now()}.${fileExt}`

      const { error: uploadError } = await adminClient.storage
        .from('attendance-photos')
        .upload(filePath, buffer, {
          contentType: photoFile.type || 'image/jpeg',
          upsert: true,
        })

      if (!uploadError) {
        const { data: publicUrlData } = adminClient.storage
          .from('attendance-photos')
          .getPublicUrl(filePath)
        photoUrl = publicUrlData.publicUrl
      } else {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Gagal menyimpan foto ke server: ${uploadError.message}`)
      }
    } catch (e: any) {
      console.error('Photo upload error:', e)
      throw new Error(e.message || 'Gagal memproses foto absensi.')
    }

    // Save attendance record via adminClient
    const attendancePayload = {
      user_id: user.id,
      date: todayStr,
      check_in_time: new Date().toISOString(),
      check_in_status: status,
      check_in_lat: lat,
      check_in_lng: lng,
      check_in_address: address,
      is_manual: false,
    }

    let attendanceId = ''
    if (existing) {
      const { data: updated, error: updateErr } = await adminClient
        .from('attendances')
        .update(attendancePayload)
        .eq('id', existing.id)
        .select()
        .single()
      if (updateErr) throw updateErr
      attendanceId = updated.id
    } else {
      const { data: inserted, error: insertErr } = await adminClient
        .from('attendances')
        .insert(attendancePayload)
        .select()
        .single()
      if (insertErr) throw insertErr
      attendanceId = inserted.id
    }

    // Save photo record via adminClient
    if (photoUrl) {
      await adminClient.from('attendance_photos').insert({
        attendance_id: attendanceId,
        type: 'check_in',
        photo_url: photoUrl,
        file_name: photoFile.name || 'checkin.jpg',
        file_size: photoFile.size,
      })
    }

    return NextResponse.json({
      success: true,
      message: status === 'on_time' ? 'Absensi masuk berhasil (Tepat Waktu)' : 'Absensi masuk berhasil (Terlambat)',
      status,
      time: new Date().toISOString(),
      address,
      distanceMeters,
      isWithinRadius,
      placeName,
    })
  } catch (error: any) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan saat memproses absensi masuk.' },
      { status: 500 }
    )
  }
}
