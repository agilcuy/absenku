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
    const { check_in_time, check_out_time, check_in_status, note } = body

    const { data: oldData } = await supabase
      .from('attendances')
      .select('*')
      .eq('id', id)
      .single()

    const updatePayload: any = {}
    if (check_in_time !== undefined) updatePayload.check_in_time = check_in_time
    if (check_out_time !== undefined) updatePayload.check_out_time = check_out_time
    if (check_in_status !== undefined) updatePayload.check_in_status = check_in_status
    if (note !== undefined) updatePayload.note = note

    const { data: updated, error } = await supabase
      .from('attendances')
      .update(updatePayload)
      .eq('id', id)
      .select('*, users(full_name, email)')
      .single()

    if (error) throw error

    await logAudit({
      action: 'UPDATE_ATTENDANCE',
      tableName: 'attendances',
      recordId: id,
      oldData,
      newData: updated,
    })

    return NextResponse.json({
      success: true,
      message: 'Data absensi berhasil diperbarui.',
      attendance: updated,
    })
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

    const { data: oldData } = await supabase
      .from('attendances')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('attendances').delete().eq('id', id)
    if (error) throw error

    await logAudit({
      action: 'DELETE_ATTENDANCE',
      tableName: 'attendances',
      recordId: id,
      oldData,
    })

    return NextResponse.json({
      success: true,
      message: 'Data absensi berhasil dihapus.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
