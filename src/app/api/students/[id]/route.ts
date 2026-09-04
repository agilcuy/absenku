import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { formatAuthPassword } from '@/lib/utils'

// GET single student detail with relations and attendance stats
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

    const { data: student, error } = await adminClient
      .from('users')
      .select('*, internship_places(*), mentor:mentor_id(*)')
      .eq('id', id)
      .single()

    if (error || !student) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan.' }, { status: 404 })
    }

    // Get attendance stats for this student
    const { data: attendances } = await adminClient
      .from('attendances')
      .select('check_in_status')
      .eq('user_id', id)

    let hadir = 0, terlambat = 0, izin = 0, sakit = 0, alpha = 0
    ;(attendances || []).forEach((a: any) => {
      if (a.check_in_status === 'on_time') hadir++
      else if (a.check_in_status === 'late') { hadir++; terlambat++ }
      else if (a.check_in_status === 'izin') izin++
      else if (a.check_in_status === 'sakit') sakit++
      else if (a.check_in_status === 'alpha') alpha++
    })

    const totalRecorded = hadir + izin + sakit + alpha
    const presenceRate = totalRecorded > 0 ? Math.round((hadir / totalRecorded) * 100) : 100

    return NextResponse.json({
      student,
      stats: { hadir, terlambat, izin, sakit, alpha, presenceRate },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

    const body = await req.json()
    const {
      full_name,
      username,
      phone,
      class_name,
      major,
      internship_place_id,
      mentor_id,
      start_date,
      end_date,
      internship_status,
      is_active,
    } = body

    const { data: oldData } = await adminClient
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }
    if (full_name !== undefined) updatePayload.full_name = full_name.trim()
    if (username !== undefined) updatePayload.username = username?.trim().toLowerCase() || null
    if (phone !== undefined) updatePayload.phone = phone?.trim() || null
    if (class_name !== undefined) updatePayload.class_name = class_name?.trim() || null
    if (major !== undefined) updatePayload.major = major?.trim() || null
    if (internship_place_id !== undefined) updatePayload.internship_place_id = internship_place_id || null
    if (mentor_id !== undefined) updatePayload.mentor_id = mentor_id || null
    if (start_date !== undefined) updatePayload.start_date = start_date || null
    if (end_date !== undefined) updatePayload.end_date = end_date || null
    if (internship_status !== undefined) updatePayload.internship_status = internship_status
    if (is_active !== undefined) updatePayload.is_active = is_active

    // If a new password is provided, update it in Supabase Auth
    if (body.password && String(body.password).trim()) {
      const newPassword = formatAuthPassword(String(body.password).trim())
      try {
        const { error: passErr } = await adminClient.auth.admin.updateUserById(id, {
          password: newPassword,
        })
        if (passErr) {
          console.warn('Could not update password in auth.users, attempting to create auth user:', passErr.message)
          // If the user doesn't exist in auth.users yet, create them
          if (oldData?.email) {
            await adminClient.auth.admin.createUser({
              email: oldData.email,
              password: newPassword,
              email_confirm: true,
            })
          }
        }
      } catch (authErr: any) {
        console.warn('Error updating student password in auth:', authErr)
      }
    }

    const { data: updated, error } = await adminClient
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select('*, internship_places(name), mentor:mentor_id(full_name)')
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

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch old data for audit
    const { data: oldData } = await adminClient
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    const { error } = await adminClient.from('users').delete().eq('id', id)
    if (error) throw error

    // Also delete from auth.users if exists
    try {
      await adminClient.auth.admin.deleteUser(id)
    } catch {
      // Ignore if not in auth.users
    }

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
