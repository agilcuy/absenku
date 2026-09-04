import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { formatAuthPassword } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password wajib diisi.' },
        { status: 400 }
      )
    }

    const cleanInput = username.trim().toLowerCase()
    const adminClient = createAdminClient()

    // 1. Search for user by username or email in public.users
    const { data: userProfile, error: profileError } = await adminClient
      .from('users')
      .select('id, email, full_name, username, role, is_active, class_name, major, internship_place_id')
      .or(`username.ilike.${cleanInput},email.ilike.${cleanInput}`)
      .maybeSingle()

    if (profileError) {
      console.error('Database query error on login:', profileError)
      return NextResponse.json(
        { error: 'Terjadi kesalahan sistem saat memeriksa akun.' },
        { status: 500 }
      )
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'Username tidak ditemukan. Pastikan username sudah terdaftar oleh admin.' },
        { status: 404 }
      )
    }

    if (!userProfile.is_active) {
      return NextResponse.json(
        { error: 'Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi admin PKL.' },
        { status: 403 }
      )
    }

    // 2. Perform authentication with Supabase Auth using the user's registered email
    const authPassword = formatAuthPassword(password)
    const supabase = await createClient()
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userProfile.email,
      password: authPassword,
    })

    if (signInError) {
      console.warn('Password check failed for user:', userProfile.username || userProfile.email, signInError.message)
      return NextResponse.json(
        { error: 'Password yang Anda masukkan salah. Silakan coba lagi.' },
        { status: 401 }
      )
    }

    // 3. Record session activity if available
    try {
      const userAgent = req.headers.get('user-agent') || ''
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown'
      
      await adminClient.from('user_sessions').insert({
        user_id: userProfile.id,
        user_agent: userAgent,
        ip_address: ip,
        is_active: true,
        login_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
    } catch (sessionErr) {
      // Non-blocking error for session logging
      console.warn('Could not record user session log:', sessionErr)
    }

    // 4. Determine redirect path based on role
    let redirectUrl = '/dashboard'
    if (userProfile.role === 'superadmin' || userProfile.email?.toLowerCase() === 'mikrotikagil@gmail.com') {
      redirectUrl = '/admin'
    } else if (userProfile.role === 'pembimbing') {
      redirectUrl = '/pembimbing'
    } else {
      // If student has incomplete biodata, they can be guided to onboarding or dashboard
      const isIncomplete =
        !userProfile.class_name ||
        !userProfile.major ||
        !userProfile.internship_place_id
      if (isIncomplete) {
        redirectUrl = '/onboarding'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Login berhasil!',
      redirect: redirectUrl,
      role: userProfile.role,
      user: {
        id: userProfile.id,
        name: userProfile.full_name,
        username: userProfile.username,
        role: userProfile.role,
      },
      session: authData.session,
    })
  } catch (err: any) {
    console.error('POST /api/auth/login unexpected error:', err)
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan pada server saat login.' },
      { status: 500 }
    )
  }
}
