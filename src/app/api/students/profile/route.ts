import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getPlaceCoordinates } from '@/lib/geo'

// GET current student's own profile and available options
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // 1. Get student profile with graceful fallback
    let profile: any = null
    try {
      const { data, error } = await adminClient
        .from('users')
        .select('*, internship_places(*), mentor:mentor_id(*, internship_places(*))')
        .eq('id', user.id)
        .single()
      if (!error && data) {
        profile = data
      }
    } catch {
      try {
        const { data } = await adminClient
          .from('users')
          .select('*, internship_places(*), mentor:mentor_id(*)')
          .eq('id', user.id)
          .single()
        profile = data
      } catch {
        // Ignore
      }
    }

    if (!profile) {
      const { data, error } = await adminClient
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 404 })
      }
      profile = data
    }

    // Fallback: If mentor not directly assigned via mentor_id, check mentor assigned to the student's internship place
    if (profile && !profile.mentor && profile.internship_place_id) {
      const { data: placeMentor } = await adminClient
        .from('users')
        .select('id, full_name, email, phone, role, avatar_url, internship_places(*)')
        .eq('internship_place_id', profile.internship_place_id)
        .eq('role', 'pembimbing')
        .maybeSingle()
      if (placeMentor) {
        profile.mentor = placeMentor
      }
    }

    // Enrich profile.internship_places with synchronized coordinates
    if (profile?.internship_places) {
      const resolved = getPlaceCoordinates(profile.internship_places)
      if (resolved) {
        profile.internship_places = {
          ...profile.internship_places,
          latitude: profile.internship_places.latitude ?? resolved.lat,
          longitude: profile.internship_places.longitude ?? resolved.lng,
          radius_meters: profile.internship_places.radius_meters ?? resolved.radiusMeters,
        }
      }
    }

    // 2. Get available internship places for selection
    let places: any[] = []
    try {
      const { data: pData } = await adminClient
        .from('internship_places')
        .select('id, name, address, pic_name')
        .order('name', { ascending: true })

      places = pData || []
    } catch {
      // If internship_places table does not exist yet
      places = []
    }

    return NextResponse.json({
      profile,
      places,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT student self-updates biodata & avatar
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // Get current data
    const { data: currentStudent } = await adminClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!currentStudent) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    const contentType = req.headers.get('content-type') || ''
    let fullName = currentStudent.full_name
    let username = currentStudent.username
    let phone = currentStudent.phone
    let className = currentStudent.class_name
    let major = currentStudent.major
    let internshipPlaceId = currentStudent.internship_place_id
    let avatarUrl = currentStudent.avatar_url

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      if (formData.has('full_name')) fullName = (formData.get('full_name') as string)?.trim()
      if (formData.has('username')) username = (formData.get('username') as string)?.trim().toLowerCase() || null
      if (formData.has('phone')) phone = (formData.get('phone') as string)?.trim() || null
      if (formData.has('class_name')) className = (formData.get('class_name') as string)?.trim() || null
      if (formData.has('major')) major = (formData.get('major') as string)?.trim() || null
      if (formData.has('internship_place_id')) {
        const pId = formData.get('internship_place_id') as string
        if (pId) internshipPlaceId = pId
      }

      // Handle avatar file upload
      const avatarFile = formData.get('avatar') as File | null
      if (avatarFile && avatarFile.size > 0) {
        try {
          const arrayBuffer = await avatarFile.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const fileExt = avatarFile.name ? avatarFile.name.split('.').pop() || 'jpg' : 'jpg'
          const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`

          const { error: uploadError } = await adminClient.storage
            .from('attendance-photos')
            .upload(filePath, buffer, {
              contentType: avatarFile.type || 'image/jpeg',
              upsert: true,
            })

          if (!uploadError) {
            const { data: pubData } = adminClient.storage
              .from('attendance-photos')
              .getPublicUrl(filePath)
            avatarUrl = pubData.publicUrl
          }
        } catch (uploadErr) {
          console.warn('Avatar upload failed:', uploadErr)
        }
      }
    } else {
      const body = await req.json()
      if (body.full_name !== undefined) fullName = body.full_name?.trim()
      if (body.username !== undefined) username = body.username?.trim().toLowerCase() || null
      if (body.phone !== undefined) phone = body.phone?.trim() || null
      if (body.class_name !== undefined) className = body.class_name?.trim() || null
      if (body.major !== undefined) major = body.major?.trim() || null
      if (body.internship_place_id !== undefined && body.internship_place_id) {
        internshipPlaceId = body.internship_place_id
      }
      if (body.avatar_url !== undefined) avatarUrl = body.avatar_url
    }

    if (!fullName) {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 })
    }

    // Check username uniqueness if modified
    if (username && username !== currentStudent.username) {
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username ini sudah digunakan oleh siswa lain.' },
          { status: 400 }
        )
      }
    }

    let updated: any = null
    const { data: fullData, error: updateErr } = await adminClient
      .from('users')
      .update({
        full_name: fullName,
        username,
        phone,
        class_name: className,
        major,
        internship_place_id: internshipPlaceId || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('*, internship_places(*), mentor:mentor_id(*)')
      .maybeSingle()

    if (updateErr) {
      // Fallback: update without relations/new columns if migration not run yet
      const { data: basicData, error: bErr } = await adminClient
        .from('users')
        .update({
          full_name: fullName,
          phone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('*')
        .single()

      if (bErr) throw bErr
      updated = basicData
    } else {
      updated = fullData
    }

    // Send notification to Superadmin if notifications table exists
    try {
      const { data: superadmins } = await adminClient
        .from('users')
        .select('id')
        .eq('role', 'superadmin')

      const notifPayloads = (superadmins || []).map((sa: any) => ({
        user_id: sa.id,
        title: 'Biodata Siswa Diperbarui',
        message: `${updated?.full_name || 'Siswa'} telah melengkapi biodata dirinya.`,
        type: 'info',
        link: '/admin/students',
      }))

      if (notifPayloads.length > 0) {
        await adminClient.from('notifications').insert(notifPayloads)
      }
    } catch {
      // Ignore if notifications table not migrated yet
    }

    try {
      await logAudit({
        action: 'UPDATE_STUDENT_SELF_PROFILE',
        tableName: 'users',
        recordId: user.id,
        oldData: currentStudent,
        newData: updated,
      })
    } catch {
      // Ignore audit log error
    }

    return NextResponse.json({
      success: true,
      message: 'Biodata Anda berhasil diperbarui!',
      profile: updated,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
