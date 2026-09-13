import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCallerAccess } from '@/lib/auth'
import {
  getFallbackAnnouncements,
  saveFallbackAnnouncements,
  AnnouncementRecord,
} from '@/lib/announcements'
import fs from 'fs'
import path from 'path'

function getPlaceName(placeId: string): string {
  try {
    const cachePath = path.join(process.cwd(), 'src', 'data', 'places_cache.json')
    if (fs.existsSync(cachePath)) {
      const places = JSON.parse(fs.readFileSync(cachePath, 'utf-8'))
      const match = places.find((p: any) => p.id === placeId)
      if (match?.name) return match.name
    }
  } catch {
    // silent
  }
  return 'Instansi Terkait'
}

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

    const body = await req.json()
    const { title, content, type, is_pinned, is_active } = body

    // 1. Try DB first
    let existing: any = null
    const { data: dbExisting, error: fetchErr } = await adminClient
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr && (fetchErr.code === 'PGRST205' || fetchErr.code === '42P01' || fetchErr.message?.includes('schema cache'))) {
      // Fallback cache search
      const fallbackList = getFallbackAnnouncements()
      existing = fallbackList.find((a) => a.id === id)
      if (!existing) {
        return NextResponse.json({ error: 'Pengumuman tidak ditemukan.' }, { status: 404 })
      }

      if (isMentor && !isAdmin) {
        if (!profile?.internship_place_id || existing.internship_place_id !== profile.internship_place_id) {
          return NextResponse.json(
            { error: 'Anda hanya berwenang mengubah pengumuman di instansi bimbingan Anda.' },
            { status: 403 }
          )
        }
      }

      const updatedRecord: AnnouncementRecord = {
        ...existing,
        title: title !== undefined ? title.trim() : existing.title,
        content: content !== undefined ? content.trim() : existing.content,
        type: type !== undefined && ['info', 'warning', 'urgent', 'success'].includes(type) ? type : existing.type,
        is_pinned: is_pinned !== undefined ? Boolean(is_pinned) : existing.is_pinned,
        is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
        internship_place_id:
          isAdmin && body.internship_place_id !== undefined
            ? body.internship_place_id || null
            : existing.internship_place_id,
        updated_at: new Date().toISOString(),
      }

      if (updatedRecord.internship_place_id) {
        updatedRecord.place = {
          id: updatedRecord.internship_place_id,
          name: getPlaceName(updatedRecord.internship_place_id),
        }
      } else {
        updatedRecord.place = null
      }

      const updatedList = fallbackList.map((a) => (a.id === id ? updatedRecord : a))
      saveFallbackAnnouncements(updatedList)

      return NextResponse.json({
        success: true,
        message: 'Pengumuman berhasil diperbarui.',
        announcement: updatedRecord,
        fromCache: true,
      })
    }

    existing = dbExisting
    if (!existing) {
      return NextResponse.json({ error: 'Pengumuman tidak ditemukan.' }, { status: 404 })
    }

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

    // Sync fallback cache
    const fallbackList = getFallbackAnnouncements()
    const updatedFallback = fallbackList.map((a) => (a.id === id ? { ...a, ...updated } : a))
    saveFallbackAnnouncements(updatedFallback)

    return NextResponse.json({
      success: true,
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

    // Try DB first
    const { data: existing, error: fetchErr } = await adminClient
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr && (fetchErr.code === 'PGRST205' || fetchErr.code === '42P01' || fetchErr.message?.includes('schema cache'))) {
      const fallbackList = getFallbackAnnouncements()
      const filtered = fallbackList.filter((a) => a.id !== id)
      saveFallbackAnnouncements(filtered)
      return NextResponse.json({ success: true, message: 'Pengumuman berhasil dihapus.' })
    }

    if (!existing) {
      // Also check fallback
      const fallbackList = getFallbackAnnouncements()
      const filtered = fallbackList.filter((a) => a.id !== id)
      saveFallbackAnnouncements(filtered)
      return NextResponse.json({ success: true, message: 'Pengumuman berhasil dihapus.' })
    }

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
    if (delErr && !(delErr.code === 'PGRST205' || delErr.code === '42P01')) {
      throw delErr
    }

    // Sync fallback cache
    const fallbackList = getFallbackAnnouncements()
    const filtered = fallbackList.filter((a) => a.id !== id)
    saveFallbackAnnouncements(filtered)

    return NextResponse.json({ success: true, message: 'Pengumuman berhasil dihapus.' })
  } catch (err: any) {
    console.error('DELETE /api/announcements/[id] error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
