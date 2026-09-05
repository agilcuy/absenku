import { NextRequest, NextResponse } from 'next/server'
import { createProxyClient } from '@/lib/supabase/proxy'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export default async function proxy(req: NextRequest) {
  let response = NextResponse.next({ request: req })

  const supabase = createProxyClient(req, response)
  if (!supabase) {
    return response
  }

  // Refresh session - important for SSR
  const { data: { user } } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname

  // Public routes - no auth needed
  const isPublicRoute = path === '/' || path === '/login' || path.startsWith('/api/auth')

  // Protected route groups
  const isAdminRoute = path.startsWith('/admin')
  const isStudentRoute = path.startsWith('/dashboard')
  const isOnboardingRoute = path.startsWith('/onboarding')

  // Not authenticated, trying to access protected route
  if (!user && (isAdminRoute || isStudentRoute || isOnboardingRoute)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Authenticated - check role-based access
  if (user) {
    const userEmail = (user.email || '').toLowerCase().trim()
    const isMasterAdmin = userEmail === 'mikrotikagil@gmail.com'

    // Immediate bypass and protection for Master Superadmin
    if (isMasterAdmin) {
      if (path === '/login' || path === '/' || isOnboardingRoute) {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
      return response
    }

    // Query users using service role key to bypass RLS recursion safely on the server
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false } }
    )

    let { data: profile } = await adminSupabase
      .from('users')
      .select('role, is_active, class_name, major, phone, internship_place_id')
      .eq('id', user.id)
      .maybeSingle()

    // Fallback: check by email if not found by id
    if (!profile && userEmail) {
      const { data: byEmail } = await adminSupabase
        .from('users')
        .select('role, is_active, class_name, major, phone, internship_place_id')
        .eq('email', userEmail)
        .maybeSingle()
      profile = byEmail
    }

    // Account not in our system
    if (!profile && (isAdminRoute || isStudentRoute || isOnboardingRoute)) {
      return NextResponse.redirect(new URL('/login?error=not_registered', req.url))
    }

    // Account is inactive
    if (profile && !profile.is_active && (isAdminRoute || isStudentRoute || isOnboardingRoute)) {
      return NextResponse.redirect(new URL('/login?error=inactive', req.url))
    }

    // Role: Superadmin
    if (profile?.role === 'superadmin') {
      if (path === '/login' || path === '/' || isOnboardingRoute) {
        return NextResponse.redirect(new URL('/admin', req.url))
      }
      return response
    }

    // Role: Pembimbing
    if (profile?.role === 'pembimbing') {
      if (path === '/login' || path === '/' || isOnboardingRoute || isAdminRoute || isStudentRoute) {
        return NextResponse.redirect(new URL('/pembimbing', req.url))
      }
      return response
    }

    // Role: Student
    if (profile?.role === 'student') {
      const isBiodataIncomplete =
        !profile.class_name || !profile.major || !profile.phone || !profile.internship_place_id

      // Student trying to access admin
      if (isAdminRoute) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      // Student with incomplete biodata accessing dashboard
      if (isBiodataIncomplete && isStudentRoute) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }

      // Student with completed biodata accessing onboarding
      if (!isBiodataIncomplete && isOnboardingRoute) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      if (path === '/login' || path === '/') {
        if (isBiodataIncomplete) {
          return NextResponse.redirect(new URL('/onboarding', req.url))
        }
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
