import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user && user.email) {
        const userEmail = user.email.toLowerCase()
        const adminClient = await createAdminClient()

        // 1. Check if users table is empty (Bootstrap first user as Superadmin)
        const { count } = await adminClient
          .from('users')
          .select('*', { count: 'exact', head: true })

        if (count === 0) {
          // First user bootstrap as SUPERADMIN!
          await adminClient.from('users').insert({
            id: user.id,
            email: userEmail,
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              userEmail.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url || null,
            role: 'superadmin',
            is_active: true,
          })

          return NextResponse.redirect(`${origin}/admin`)
        }

        // 2. Check if user exists by ID
        let { data: profile } = await adminClient
          .from('users')
          .select('id, role, is_active')
          .eq('id', user.id)
          .maybeSingle()

        // 3. If not found by ID, check by registered email (pre-registered student or admin)
        if (!profile) {
          const { data: byEmail } = await adminClient
            .from('users')
            .select('id, role, is_active')
            .eq('email', userEmail)
            .maybeSingle()

          if (byEmail) {
            // Update the existing pre-registered record to bind with Supabase Auth user ID
            await adminClient
              .from('users')
              .update({
                id: user.id,
                full_name:
                  user.user_metadata?.full_name ||
                  user.user_metadata?.name ||
                  userEmail.split('@')[0],
                avatar_url: user.user_metadata?.avatar_url || null,
              })
              .eq('email', userEmail)

            profile = byEmail
          }
        }

        // 4. If still not found, deny access (unregistered Google account)
        if (!profile) {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=not_registered`)
        }

        // 5. If account is deactivated
        if (!profile.is_active) {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=inactive`)
        }

        // 6. Redirect according to role
        if (profile.role === 'superadmin') {
          return NextResponse.redirect(`${origin}/admin`)
        } else if (profile.role === 'pembimbing') {
          return NextResponse.redirect(`${origin}/pembimbing`)
        } else {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
    }
  }

  // Error - redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
