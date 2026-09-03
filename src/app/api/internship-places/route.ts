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

    const { data: places, error } = await adminClient
      .from('internship_places')
      .select('*, users(id)')
      .order('name', { ascending: true })

    if (error) throw error

    const formatted = (places || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      phone: p.phone,
      pic_name: p.pic_name,
      pic_phone: p.pic_phone,
      created_at: p.created_at,
      students_count: p.users?.length || 0,
    }))

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
    const { name, address, phone, pic_name, pic_phone } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nama instansi/perusahaan wajib diisi.' }, { status: 400 })
    }

    const { data: newPlace, error } = await adminClient
      .from('internship_places')
      .insert({
        name: name.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        pic_name: pic_name?.trim() || null,
        pic_phone: pic_phone?.trim() || null,
      })
      .select()
      .single()

    if (error) throw error

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
