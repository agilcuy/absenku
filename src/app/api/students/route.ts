import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

// GET all students
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: students, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ students: students || [] })
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

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { email, full_name, phone } = body

    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email dan Nama Lengkap wajib diisi.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Email ini sudah terdaftar di sistem.' },
        { status: 400 }
      )
    }

    // Insert student record into users table
    const { data: newStudent, error: insertError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(), // Will be mapped when user logs in with Google or stored as pre-registered
        email: normalizedEmail,
        full_name: full_name.trim(),
        phone: phone?.trim() || null,
        role: 'student',
        is_active: true,
      })
      .select()
      .single()

    if (insertError) throw insertError

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
