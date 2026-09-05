import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCallerAccess } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// PUT update / adjust overtime record (Strictly allowed for Superadmin & Pembimbing)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { isAdmin, isMentor, role, profile } = await getCallerAccess(user, adminClient)

    // Strict role check: Students are strictly forbidden from editing overtime
    if (!isAdmin && !isMentor) {
      return NextResponse.json(
        { error: 'Forbidden: Hanya Pembimbing atau Superadmin yang memiliki wewenang untuk mengedit atau menyesuaikan data lembur.' },
        { status: 403 }
      )
    }

    // Fetch existing attendance record
    const { data: targetAttendance, error: fetchErr } = await adminClient
      .from('attendances')
      .select('*, users!attendances_user_id_fkey(id, full_name, mentor_id, internship_place_id)')
      .eq('id', id)
      .single()

    if (fetchErr || !targetAttendance) {
      return NextResponse.json({ error: 'Data absensi/lembur tidak ditemukan.' }, { status: 404 })
    }

    // If caller is mentor, verify that this student is assigned to them or in the same internship place
    if (isMentor && !isAdmin) {
      const studentPlace = targetAttendance.users?.internship_place_id
      const mentorPlace = profile?.internship_place_id
      const isSamePlace = mentorPlace && studentPlace && mentorPlace === studentPlace
      const isAssigned = targetAttendance.users?.mentor_id === user.id

      if (!isSamePlace && !isAssigned) {
        return NextResponse.json(
          { error: 'Forbidden: Siswa ini berada di tempat PKL yang berbeda atau bukan bimbingan Anda.' },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const { overtime_minutes, overtime_notes, is_overtime } = body

    const minutesNum = overtime_minutes !== undefined ? Math.max(0, parseInt(overtime_minutes) || 0) : targetAttendance.overtime_minutes || 0
    const finalIsOvertime = is_overtime !== undefined ? Boolean(is_overtime) : minutesNum > 0

    const updatePayload: any = {
      overtime_minutes: minutesNum,
      is_overtime: finalIsOvertime,
      overtime_notes: overtime_notes !== undefined ? (overtime_notes ? overtime_notes.trim() : null) : targetAttendance.overtime_notes,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateErr } = await adminClient
      .from('attendances')
      .update(updatePayload)
      .eq('id', id)
      .select('*, users!attendances_user_id_fkey(id, full_name)')
      .single()

    if (updateErr) {
      if (updateErr.code === '42703' || updateErr.message?.includes('column')) {
        return NextResponse.json(
          { error: 'Kolom lembur belum ada di database. Silakan jalankan migration_v5.sql.', needsMigration: true },
          { status: 400 }
        )
      }
      throw updateErr
    }

    await logAudit({
      action: 'UPDATE_OVERTIME',
      tableName: 'attendances',
      recordId: id,
      oldData: targetAttendance,
      newData: updated,
    })

    return NextResponse.json({
      success: true,
      message: 'Data lembur berhasil diperbarui oleh pembimbing/admin.',
      attendance: updated,
    })
  } catch (err: any) {
    console.error('Error updating overtime record:', err)
    return NextResponse.json({ error: err.message || 'Gagal memperbarui data lembur' }, { status: 500 })
  }
}
