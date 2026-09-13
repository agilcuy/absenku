import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCallerAccess } from '@/lib/auth'
import {
  getFallbackAnnouncements,
  saveFallbackAnnouncements,
  AnnouncementRecord,
} from '@/lib/announcements'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Helper to get place name from cache if DB is not available
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

// GET announcements with role-based scoping and resilient fallback
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
      query = query.eq('is_active', true)
      if (profile?.internship_place_id) {
        query = query.or(
          `internship_place_id.is.null,internship_place_id.eq.${profile.internship_place_id}`
        )
      } else {
        query = query.is('internship_place_id', null)
      }
    } else if (isMentor && !isAdmin) {
      if (profile?.internship_place_id) {
        query = query.or(
          `internship_place_id.is.null,internship_place_id.eq.${profile.internship_place_id}`
        )
      } else {
        query = query.is('internship_place_id', null)
      }
    } else {
      if (placeId) {
        if (placeId === 'global') {
          query = query.is('internship_place_id', null)
        } else {
          query = query.eq('internship_place_id', placeId)
        }
      }
    }

    query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })

    const { data: announcements, error } = await query

    if (error) {
      console.warn('GET /api/announcements DB notice:', error.message)
      // If table doesn't exist in Supabase schema cache, fallback to disk cache
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        let all = getFallbackAnnouncements()
        let filtered = all

        if (role === 'student' && !isAdmin && !isMentor) {
          filtered = filtered.filter((a) => {
            if (!a.is_active) return false
            if (!a.internship_place_id) return true
            return a.internship_place_id === profile?.internship_place_id
          })
        } else if (isMentor && !isAdmin) {
          filtered = filtered.filter((a) => {
            if (!a.internship_place_id) return true
            return a.internship_place_id === profile?.internship_place_id
          })
        } else {
          if (placeId) {
            if (placeId === 'global') {
              filtered = filtered.filter((a) => !a.internship_place_id)
            } else {
              filtered = filtered.filter((a) => a.internship_place_id === placeId)
            }
          }
        }

        filtered.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        return NextResponse.json({
          announcements: filtered,
          needsMigration: true,
          source: 'cache_fallback',
        })
      }
      throw error
    }

    // Keep disk cache synced with DB
    if (announcements && announcements.length > 0) {
      saveFallbackAnnouncements(announcements)
    }

    return NextResponse.json({ announcements: announcements || [] })
  } catch (err: any) {
    console.error('GET /api/announcements fallback handler:', err.message)
    const fallback = getFallbackAnnouncements()
    return NextResponse.json({
      announcements: fallback,
      needsMigration: true,
      source: 'cache_fallback',
    })
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
      if (!profile?.internship_place_id) {
        return NextResponse.json(
          { error: 'Akun Pembimbing Anda belum terhubung dengan instansi penugasan PKL.' },
          { status: 400 }
        )
      }
      targetPlaceId = profile.internship_place_id
    } else {
      targetPlaceId = internship_place_id || null
    }

    // 1. Try Supabase database insert first
    let createdAnnouncement: any = null
    let usedCache = false

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
      console.warn('POST /api/announcements DB notice:', error.message)
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        // Fallback to disk persistence
        usedCache = true
        let placeName: string | null = null
        if (targetPlaceId) {
          placeName = getPlaceName(targetPlaceId)
        }

        const newRecord: AnnouncementRecord = {
          id: crypto.randomUUID(),
          author_id: user.id,
          title: title.trim(),
          content: content.trim(),
          type: ['info', 'warning', 'urgent', 'success'].includes(type) ? type : 'info',
          internship_place_id: targetPlaceId,
          is_pinned: Boolean(is_pinned),
          is_active: is_active !== false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: {
            id: user.id,
            full_name: profile?.full_name || user.user_metadata?.full_name || 'Admin',
            role: role || 'superadmin',
            avatar_url: profile?.avatar_url || null,
          },
          place: targetPlaceId ? { id: targetPlaceId, name: placeName || 'Instansi Terkait' } : null,
        }

        const currentList = getFallbackAnnouncements()
        currentList.unshift(newRecord)
        saveFallbackAnnouncements(currentList)
        createdAnnouncement = newRecord
      } else {
        throw error
      }
    } else {
      createdAnnouncement = created
      // Also update local cache
      const currentList = getFallbackAnnouncements()
      currentList.unshift(created)
      saveFallbackAnnouncements(currentList)
    }

    // Record to audit logs if possible
    try {
      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        action: 'CREATE_ANNOUNCEMENT',
        table_name: 'announcements',
        record_id: createdAnnouncement?.id,
        new_data: {
          title: createdAnnouncement?.title,
          type: createdAnnouncement?.type,
          internship_place_id: createdAnnouncement?.internship_place_id,
          is_pinned: createdAnnouncement?.is_pinned,
        },
      })
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      message: 'Pengumuman berhasil disiarkan.',
      announcement: createdAnnouncement,
      fromCache: usedCache,
      needsMigration: usedCache,
    })
  } catch (err: any) {
    console.error('POST /api/announcements error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
