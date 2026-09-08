import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { parseWibToUtcIso } from '@/lib/utils'

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: oldData, error: findErr } = await adminClient
      .from('attendances')
      .select('*')
      .eq('id', id)
      .single()

    if (findErr || !oldData) {
      return NextResponse.json({ error: 'Data absensi tidak ditemukan.' }, { status: 404 })
    }

    const body = await req.json()
    const {
      date,
      user_id,
      check_in_time,
      check_out_time,
      check_in_status,
      check_in_address,
      check_out_address,
      note,
    } = body

    const targetDate = date || oldData.date
    const updatePayload: any = {
      is_manual: true,
      updated_at: new Date().toISOString(),
    }

    if (date !== undefined) updatePayload.date = date
    if (user_id !== undefined) updatePayload.user_id = user_id
    if (check_in_status !== undefined) updatePayload.check_in_status = check_in_status
    if (check_in_address !== undefined) updatePayload.check_in_address = check_in_address
    if (check_out_address !== undefined) updatePayload.check_out_address = check_out_address
    if (note !== undefined) updatePayload.note = note

    if (check_in_time !== undefined) {
      if (!check_in_time || !check_in_time.trim()) {
        updatePayload.check_in_time = null
      } else {
        updatePayload.check_in_time = parseWibToUtcIso(targetDate, check_in_time)
      }
    }

    if (check_out_time !== undefined) {
      if (!check_out_time || !check_out_time.trim()) {
        updatePayload.check_out_time = null
      } else {
        updatePayload.check_out_time = parseWibToUtcIso(targetDate, check_out_time)
      }
    }

    const { data: updated, error } = await adminClient
      .from('attendances')
      .update(updatePayload)
      .eq('id', id)
      .select('*, users(full_name, email, avatar_url, class_name)')
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

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: oldData } = await adminClient
      .from('attendances')
      .select('*')
      .eq('id', id)
      .single()

    if (!oldData) {
      return NextResponse.json({ error: 'Data absensi tidak ditemukan.' }, { status: 404 })
    }

    // 1. Delete associated attendance photos to prevent Foreign Key constraint issues
    await adminClient.from('attendance_photos').delete().eq('attendance_id', id)

    // 2. Delete attendance record
    const { error } = await adminClient.from('attendances').delete().eq('id', id)
    if (error) throw error

    await logAudit({
      action: 'DELETE_ATTENDANCE',
      tableName: 'attendances',
      recordId: id,
      oldData,
    })

    return NextResponse.json({
      success: true,
      message: 'Data absensi berhasil dihapus secara permanen.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

