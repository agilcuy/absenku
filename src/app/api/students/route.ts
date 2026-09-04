import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { formatAuthPassword } from '@/lib/utils'

// GET all students with filters, relations, and pagination
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const placeId = searchParams.get('place_id')
    const mentorId = searchParams.get('mentor_id')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = adminClient
      .from('users')
      .select('*, internship_places(id, name), mentor:mentor_id(id, full_name)')
      .eq('role', 'student')
      .order('full_name', { ascending: true })

    if (placeId) query = query.eq('internship_place_id', placeId)
    if (mentorId) query = query.eq('mentor_id', mentorId)
    if (status) query = query.eq('internship_status', status)
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,class_name.ilike.%${search}%,username.ilike.%${search}%`
      )
    }

    const { data: students, error } = await query

    if (error) throw error

    return NextResponse.json({ students })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST create new student profile
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      email,
      full_name,
      username,
      phone,
      class_name,
      major,
      internship_place_id,
      mentor_id,
      start_date,
      end_date,
      internship_status,
      password,
    } = body

    if (!full_name || (!email && !username)) {
      return NextResponse.json(
        { error: 'Nama Lengkap dan Username wajib diisi.' },
        { status: 400 }
      )
    }

    const normalizedUsername = username?.trim().toLowerCase() || null
    // If no email provided, generate an internal system email using username
    const normalizedEmail = email?.trim()
      ? email.trim().toLowerCase()
      : `${normalizedUsername}@absenku.local`

    // Format password ensuring it meets auth criteria
    const rawPassword = (password && String(password).trim()) ? String(password).trim() : '123456'
    const studentPassword = formatAuthPassword(rawPassword)

    // Check if email already exists in users table
    const { data: existingEmail } = await adminClient
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email atau username ini sudah terdaftar di sistem.' },
        { status: 400 }
      )
    }

    // Check if username already exists
    if (normalizedUsername) {
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('username', normalizedUsername)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username ini sudah digunakan siswa lain. Pilih username lain.' },
          { status: 400 }
        )
      }
    }

    // 1. Create user in Supabase Auth with Password
    let studentId = ''
    try {
      const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: studentPassword,
        user_metadata: {
          full_name: full_name.trim(),
          username: normalizedUsername,
          phone: phone?.trim() || null
        },
        email_confirm: true,
      })

      if (authErr) {
        console.warn('Supabase auth.admin.createUser error:', authErr.message)
      }

      if (authUser?.user) {
        studentId = authUser.user.id
      }
    } catch (e) {
      console.warn('Could not pre-create in auth.users, continuing with UUID:', e)
    }

    if (!studentId) {
      studentId = crypto.randomUUID()
    }

    // 2. Insert into public.users
    const { data: newStudent, error: insertError } = await adminClient
      .from('users')
      .upsert(
        {
          id: studentId,
          email: normalizedEmail,
          full_name: full_name.trim(),
          username: normalizedUsername,
          phone: phone?.trim() || null,
          class_name: class_name?.trim() || null,
          major: major?.trim() || null,
          internship_place_id: internship_place_id || null,
          mentor_id: mentor_id || null,
          start_date: start_date || null,
          end_date: end_date || null,
          internship_status: internship_status || 'aktif',
          role: 'student',
          is_active: true,
        },
        { onConflict: 'email' }
      )
      .select('*, internship_places(name), mentor:mentor_id(full_name)')
      .single()

    if (insertError) {
      console.error('Insert student error:', insertError)
      return NextResponse.json(
        { error: `Gagal menyimpan ke database: ${insertError.message}` },
        { status: 500 }
      )
    }

    await logAudit({
      action: 'CREATE_STUDENT',
      tableName: 'users',
      recordId: newStudent.id,
      newData: newStudent,
    })

    return NextResponse.json({
      success: true,
      message: 'Peserta didik berhasil ditambahkan.',
      student: newStudent,
    })
  } catch (error: any) {
    console.error('POST /api/students error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
