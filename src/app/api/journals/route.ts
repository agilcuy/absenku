import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTodayJakarta } from '@/lib/utils'

// GET daily journals
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const url = new URL(req.url)
    const studentId = url.searchParams.get('studentId')
    const date = url.searchParams.get('date')

    // Check user profile
    const { data: profile } = await adminClient
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single()

    const isPrivileged = profile?.role === 'superadmin' || profile?.role === 'pembimbing'

    let query = adminClient
      .from('daily_journals')
      .select('*, users!daily_journals_user_id_fkey(id, full_name, avatar_url, class_name, major, internship_places(name)), reviewer:reviewed_by(id, full_name)')
      .order('date', { ascending: false })

    if (!isPrivileged) {
      // Student can only see their own
      query = query.eq('user_id', user.id)
    } else if (studentId) {
      query = query.eq('user_id', studentId)
    }

    if (date) {
      query = query.eq('date', date)
    }

    const { data: journals, error } = await query

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.code === '42P01') {
        return NextResponse.json({
          journals: [],
          needsMigration: true,
          message: 'Tabel daily_journals belum ada di database. Silakan jalankan file migration_v4.sql.',
        })
      }
      throw error
    }

    return NextResponse.json({ journals: journals || [] })
  } catch (err: any) {
    console.error('Error fetching journals:', err)
    return NextResponse.json({ error: err.message || 'Gagal memuat jurnal kegiatan' }, { status: 500 })
  }
}

// POST create or update today's journal
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const todayStr = getTodayJakarta()

    const contentType = req.headers.get('content-type') || ''
    let title = ''
    let description = ''
    let journalDate = todayStr
    let photoUrl = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      title = (formData.get('title') as string) || ''
      description = (formData.get('description') as string) || ''
      journalDate = (formData.get('date') as string) || todayStr
      const photoFile = formData.get('photo') as File | null

      if (photoFile && photoFile instanceof File && photoFile.size > 0) {
        try {
          const arrayBuffer = await photoFile.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const fileExt = photoFile.name ? photoFile.name.split('.').pop() || 'jpg' : 'jpg'
          const filePath = `${user.id}/journals/${journalDate}-${Date.now()}.${fileExt}`

          const { error: uploadErr } = await adminClient.storage
            .from('attendance-photos')
            .upload(filePath, buffer, {
              contentType: photoFile.type || 'image/jpeg',
              upsert: true,
            })

          if (!uploadErr) {
            const { data: publicData } = adminClient.storage
              .from('attendance-photos')
              .getPublicUrl(filePath)
            photoUrl = publicData.publicUrl
          }
        } catch (uploadErr) {
          console.warn('Could not upload journal photo:', uploadErr)
        }
      }
    } else {
      const body = await req.json()
      title = body.title || ''
      description = body.description || ''
      journalDate = body.date || todayStr
      photoUrl = body.photo_url || ''
    }

    if (!title.trim() || !description.trim()) {
      return NextResponse.json(
        { error: 'Judul dan deskripsi kegiatan harian wajib diisi.' },
        { status: 400 }
      )
    }

    // Check existing journal for this date
    const { data: existing } = await adminClient
      .from('daily_journals')
      .select('id, photo_url')
      .eq('user_id', user.id)
      .eq('date', journalDate)
      .maybeSingle()

    let finalPhotoUrl = photoUrl || existing?.photo_url || null

    let savedJournal: any = null
    if (existing) {
      const { data, error } = await adminClient
        .from('daily_journals')
        .update({
          title: title.trim(),
          description: description.trim(),
          photo_url: finalPhotoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      savedJournal = data
    } else {
      const { data, error } = await adminClient
        .from('daily_journals')
        .insert({
          user_id: user.id,
          date: journalDate,
          title: title.trim(),
          description: description.trim(),
          photo_url: finalPhotoUrl,
        })
        .select()
        .single()
      if (error) throw error
      savedJournal = data
    }

    return NextResponse.json({
      success: true,
      message: 'Jurnal kegiatan harian berhasil disimpan.',
      journal: savedJournal,
    })
  } catch (err: any) {
    console.error('Error saving journal:', err)
    if (err.code === 'PGRST205' || err.code === '42P01') {
      return NextResponse.json(
        {
          error: 'Tabel daily_journals belum ada di database. Silakan jalankan migration_v4.sql di Supabase SQL Editor.',
          needsMigration: true,
        },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: err.message || 'Gagal menyimpan jurnal kegiatan' }, { status: 500 })
  }
}
