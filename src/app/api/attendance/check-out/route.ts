import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTodayJakarta, isCheckOutAllowed, formatTime } from '@/lib/utils'
import { getAddressFromCoords } from '@/lib/geo'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const todayStr = getTodayJakarta()

    // 1. Get settings
    const { data: settings } = await supabase
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
          error: `Absensi pulang belum tersedia. Absensi pulang dapat dilakukan mulai pukul ${displayTime} WIB.`,
        },
        { status: 400 }
      )
    }

    // 3. Check existing attendance record for today
    const { data: attendance } = await supabase
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

    if (!photoFile) {
      return NextResponse.json({ error: 'Foto absensi pulang wajib disertakan.' }, { status: 400 })
    }

    const lat = latStr ? parseFloat(latStr) : null
    const lng = lngStr ? parseFloat(lngStr) : null

    let address = 'Lokasi tidak diketahui'
    if (lat !== null && lng !== null) {
      address = await getAddressFromCoords(lat, lng)
    }

    // Upload photo
    let photoUrl = ''
    try {
      const arrayBuffer = await photoFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const fileExt = photoFile.name ? photoFile.name.split('.').pop() || 'jpg' : 'jpg'
      const filePath = `${user.id}/${todayStr}-checkout-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(filePath, buffer, {
          contentType: photoFile.type || 'image/jpeg',
          upsert: true,
        })

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('attendance-photos')
          .getPublicUrl(filePath)
        photoUrl = publicUrlData.publicUrl
      } else {
        photoUrl = `data:${photoFile.type || 'image/jpeg'};base64,${buffer.toString('base64')}`
      }
    } catch (e) {
      console.warn('Storage upload error, using fallback:', e)
    }

    // Update attendance record with check-out
    const { error: updateErr } = await supabase
      .from('attendances')
      .update({
        check_out_time: new Date().toISOString(),
        check_out_lat: lat,
        check_out_lng: lng,
        check_out_address: address,
      })
      .eq('id', attendance.id)

    if (updateErr) throw updateErr

    // Save photo record
    if (photoUrl) {
      await supabase.from('attendance_photos').insert({
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
