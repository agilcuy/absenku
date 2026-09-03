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

  // 1. Check if profile exists in public.users
  const { data: profile } = await adminClient
    .from('users')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'superadmin') {
    return true
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
