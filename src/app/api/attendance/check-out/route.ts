import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTodayJakarta, isCheckOutAllowed, formatTime } from '@/lib/utils'
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

    // 0. Check student profile completeness (mandatory for role === 'student')
    const { data: userProfile } = await adminClient
      .from('users')
      .select('id, role, class_name, major, phone, internship_place_id')
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

    const checkOutConfig = settings?.check_out_time || '16:30:00'

    // 2. Validate current time against check out schedule
    if (!isCheckOutAllowed(checkOutConfig)) {
      const displayTime = checkOutConfig.substring(0, 5)
      return NextResponse.json(
        {
          error: `Absensi pulang belum tersedia. Absensi pulang dapat dilakukan mulai pukul ${displayTime} s.d 24:00 (12 malam) WIB.`,
        },
        { status: 400 }
      )
    }

    // 3. Check existing attendance record for today
    const { data: attendance } = await adminClient
      .from('attendances')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle()

    if (!attendance || !attendance.check_in_time) {
      return NextResponse.json(
        { error: 'Anda belum melakukan absensi masuk hari ini. Tidak dapat melakukan absensi pulang.' },
        { status: 400 }
      )
    }

    if (attendance.check_out_time) {
      return NextResponse.json(
        { error: 'Anda sudah melakukan absensi pulang hari ini.' },
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
          error: 'Foto bukti kehadiran pulang wajib dilampirkan! Absensi tidak akan dicatat oleh sistem tanpa lampiran foto.',
        },
        { status: 400 }
      )
    }

    const lat = latStr ? parseFloat(latStr) : null
    const lng = lngStr ? parseFloat(lngStr) : null

    let address = 'Lokasi tidak diketahui'
    if (lat !== null && lng !== null) {
      address = await getAddressFromCoords(lat, lng)
    }

    // Upload photo via adminClient
    let photoUrl = ''
    try {
      const arrayBuffer = await photoFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const fileExt = photoFile.name ? photoFile.name.split('.').pop() || 'jpg' : 'jpg'
      const filePath = `${user.id}/${todayStr}-checkout-${Date.now()}.${fileExt}`

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

    // Update attendance record with check-out via adminClient
    const { error: updateErr } = await adminClient
      .from('attendances')
      .update({
        check_out_time: new Date().toISOString(),
        check_out_lat: lat,
        check_out_lng: lng,
        check_out_address: address,
      })
      .eq('id', attendance.id)

    if (updateErr) throw updateErr

    // Save photo record via adminClient
    if (photoUrl) {
      await adminClient.from('attendance_photos').insert({
        attendance_id: attendance.id,
        type: 'check_out',
        photo_url: photoUrl,
        file_name: photoFile.name || 'checkout.jpg',
        file_size: photoFile.size,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Absensi pulang berhasil dicatat.',
      time: new Date().toISOString(),
      address,
    })
  } catch (error: any) {
    console.error('Check-out error:', error)
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan saat memproses absensi pulang.' },
      { status: 500 }
    )
  }
}
