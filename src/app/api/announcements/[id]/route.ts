import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCallerAccess } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
        { error: 'Siswa tidak memiliki izin mengubah pengumuman.' },
        { status: 403 }
      )
    }

    // Get existing announcement
    const { data: existing, error: fetchErr } = await adminClient
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Pengumuman tidak ditemukan.' }, { status: 404 })
    }

    // Pembimbing can only edit announcements for their assigned PKL place
    if (isMentor && !isAdmin) {
      if (
        !profile?.internship_place_id ||
        existing.internship_place_id !== profile.internship_place_id
      ) {
        return NextResponse.json(
          { error: 'Anda hanya berwenang mengubah pengumuman di instansi bimbingan Anda.' },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const { title, content, type, is_pinned, is_active } = body

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) updatePayload.title = title.trim()
    if (content !== undefined) updatePayload.content = content.trim()
    if (type !== undefined && ['info', 'warning', 'urgent', 'success'].includes(type)) {
      updatePayload.type = type
    }
    if (is_pinned !== undefined) updatePayload.is_pinned = Boolean(is_pinned)
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active)

    // Superadmin can also change destination place
    if (isAdmin && body.internship_place_id !== undefined) {
      updatePayload.internship_place_id = body.internship_place_id || null
    }

    const { data: updated, error: updateErr } = await adminClient
      .from('announcements')
      .update(updatePayload)
      .eq('id', id)
      .select(
        '*, author:author_id(id, full_name, role, avatar_url), place:internship_place_id(id, name)'
      )
      .single()

    if (updateErr) throw updateErr

    // Audit log
    try {
      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'UPDATE_ANNOUNCEMENT',
        table_name: 'announcements',
        record_id: id,
        old_data: existing,
        new_data: updated,
      })
    } catch (e) {
      console.warn('Could not record audit log:', e)
    }

    return NextResponse.json({
      message: 'Pengumuman berhasil diperbarui.',
      announcement: updated,
    })
  } catch (err: any) {
    console.error('PUT /api/announcements/[id] error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
        { error: 'Siswa tidak memiliki izin menghapus pengumuman.' },
        { status: 403 }
      )
    }

    // Get existing announcement
    const { data: existing, error: fetchErr } = await adminClient
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Pengumuman tidak ditemukan.' }, { status: 404 })
    }

    // Pembimbing can only delete announcements for their assigned PKL place
    if (isMentor && !isAdmin) {
      if (
        !profile?.internship_place_id ||
        existing.internship_place_id !== profile.internship_place_id
      ) {
        return NextResponse.json(
          { error: 'Anda hanya berwenang menghapus pengumuman di instansi bimbingan Anda.' },
          { status: 403 }
        )
      }
    }

    const { error: delErr } = await adminClient.from('announcements').delete().eq('id', id)

    if (delErr) throw delErr

    // Audit log
    try {
      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'DELETE_ANNOUNCEMENT',
        table_name: 'announcements',
        record_id: id,
        old_data: existing,
      })
    } catch (e) {
      console.warn('Could not record audit log:', e)
    }

    return NextResponse.json({ message: 'Pengumuman berhasil dihapus.' })
  } catch (err: any) {
    console.error('DELETE /api/announcements/[id] error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
