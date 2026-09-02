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

  // Not authenticated, trying to access protected route
  if (!user && (isAdminRoute || isStudentRoute)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Authenticated - check role-based access
  if (user) {
    // Query users using service role key to bypass RLS recursion safely on the server
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false } }
    )

    const { data: profile } = await adminSupabase
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle()

    // Account not in our system (email not registered as student/admin)
    if (!profile && (isAdminRoute || isStudentRoute)) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=not_registered', req.url))
    }

    // Account is inactive
    if (profile && !profile.is_active && (isAdminRoute || isStudentRoute)) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=inactive', req.url))
    }

    // Student trying to access admin routes
    if (profile && profile.role === 'student' && isAdminRoute) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Non-superadmin trying to access admin routes
    if (profile && profile.role !== 'superadmin' && isAdminRoute) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Authenticated user trying to access login page - redirect based on role
    if (path === '/login') {
      if (profile?.role === 'superadmin') {
        return NextResponse.redirect(new URL('/admin', req.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Root path - redirect based on role
    if (path === '/') {
      if (profile?.role === 'superadmin') {
        return NextResponse.redirect(new URL('/admin', req.url))
      } else if (profile?.role === 'student') {
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
