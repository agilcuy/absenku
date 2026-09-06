import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCallerAccess } from '@/lib/auth'

// GET announcements with role-based scoping
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { isAdmin, isMentor, role, profile } = await getCallerAccess(user, adminClient)

    const url = new URL(req.url)
    const placeId = url.searchParams.get('place_id')

    let query = adminClient
      .from('announcements')
      .select(
        '*, author:author_id(id, full_name, role, avatar_url), place:internship_place_id(id, name)'
      )

    // Role-based visibility
    if (role === 'student' && !isAdmin && !isMentor) {
      // Students only see active announcements: Global OR for their PKL place
      query = query.eq('is_active', true)
      if (profile?.internship_place_id) {
        query = query.or(
          `internship_place_id.is.null,internship_place_id.eq.${profile.internship_place_id}`
        )
      } else {
        query = query.is('internship_place_id', null)
      }
    } else if (isMentor && !isAdmin) {
      // Mentors see announcements for their assigned PKL place + global announcements
      if (profile?.internship_place_id) {
        query = query.or(
          `internship_place_id.is.null,internship_place_id.eq.${profile.internship_place_id}`
        )
      } else {
        query = query.is('internship_place_id', null)
      }
    } else {
      // Superadmin can see all announcements or filter by place
      if (placeId) {
        if (placeId === 'global') {
          query = query.is('internship_place_id', null)
        } else {
          query = query.eq('internship_place_id', placeId)
        }
      }
    }

    // Always sort pinned announcements first, then newest
    query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })

    const { data: announcements, error } = await query

    if (error) {
      // If table doesn't exist yet, return empty gracefully
      if (error.code === '42P01') {
        return NextResponse.json({ announcements: [], needsMigration: true })
      }
      throw error
    }

    return NextResponse.json({ announcements: announcements || [] })
  } catch (err: any) {
    console.error('GET /api/announcements error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// POST create new announcement (Superadmin or Pembimbing only)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { isAdmin, isMentor, role, profile } = await getCallerAccess(user, adminClient)

    if (role === 'student' && !isAdmin && !isMentor) {
      return NextResponse.json(
        { error: 'Siswa tidak memiliki izin membuat pengumuman.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { title, content, type = 'info', internship_place_id, is_pinned = false, is_active = true } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Judul pengumuman wajib diisi.' }, { status: 400 })
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Isi pesan pengumuman wajib diisi.' }, { status: 400 })
    }

    let targetPlaceId: string | null = null

    if (isMentor && !isAdmin) {
      // Pembimbing is STRICTLY restricted to their assigned internship place
      if (!profile?.internship_place_id) {
        return NextResponse.json(
          { error: 'Akun Pembimbing Anda belum terhubung dengan instansi penugasan PKL.' },
          { status: 400 }
        )
      }
      targetPlaceId = profile.internship_place_id
    } else {
      // Superadmin can target Global (null) or a specific place
      targetPlaceId = internship_place_id || null
    }

    const { data: created, error } = await adminClient
      .from('announcements')
      .insert({
        author_id: user.id,
        title: title.trim(),
        content: content.trim(),
        type: ['info', 'warning', 'urgent', 'success'].includes(type) ? type : 'info',
        internship_place_id: targetPlaceId,
        is_pinned: Boolean(is_pinned),
        is_active: is_active !== false,
      })
      .select(
        '*, author:author_id(id, full_name, role, avatar_url), place:internship_place_id(id, name)'
      )
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Tabel pengumuman belum dibuat di database. Harap jalankan migration_v6.sql di Supabase.' },
          { status: 400 }
        )
      }
      throw error
    }

    // Record to audit logs
    try {
      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'CREATE_ANNOUNCEMENT',
        table_name: 'announcements',
        record_id: created?.id,
        new_data: {
          title: created?.title,
          type: created?.type,
          internship_place_id: created?.internship_place_id,
          is_pinned: created?.is_pinned,
        },
      })
    } catch (auditErr) {
      console.warn('Could not record audit log:', auditErr)
    }

    return NextResponse.json({
      message: 'Pengumuman berhasil disiarkan.',
      announcement: created,
    })
  } catch (err: any) {
    console.error('POST /api/announcements error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
