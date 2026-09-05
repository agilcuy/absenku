import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { formatAuthPassword } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

// POST create unified user (student, pembimbing, superadmin)
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
    const {
      role = 'student', // 'student' | 'pembimbing' | 'superadmin'
      full_name,
      username,
      email,
      password = '123',
      phone,
      // Student specific
      class_name,
      major,
      internship_place_id,
      mentor_id,
      start_date,
      end_date,
      internship_status = 'aktif',
    } = body

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Nama Lengkap wajib diisi.' }, { status: 400 })
    }

    const cleanUsername = username?.trim().toLowerCase() || null
    const normalizedEmail = email?.trim()
      ? email.trim().toLowerCase()
      : (cleanUsername ? `${cleanUsername}@${role === 'student' ? 'absenku.local' : 'kominfo.local'}` : null)

    if (!cleanUsername && !normalizedEmail) {
      return NextResponse.json({ error: 'Username atau Email wajib diisi.' }, { status: 400 })
    }

    // Check existing email in users
    if (normalizedEmail) {
      const { data: existingEmail } = await adminClient
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (existingEmail) {
        return NextResponse.json({ error: `Email "${normalizedEmail}" sudah terdaftar di sistem.` }, { status: 400 })
      }
    }

    // Check existing username in users
    if (cleanUsername) {
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json({ error: `Username "${cleanUsername}" sudah digunakan akun lain.` }, { status: 400 })
      }
    }

    // Set auth password
    const authPassword = formatAuthPassword(String(password).trim() || '123')

    let userId = ''
    try {
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail!,
        password: authPassword,
        user_metadata: {
          full_name: full_name.trim(),
          username: cleanUsername,
          phone: phone?.trim() || null,
          role,
        },
        email_confirm: true,
      })
      if (authUser?.user) {
        userId = authUser.user.id
      } else if (authError) {
        console.warn('Auth admin createUser notice:', authError.message)
      }
    } catch (e) {
      console.warn('Could not create auth user, using UUID:', e)
    }

    if (!userId) userId = crypto.randomUUID()

    const insertPayload: any = {
      id: userId,
      email: normalizedEmail,
      username: cleanUsername,
      full_name: full_name.trim(),
      phone: phone?.trim() || null,
      role: role,
      is_active: true,
    }

    if (role === 'student') {
      insertPayload.class_name = class_name?.trim() || null
      insertPayload.major = major?.trim() || null
      insertPayload.internship_place_id = internship_place_id ? internship_place_id : null
      insertPayload.mentor_id = mentor_id ? mentor_id : null
      insertPayload.start_date = start_date || null
      insertPayload.end_date = end_date || null
      insertPayload.internship_status = internship_status || 'aktif'
    } else if (role === 'pembimbing') {
      insertPayload.internship_place_id = internship_place_id ? internship_place_id : null
    }

    const { data: newUser, error: insertError } = await adminClient
      .from('users')
      .upsert(insertPayload, { onConflict: 'email' })
      .select('*, internship_places(id, name, address)')
      .single()

    if (insertError) {
      console.error('Insert error into public.users:', insertError)
      throw insertError
    }

    await logAudit({
      action: `CREATE_USER_${role.toUpperCase()}`,
      tableName: 'users',
      recordId: newUser.id,
      newData: newUser,
    })

    const roleName = role === 'student' ? 'Siswa' : role === 'pembimbing' ? 'Pembimbing' : 'Superadmin'

    return NextResponse.json({
      success: true,
      message: `Akun ${roleName} "${full_name}" berhasil dibuat! Pengguna dapat langsung login dengan username "${cleanUsername || normalizedEmail}".`,
      user: newUser,
    })
  } catch (error: any) {
    console.error('POST /api/admin/users error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
