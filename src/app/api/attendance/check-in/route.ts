import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTodayJakarta, getNowJakarta, getAttendanceStatus, isWorkingDay } from '@/lib/utils'
import { getAddressFromCoords } from '@/lib/geo'

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

    // 1. Get settings
    const { data: settings } = await adminClient
      .from('settings')
      .select('*')
      .limit(1)
      .single()

    const checkInConfig = settings?.check_in_time || '07:30:00'
    const workingDays = settings?.working_days || [1, 2, 3, 4, 5]

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

    if (!photoFile) {
      return NextResponse.json({ error: 'Foto absensi wajib disertakan.' }, { status: 400 })
    }

    const lat = latStr ? parseFloat(latStr) : null
    const lng = lngStr ? parseFloat(lngStr) : null

    let address = 'Lokasi tidak diketahui'
    if (lat !== null && lng !== null) {
      address = await getAddressFromCoords(lat, lng)
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
    })
  } catch (error: any) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan saat memproses absensi masuk.' },
      { status: 500 }
    )
  }
}
