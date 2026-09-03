import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: true })

    if (error) throw error

    return NextResponse.json({ holidays: holidays || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { date, name } = body

    if (!date || !name) {
      return NextResponse.json(
        { error: 'Tanggal dan keterangan libur wajib diisi.' },
        { status: 400 }
      )
    }

    const { data: newHoliday, error } = await supabase
      .from('holidays')
      .insert({
        date,
        name: name.trim(),
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    await logAudit({
      action: 'ADD_HOLIDAY',
      tableName: 'holidays',
      recordId: newHoliday.id,
      newData: newHoliday,
    })

    return NextResponse.json({
      success: true,
      message: 'Hari libur berhasil ditambahkan.',
      holiday: newHoliday,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
