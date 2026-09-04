import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * API route untuk callback native APK.
 * Sama seperti /api/auth/callback tapi tidak membaca `code` dari URL
 * (sudah diproses di client-side oleh halaman /auth/callback).
 * Fungsinya hanya mengecek sesi aktif dan redirect sesuai role.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const userEmail = user.email.toLowerCase()
  const adminClient = createAdminClient()

  // Primary Superadmin Hard Guarantee
  if (userEmail === 'mikrotikagil@gmail.com') {
    await adminClient.from('users').upsert(
      {
        id: user.id,
        email: userEmail,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Mikrotik',
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'superadmin',
        is_active: true,
      },
      { onConflict: 'email' }
    )
    return NextResponse.redirect(`${origin}/admin`)
  }

  // Cek user di database
  let { data: profile } = await adminClient
    .from('users')
    .select('id, role, is_active, class_name, major, phone, internship_place_id')
    .eq('id', user.id)
    .maybeSingle()

  // Jika tidak ditemukan by ID, cari by email
  if (!profile) {
    const { data: byEmail } = await adminClient
      .from('users')
      .select('id, role, is_active, class_name, major, phone, internship_place_id')
      .eq('email', userEmail)
      .maybeSingle()

    if (byEmail) {
      await adminClient
        .from('users')
        .update({
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .eq('email', userEmail)

      profile = byEmail
    }
  }

  if (!profile) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=not_registered`)
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=inactive`)
  }

  // Redirect sesuai role
  if (profile.role === 'superadmin') {
    return NextResponse.redirect(`${origin}/admin`)
  } else if (profile.role === 'pembimbing') {
    return NextResponse.redirect(`${origin}/pembimbing`)
  } else {
    if (!profile.class_name || !profile.major || !profile.phone || !profile.internship_place_id) {
      return NextResponse.redirect(`${origin}/onboarding`)
    }
    return NextResponse.redirect(`${origin}/dashboard`)
  }
}
