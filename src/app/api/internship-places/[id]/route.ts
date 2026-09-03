import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET detail of an internship place including assigned students
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const { data: place, error } = await adminClient
      .from('internship_places')
      .select('*, users(id, full_name, email, phone, class_name, major, avatar_url, is_online, last_seen)')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json({ place })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT update an internship place
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const { data: oldData } = await adminClient
      .from('internship_places')
      .select('*')
      .eq('id', id)
      .single()

    const { data: updated, error } = await adminClient
      .from('internship_places')
      .update({
        name: name !== undefined ? name.trim() : oldData?.name,
        address: address !== undefined ? address?.trim() || null : oldData?.address,
        phone: phone !== undefined ? phone?.trim() || null : oldData?.phone,
        pic_name: pic_name !== undefined ? pic_name?.trim() || null : oldData?.pic_name,
        pic_phone: pic_phone !== undefined ? pic_phone?.trim() || null : oldData?.pic_phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      action: 'UPDATE_PLACE',
      tableName: 'internship_places',
      recordId: id,
      oldData,
      newData: updated,
    })

    return NextResponse.json({
      success: true,
      message: 'Tempat PKL berhasil diperbarui.',
      place: updated,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE an internship place
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Hanya Superadmin' }, { status: 403 })
    }

    const { data: oldData } = await adminClient
      .from('internship_places')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    // Unassign any students from this place
    await adminClient
      .from('users')
      .update({ internship_place_id: null })
      .eq('internship_place_id', id)

    const { error } = await adminClient
      .from('internship_places')
      .delete()
      .eq('id', id)

    if (error) throw error

    await logAudit({
      action: 'DELETE_PLACE',
      tableName: 'internship_places',
      recordId: id,
      oldData,
    })

    return NextResponse.json({
      success: true,
      message: 'Tempat PKL berhasil dihapus.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
