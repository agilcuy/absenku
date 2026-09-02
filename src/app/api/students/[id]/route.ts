import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { full_name, phone, is_active } = body

    const { data: oldData } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    const { data: updated, error } = await supabase
      .from('users')
      .update({
        full_name: full_name !== undefined ? full_name : oldData.full_name,
        phone: phone !== undefined ? phone : oldData.phone,
        is_active: is_active !== undefined ? is_active : oldData.is_active,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      action: 'UPDATE_STUDENT',
      tableName: 'users',
      recordId: id,
      oldData,
      newData: updated,
    })

    return NextResponse.json({ success: true, student: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch old data for audit
    const { data: oldData } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw error

    await logAudit({
      action: 'DELETE_STUDENT',
      tableName: 'users',
      recordId: id,
      oldData,
    })

    return NextResponse.json({ success: true, message: 'Peserta didik berhasil dihapus.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
