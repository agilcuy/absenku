import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// PUT review permit (approve or reject)
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
    const { data: profile } = await adminClient
      .from('users')
      .select('id, role, full_name, internship_place_id')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = await isUserSuperadmin(user, adminClient)
    const isMentor = profile?.role === 'pembimbing'

    if (!isSuperAdmin && !isMentor) {
      return NextResponse.json(
        { error: 'Forbidden: Hanya Superadmin atau Pembimbing yang dapat meninjau pengajuan.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { status, rejection_reason } = body

    if (!['disetujui', 'ditolak'].includes(status)) {
      return NextResponse.json(
        { error: 'Status harus disetujui atau ditolak.' },
        { status: 400 }
      )
    }

    if (status === 'ditolak' && !rejection_reason?.trim()) {
      return NextResponse.json(
        { error: 'Harap sertakan alasan penolakan pengajuan.' },
        { status: 400 }
      )
    }

    // Get the permit details
    const { data: permit, error: pErr } = await adminClient
      .from('permits')
      .select('*, users!permits_user_id_fkey(id, full_name, mentor_id, internship_place_id)')
      .eq('id', id)
      .single()

    if (pErr || !permit) {
      return NextResponse.json({ error: 'Data pengajuan tidak ditemukan.' }, { status: 404 })
    }

    // If caller is mentor, verify that this student is assigned to them or in the same internship place
    if (isMentor && !isSuperAdmin) {
      const studentPlace = permit.users?.internship_place_id
      const mentorPlace = profile?.internship_place_id
      const isSamePlace = mentorPlace && studentPlace && mentorPlace === studentPlace
      const isAssigned = permit.users?.mentor_id === user.id

      if (!isSamePlace && !isAssigned) {
        return NextResponse.json(
          { error: 'Forbidden: Siswa ini berada di tempat PKL yang berbeda atau bukan bimbingan Anda.' },
          { status: 403 }
        )
      }
    }

    // Update permit
    const { data: updatedPermit, error: uErr } = await adminClient
      .from('permits')
      .update({
        status,
        rejection_reason: status === 'ditolak' ? rejection_reason.trim() : null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (uErr) throw uErr

    // INTEGRASI DENGAN ABSENSI JIKA DISETUJUI:
    // Otomatis catat status kehadiran sebagai 'izin' atau 'sakit' untuk seluruh tanggal pada rentang
    if (status === 'disetujui') {
      const start = new Date(permit.start_date)
      const end = new Date(permit.end_date)
      const cur = new Date(start)

      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0]
        const attendancePayload = {
          user_id: permit.user_id,
          date: dateStr,
          check_in_status: permit.type, // 'izin' | 'sakit'
          is_manual: true,
          note: `Pengajuan ${permit.type.toUpperCase()} disetujui (${permit.reason})`,
          permit_id: permit.id,
          updated_at: new Date().toISOString(),
        }

        // Upsert into attendances table
        await adminClient.from('attendances').upsert(attendancePayload, {
          onConflict: 'user_id,date',
        })

        cur.setDate(cur.getDate() + 1)
      }
    }

    // Send notification to the student
    const notifTitle =
      status === 'disetujui'
        ? `Pengajuan ${permit.type === 'sakit' ? 'Sakit' : 'Izin'} Disetujui ✅`
        : `Pengajuan ${permit.type === 'sakit' ? 'Sakit' : 'Izin'} Ditolak ❌`

    const notifMessage =
      status === 'disetujui'
        ? `Pengajuan ${permit.type} Anda untuk tanggal ${permit.start_date} s/d ${permit.end_date} telah disetujui oleh ${profile?.full_name || 'Pembimbing'}.`
        : `Pengajuan ${permit.type} Anda ditolak. Alasan: ${rejection_reason}`

    await adminClient.from('notifications').insert({
      user_id: permit.user_id,
      title: notifTitle,
      message: notifMessage,
      type: 'permit',
      link: '/dashboard/permits',
    })

    await logAudit({
      action: status === 'disetujui' ? 'APPROVE_PERMIT' : 'REJECT_PERMIT',
      tableName: 'permits',
      recordId: id,
      oldData: permit,
      newData: updatedPermit,
    })

    return NextResponse.json({
      success: true,
      message: `Pengajuan ${permit.type} berhasil di-${status}.`,
      permit: updatedPermit,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
