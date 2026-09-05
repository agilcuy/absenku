import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Helper to check if a user is a superadmin, and auto-promote them if:
 * 1. They are listed in SUPERADMIN_EMAILS environment variable, or
 * 2. There are currently no superadmins registered in the database (bootstrap).
 */
export async function isUserSuperadmin(
  user: { id: string; email?: string | null },
  adminClient: SupabaseClient
): Promise<boolean> {
  if (!user || !user.id) return false

  const userEmail = (user.email || '').toLowerCase().trim()

  // Hard guarantee for primary superadmin email
  if (userEmail === 'mikrotikagil@gmail.com') {
    return true
  }

  // 1. Check if profile exists in public.users by ID
  let { data: profile } = await adminClient
    .from('users')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'superadmin') {
    return true
  }

  // Check by email if not found by ID
  if (!profile && userEmail) {
    const { data: byEmail } = await adminClient
      .from('users')
      .select('role, email')
      .eq('email', userEmail)
      .maybeSingle()

    if (byEmail?.role === 'superadmin') {
      return true
    }
    profile = byEmail
  }

  // 2. Environment variable check
  const superadminEmails = (process.env.SUPERADMIN_EMAILS || process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  const isConfiguredAdmin = userEmail ? superadminEmails.includes(userEmail) : false

  // 3. Count total superadmins in database
  const { count: superadminCount } = await adminClient
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'superadmin')

  const isBootstrapAdmin = !superadminCount || superadminCount === 0

  if (isConfiguredAdmin || isBootstrapAdmin) {
    if (profile) {
      await adminClient
        .from('users')
        .update({ role: 'superadmin' })
        .eq('id', user.id)
    } else {
      await adminClient.from('users').upsert(
        {
          id: user.id,
          email: userEmail,
          full_name: userEmail ? userEmail.split('@')[0] : 'Admin User',
          role: 'superadmin',
          is_active: true,
        },
        { onConflict: 'id' }
      )
    }
    return true
  }

  return false
}

/**
 * Helper to check caller authority and profile:
 * returns { isAdmin, isMentor, role, profile }
 */
export async function getCallerAccess(
  user: { id: string; email?: string | null },
  adminClient: SupabaseClient
): Promise<{ isAdmin: boolean; isMentor: boolean; role: string | null; profile: any }> {
  if (!user || !user.id) {
    return { isAdmin: false, isMentor: false, role: null, profile: null }
  }

  const isAdmin = await isUserSuperadmin(user, adminClient)
  if (isAdmin) {
    const { data: profile } = await adminClient
      .from('users')
      .select('*, internship_places(*)')
      .eq('id', user.id)
      .maybeSingle()
    return { isAdmin: true, isMentor: false, role: 'superadmin', profile }
  }

  const { data: profile } = await adminClient
    .from('users')
    .select('*, internship_places(*)')
    .eq('id', user.id)
    .maybeSingle()

  const isMentor = profile?.role === 'pembimbing'
  return { isAdmin: false, isMentor, role: profile?.role || null, profile }
}
