import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { formatAuthPassword } from '@/lib/utils'

// GET all mentors with assigned students count & details
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // 1. Get all mentors, including superadmins who also serve as mentors
    const { data: mentors, error: mError } = await adminClient
      .from('users')
      .select('id, full_name, email, phone, avatar_url, role, is_active, created_at, internship_place_id, internship_places(id, name, address)')
      .in('role', ['pembimbing', 'superadmin'])
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
    const { email, full_name, username, password, phone, internship_place_id } = body

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Nama Pembimbing wajib diisi.' }, { status: 400 })
    }

    const cleanUsername = username?.trim().toLowerCase() || null
    const normalizedEmail = email?.trim()
      ? email.trim().toLowerCase()
      : (cleanUsername ? `${cleanUsername}@kominfo.local` : null)

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email atau Username Pembimbing wajib diisi.' }, { status: 400 })
    }

    // Check existing email
    const { data: existingEmail } = await adminClient
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingEmail) {
      return NextResponse.json({ error: `Email "${normalizedEmail}" sudah terdaftar di sistem.` }, { status: 400 })
    }

    // Check existing username
    if (cleanUsername) {
      const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json({ error: `Username "${cleanUsername}" sudah digunakan pembimbing/pengguna lain.` }, { status: 400 })
      }
    }

    // Set auth password
    const rawPass = (password && String(password).trim()) ? String(password).trim() : '123'
    const authPassword = formatAuthPassword(rawPass)

    let mentorId = ''
    try {
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: authPassword,
        user_metadata: {
          full_name: full_name.trim(),
          username: cleanUsername,
          phone: phone?.trim() || null,
        },
        email_confirm: true,
      })
      if (authUser?.user) {
        mentorId = authUser.user.id
      } else if (authError) {
        console.warn('Auth admin createUser notice:', authError.message)
      }
    } catch (e) {
      console.warn('Could not create mentor in auth.users, using UUID:', e)
    }

    if (!mentorId) mentorId = crypto.randomUUID()

    const { data: newMentor, error: insertError } = await adminClient
      .from('users')
      .upsert(
        {
          id: mentorId,
          email: normalizedEmail,
          username: cleanUsername,
          full_name: full_name.trim(),
          phone: phone?.trim() || null,
          role: 'pembimbing',
          internship_place_id: internship_place_id ? internship_place_id : null,
          is_active: true,
        },
        { onConflict: 'email' }
      )
      .select('*, internship_places(id, name, address)')
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
      message: `Pembimbing "${full_name}" berhasil ditambahkan dan ditempatkan di instansi.`,
      mentor: newMentor,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
