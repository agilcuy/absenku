import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET all internship places with student count
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    let { data: places, error } = await adminClient
      .from('internship_places')
      .select('*, users(id, full_name, email, role, phone)')
      .order('name', { ascending: true })

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json({
          places: [],
          needsMigration: true,
          message: 'Tabel "internship_places" belum ada di Supabase. Silakan jalankan file migration_v2.sql di Supabase SQL Editor.',
        })
      }
      throw error
    }

    // Ensure "Kominfo Tanggamus (egov)" is present
    const hasEgov = (places || []).some((p: any) =>
      p.name?.toLowerCase().includes('kominfo') && p.name?.toLowerCase().includes('egov')
    )

    if (!hasEgov) {
      try {
        const { data: newSeed } = await adminClient
          .from('internship_places')
          .insert({
            name: 'Kominfo Tanggamus (egov)',
            address: 'Komplek Perkantoran Pemkab Tanggamus, Jl. Jend. Sudirman',
            phone: '0722-21001',
            pic_name: 'Bidang E-Government',
            pic_phone: '081273928192',
          })
          .select('*, users(id, full_name, email, role, phone)')
          .single()

        if (newSeed) {
          places = [newSeed, ...(places || [])]
        }
      } catch (seedErr) {
        console.warn('Could not auto-seed Kominfo Tanggamus (egov):', seedErr)
      }
    }

    const formatted = (places || []).map((p: any) => {
      const allUsers = p.users || []
      const assignedMentors = allUsers.filter((u: any) => u.role === 'pembimbing' || u.role === 'superadmin')
      const students = allUsers.filter((u: any) => u.role === 'student')

      return {
        id: p.id,
        name: p.name,
        address: p.address,
        phone: p.phone,
        pic_name: p.pic_name,
        pic_phone: p.pic_phone,
        latitude: p.latitude,
        longitude: p.longitude,
        radius_meters: p.radius_meters,
        created_at: p.created_at,
        students_count: students.length,
        mentors: assignedMentors,
        primary_mentor: assignedMentors[0] || null,
        mentor_id: assignedMentors[0]?.id || null,
      }
    })

    return NextResponse.json({ places: formatted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST create new internship place
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Hanya Superadmin' }, { status: 403 })
    }

    const body = await req.json()
    const { name, address, phone, pic_name, pic_phone, latitude, longitude, radius_meters, mentor_id } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nama instansi/perusahaan wajib diisi.' }, { status: 400 })
    }

    const insertPayload: any = {
      name: name.trim(),
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      pic_name: pic_name?.trim() || null,
      pic_phone: pic_phone?.trim() || null,
    }
    if (latitude !== undefined && latitude !== null && latitude !== '') insertPayload.latitude = parseFloat(latitude)
    if (longitude !== undefined && longitude !== null && longitude !== '') insertPayload.longitude = parseFloat(longitude)
    if (radius_meters !== undefined && radius_meters !== null && radius_meters !== '') insertPayload.radius_meters = parseInt(radius_meters)

    let { data: newPlace, error } = await adminClient
      .from('internship_places')
      .insert(insertPayload)
      .select()
      .single()

    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema'))) {
      delete insertPayload.latitude
      delete insertPayload.longitude
      delete insertPayload.radius_meters
      const retry = await adminClient
        .from('internship_places')
        .insert(insertPayload)
        .select()
        .single()
      if (retry.error) throw retry.error
      newPlace = retry.data
    } else if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json(
          {
            error:
              'Tabel "internship_places" belum ada di Supabase. Silakan buka Supabase SQL Editor dan jalankan file migration_v2.sql terlebih dahulu.',
            needsMigration: true,
          },
          { status: 400 }
        )
      }
      throw error
    }

    // If mentor_id is selected, assign mentor to this place
    if (mentor_id) {
      await adminClient
        .from('users')
        .update({ internship_place_id: newPlace.id })
        .eq('id', mentor_id)
    }

    await logAudit({
      action: 'CREATE_PLACE',
      tableName: 'internship_places',
      recordId: newPlace.id,
      newData: newPlace,
    })

    return NextResponse.json({
      success: true,
      message: 'Tempat PKL berhasil ditambahkan.',
      place: newPlace,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
