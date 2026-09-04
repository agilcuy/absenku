import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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
      .select('id, role, full_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin' && profile?.role !== 'pembimbing') {
      return NextResponse.json({ error: 'Forbidden: Hanya Pembimbing atau Superadmin' }, { status: 403 })
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
