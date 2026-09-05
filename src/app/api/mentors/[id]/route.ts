import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { formatAuthPassword } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

// PUT update mentor by ID (including internship place assignment, credentials, profile)
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
    const {
      full_name,
      username,
      email,
      phone,
      internship_place_id,
      is_active,
      password,
      role,
    } = body

    // Fetch old mentor data
    const { data: oldMentor, error: fetchErr } = await adminClient
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !oldMentor) {
      return NextResponse.json({ error: 'Pembimbing tidak ditemukan' }, { status: 404 })
    }

    const cleanUsername = username !== undefined ? (username?.trim().toLowerCase() || null) : oldMentor.username
    const cleanEmail = email !== undefined ? (email?.trim().toLowerCase() || null) : oldMentor.email

    // Check username uniqueness if changed
    if (cleanUsername && cleanUsername !== oldMentor.username) {
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', id)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json(
          { error: `Username "${cleanUsername}" sudah digunakan oleh pengguna lain.` },
          { status: 400 }
        )
      }
    }

    // Check email uniqueness if changed
    if (cleanEmail && cleanEmail !== oldMentor.email) {
      const { data: existingEmail } = await adminClient
        .from('users')
        .select('id')
        .eq('email', cleanEmail)
        .neq('id', id)
        .maybeSingle()

      if (existingEmail) {
        return NextResponse.json(
          { error: `Email "${cleanEmail}" sudah digunakan oleh pengguna lain.` },
          { status: 400 }
        )
      }
    }

    // Update password in Supabase Auth if provided
    if (password && String(password).trim()) {
      const authPassword = formatAuthPassword(String(password).trim())
      try {
        const { error: passErr } = await adminClient.auth.admin.updateUserById(id, {
          password: authPassword,
          email: cleanEmail || oldMentor.email,
          user_metadata: {
            full_name: full_name ? full_name.trim() : oldMentor.full_name,
            username: cleanUsername,
          },
        })
        if (passErr) {
          console.warn('Could not update password in auth.users:', passErr.message)
        }
      } catch (authErr) {
        console.warn('Auth password update error:', authErr)
      }
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined) updatePayload.full_name = full_name.trim()
    if (cleanUsername !== undefined) updatePayload.username = cleanUsername
    if (cleanEmail !== undefined) updatePayload.email = cleanEmail
    if (phone !== undefined) updatePayload.phone = phone?.trim() || null
    if (internship_place_id !== undefined) {
      updatePayload.internship_place_id = internship_place_id ? internship_place_id : null
    }
    if (is_active !== undefined) updatePayload.is_active = is_active
    if (role !== undefined) updatePayload.role = role

    const { data: updated, error: updateErr } = await adminClient
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select('*, internship_places(id, name, address)')
      .single()

    if (updateErr) {
      console.error('Failed to update mentor:', updateErr)
      throw updateErr
    }

    await logAudit({
      action: 'UPDATE_MENTOR',
      tableName: 'users',
      recordId: id,
      oldData: oldMentor,
      newData: updated,
    })

    return NextResponse.json({
      success: true,
      message: 'Data pembimbing dan penempatan instansi berhasil diperbarui.',
      mentor: updated,
    })
  } catch (error: any) {
    console.error('PUT /api/mentors/[id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE mentor
export async function DELETE(
  _req: NextRequest,
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

    if (user.id === id) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun Anda sendiri.' }, { status: 400 })
    }

    const { data: oldMentor } = await adminClient
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    // Unassign students from this mentor first
    await adminClient
      .from('users')
      .update({ mentor_id: null })
      .eq('mentor_id', id)

    // Delete from public.users
    const { error: delErr } = await adminClient
      .from('users')
      .delete()
      .eq('id', id)

    if (delErr) throw delErr

    // Delete from auth.users
    try {
      await adminClient.auth.admin.deleteUser(id)
    } catch (e) {
      console.warn('Could not delete auth user:', e)
    }

    await logAudit({
      action: 'DELETE_MENTOR',
      tableName: 'users',
      recordId: id,
      oldData: oldMentor,
    })

    return NextResponse.json({
      success: true,
      message: 'Pembimbing berhasil dihapus.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
