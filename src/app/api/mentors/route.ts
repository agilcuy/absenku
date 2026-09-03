import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET all mentors with assigned students count & details
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // 1. Get all mentors
    const { data: mentors, error: mError } = await adminClient
      .from('users')
      .select('id, full_name, email, phone, avatar_url, role, is_active, created_at')
      .eq('role', 'pembimbing')
      .order('full_name', { ascending: true })

    if (mError) throw mError

    // 2. Get students assigned to each mentor
    const { data: students, error: sError } = await adminClient
      .from('users')
      .select('id, full_name, email, phone, class_name, major, mentor_id, internship_place_id, internship_places(name)')
      .eq('role', 'student')
      .not('mentor_id', 'is', null)

    if (sError) throw sError

    const studentsByMentor: Record<string, any[]> = {}
    ;(students || []).forEach((s: any) => {
      if (!studentsByMentor[s.mentor_id]) studentsByMentor[s.mentor_id] = []
      studentsByMentor[s.mentor_id].push({
        id: s.id,
        full_name: s.full_name,
        email: s.email,
        class_name: s.class_name,
        major: s.major,
        place_name: s.internship_places?.name || '-',
      })
    })

    const formatted = (mentors || []).map((m: any) => ({
      ...m,
      assigned_students: studentsByMentor[m.id] || [],
      assigned_students_count: (studentsByMentor[m.id] || []).length,
    }))

    return NextResponse.json({ mentors: formatted })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST create new mentor
export async function POST(req: NextRequest) {
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
    const { email, full_name, phone } = body

    if (!email?.trim() || !full_name?.trim()) {
      return NextResponse.json({ error: 'Email dan Nama Pembimbing wajib diisi.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check existing email
    const { data: existing } = await adminClient
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Email ini sudah terdaftar di sistem.' }, { status: 400 })
    }

    let mentorId = ''
    try {
      const { data: authUser } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        user_metadata: { full_name: full_name.trim(), phone: phone?.trim() || null },
        email_confirm: true,
      })
      if (authUser?.user) mentorId = authUser.user.id
    } catch (e) {
      console.warn('Could not pre-create mentor in auth.users, using UUID:', e)
    }

    if (!mentorId) mentorId = crypto.randomUUID()

    const { data: newMentor, error: insertError } = await adminClient
      .from('users')
      .upsert(
        {
          id: mentorId,
          email: normalizedEmail,
          full_name: full_name.trim(),
          phone: phone?.trim() || null,
          role: 'pembimbing',
          is_active: true,
        },
        { onConflict: 'email' }
      )
      .select()
      .single()

    if (insertError) throw insertError

    await logAudit({
      action: 'CREATE_MENTOR',
      tableName: 'users',
      recordId: newMentor.id,
      newData: newMentor,
    })

    return NextResponse.json({
      success: true,
      message: 'Pembimbing berhasil ditambahkan.',
      mentor: newMentor,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
