import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCallerAccess } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// PUT update work schedule and overtime rules for an internship place
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { isAdmin, isMentor, profile } = await getCallerAccess(user, adminClient)

    // Verify caller authority: Must be Superadmin OR Pembimbing assigned to this place
    if (!isAdmin) {
      if (!isMentor || profile?.internship_place_id !== id) {
        return NextResponse.json(
          { error: 'Forbidden: Anda hanya memiliki wewenang untuk mengatur jam kerja pada instansi PKL penugasan Anda.' },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const {
      work_start_time,
      work_end_time,
      overtime_start_time,
      allow_overtime,
    } = body

    // Fetch existing place data
    const { data: existingPlace, error: fetchErr } = await adminClient
      .from('internship_places')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !existingPlace) {
      return NextResponse.json({ error: 'Data tempat PKL tidak ditemukan.' }, { status: 404 })
    }

    // Format time strings (HH:mm:ss)
    const normalizeTime = (t: any, fallback: string) => {
      if (!t || typeof t !== 'string') return fallback
      const clean = t.trim()
      if (clean.length === 5) return `${clean}:00` // "08:30" -> "08:30:00"
      return clean
    }

    const payload: any = {
      work_start_time: normalizeTime(work_start_time, existingPlace.work_start_time || '08:30:00'),
      work_end_time: normalizeTime(work_end_time, existingPlace.work_end_time || '16:30:00'),
      overtime_start_time: normalizeTime(overtime_start_time, existingPlace.overtime_start_time || '17:30:00'),
      allow_overtime: allow_overtime !== undefined ? Boolean(allow_overtime) : existingPlace.allow_overtime !== false,
      updated_at: new Date().toISOString(),
    }

    // Try updating columns
    const { data: updated, error: updateErr } = await adminClient
      .from('internship_places')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) {
      // If columns don't exist yet in Supabase SQL schema, handle gracefully
      if (updateErr.code === '42703' || updateErr.message?.includes('column')) {
        return NextResponse.json(
          {
            error: 'Kolom jam kerja & lembur belum dibuat di database. Harap jalankan migration_v5.sql di Supabase SQL Editor.',
            needsMigration: true,
          },
          { status: 400 }
        )
      }
      throw updateErr
    }

    await logAudit({
      action: 'UPDATE_PLACE_SCHEDULE',
      tableName: 'internship_places',
      recordId: id,
      oldData: existingPlace,
      newData: updated,
    })

    return NextResponse.json({
      success: true,
      message: 'Pengaturan jam kerja dan sistem lembur instansi berhasil disimpan.',
      place: updated,
    })
  } catch (err: any) {
    console.error('Error updating place schedule:', err)
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan sistem saat menyimpan pengaturan jam kerja.' },
      { status: 500 }
    )
  }
}
