import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'

// POST review on a journal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // Ensure reviewer is superadmin or pembimbing
    const { data: profile } = await adminClient
      .from('users')
      .select('id, role, full_name, internship_place_id')
      .eq('id', user.id)
      .single()

    const isSuperAdmin = await isUserSuperadmin(user, adminClient)
    const isMentor = profile?.role === 'pembimbing'

    if (!isSuperAdmin && !isMentor) {
      return NextResponse.json({ error: 'Forbidden: Hanya Pembimbing atau Superadmin' }, { status: 403 })
    }

    // Verify target journal
    const { data: targetJournal, error: jErr } = await adminClient
      .from('daily_journals')
      .select('*, users!daily_journals_user_id_fkey(id, full_name, mentor_id, internship_place_id)')
      .eq('id', id)
      .single()

    if (jErr || !targetJournal) {
      return NextResponse.json({ error: 'Data jurnal tidak ditemukan.' }, { status: 404 })
    }

    // Restrict mentor to their own students
    if (isMentor && !isSuperAdmin) {
      const studentPlace = targetJournal.users?.internship_place_id
      const mentorPlace = profile?.internship_place_id
      const isSamePlace = mentorPlace && studentPlace && mentorPlace === studentPlace
      const isAssigned = targetJournal.users?.mentor_id === user.id

      if (!isSamePlace && !isAssigned) {
        return NextResponse.json(
          { error: 'Forbidden: Siswa ini berada di tempat PKL yang berbeda atau bukan bimbingan Anda.' },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const { rating, notes } = body

    const ratingNum = rating ? parseInt(rating) : null
    if (ratingNum && (ratingNum < 1 || ratingNum > 5)) {
      return NextResponse.json({ error: 'Rating harus antara 1 sampai 5 bintang.' }, { status: 400 })
    }

    const { data: updated, error } = await adminClient
      .from('daily_journals')
      .update({
        mentor_rating: ratingNum,
        mentor_notes: notes?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, users!daily_journals_user_id_fkey(full_name), reviewer:reviewed_by(full_name)')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Ulasan dan paraf jurnal berhasil disimpan.',
      journal: updated,
    })
  } catch (err: any) {
    console.error('Error reviewing journal:', err)
    return NextResponse.json({ error: err.message || 'Gagal menyimpan ulasan jurnal' }, { status: 500 })
  }
}
