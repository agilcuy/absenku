import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { formatAuthPassword } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

// GET all administrators (role: superadmin)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Hanya Superadmin' }, { status: 403 })
    }

    const { data: admins, error } = await adminClient
      .from('users')
      .select('id, full_name, email, username, role, is_active, created_at, avatar_url')
      .eq('role', 'superadmin')
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      administrators: admins || [],
      current_user_id: user.id,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST create new administrator account
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
    const { full_name, username, email, password } = body

    if (!full_name?.trim() || !username?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: 'Nama lengkap, username, dan password wajib diisi.' },
        { status: 400 }
      )
    }

    const cleanUsername = username.trim().toLowerCase()
    const cleanEmail = email?.trim()
      ? email.trim().toLowerCase()
      : `${cleanUsername}@kominfo.local`

    // Check if username already exists
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: `Username "${cleanUsername}" sudah digunakan. Silakan gunakan username lain.` },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existingEmail } = await adminClient
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existingEmail) {
      return NextResponse.json(
        { error: `Email "${cleanEmail}" sudah terdaftar di sistem.` },
        { status: 400 }
      )
    }

    // 1. Create user in Supabase Auth
    const authPassword = formatAuthPassword(password.trim())
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: authPassword,
      user_metadata: {
        full_name: full_name.trim(),
        username: cleanUsername,
      },
      email_confirm: true,
    })

    if (authErr || !authUser?.user) {
      console.error('Failed to create admin in auth.users:', authErr)
      return NextResponse.json(
        { error: `Gagal membuat autentikasi: ${authErr?.message || 'Error'}` },
        { status: 500 }
      )
    }

    const newAdminId = authUser.user.id

    // 2. Insert into public.users with role 'superadmin'
    const { data: newAdmin, error: insertErr } = await adminClient
      .from('users')
      .insert({
        id: newAdminId,
        email: cleanEmail,
        username: cleanUsername,
        full_name: full_name.trim(),
        role: 'superadmin',
        is_active: true,
      })
      .select('id, full_name, email, username, role, is_active, created_at')
      .single()

    if (insertErr) {
      console.error('Failed to insert admin into public.users:', insertErr)
      return NextResponse.json(
        { error: 'Gagal menyimpan data admin ke database.' },
        { status: 500 }
      )
    }

    // 3. Log audit
    try {
      await logAudit({
        action: 'CREATE_ADMINISTRATOR',
        tableName: 'users',
        recordId: newAdminId,
        newData: newAdmin,
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Akun Administrator "${full_name}" berhasil dibuat! Akun dapat langsung digunakan untuk login dengan username "${cleanUsername}".`,
      administrator: newAdmin,
    })
  } catch (error: any) {
    console.error('POST /api/admin/administrators error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
