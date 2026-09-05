import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { formatAuthPassword } from '@/lib/utils'
import { logAudit } from '@/lib/audit'

// GET current superadmin's own profile and credentials status
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

    const { data: profile, error } = await adminClient
      .from('users')
      .select('id, full_name, email, username, role, is_active, created_at, avatar_url')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Profil admin tidak ditemukan' }, { status: 404 })
    }

    // Check if user has password set in Supabase Auth
    let hasPassword = false
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(user.id)
      if (authUser?.user) {
        // In Supabase, if encrypted_password exists or providers include email
        const providers = authUser.user.app_metadata?.providers || []
        hasPassword = providers.includes('email') || !!(authUser.user as any).encrypted_password
      }
    } catch (authErr) {
      console.warn('Could not check auth password status:', authErr)
    }

    return NextResponse.json({
      profile,
      has_password: hasPassword,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT superadmin updates their own username, full_name, and password
export async function PUT(req: NextRequest) {
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
    const { full_name, username, password } = body

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 })
    }

    const cleanUsername = username ? username.trim().toLowerCase() : null

    // If username provided, check for uniqueness among other users
    if (cleanUsername) {
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', user.id)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json(
          { error: `Username "${cleanUsername}" sudah digunakan oleh pengguna lain. Silakan pilih username lain.` },
          { status: 400 }
        )
      }
    }

    // 1. Update Auth User if password is provided
    if (password && String(password).trim()) {
      const trimmedPass = String(password).trim()
      if (trimmedPass.length < 4) {
        return NextResponse.json(
          { error: 'Password minimal 4 karakter.' },
          { status: 400 }
        )
      }

      const formattedPass = formatAuthPassword(trimmedPass)

      const { error: updateAuthErr } = await adminClient.auth.admin.updateUserById(user.id, {
        password: formattedPass,
        user_metadata: {
          full_name: full_name.trim(),
          username: cleanUsername,
        },
      })

      if (updateAuthErr) {
        console.error('Failed to update auth password:', updateAuthErr)
        return NextResponse.json(
          { error: `Gagal memperbarui password di sistem autentikasi: ${updateAuthErr.message}` },
          { status: 500 }
        )
      }
    }

    // 2. Update public.users record
    const { data: updatedProfile, error: updateProfileErr } = await adminClient
      .from('users')
      .update({
        full_name: full_name.trim(),
        username: cleanUsername,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, full_name, email, username, role, is_active, created_at, avatar_url')
      .single()

    if (updateProfileErr) {
      console.error('Failed to update public.users:', updateProfileErr)
      return NextResponse.json(
        { error: 'Gagal memperbarui profil di database.' },
        { status: 500 }
      )
    }

    // 3. Log audit
    try {
      await logAudit({
        action: 'UPDATE_ADMIN_CREDENTIALS',
        tableName: 'users',
        recordId: user.id,
        newData: {
          full_name: full_name.trim(),
          username: cleanUsername,
          password_changed: !!(password && String(password).trim()),
        },
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'Kredensial login Superadmin berhasil disimpan! Anda sekarang dapat masuk menggunakan username dan password yang baru.',
      profile: updatedProfile,
    })
  } catch (error: any) {
    console.error('PUT /api/admin/profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
