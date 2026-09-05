import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) throw error

    const defaultSettings = {
      check_in_time: '08:30:00',
      check_out_time: '16:30:00',
      timezone: 'Asia/Jakarta',
      working_days: [1, 2, 3, 4, 5],
      site_name: 'ABSENKU',
      site_description: 'Sistem Absensi & Jurnal Peserta Didik PKL',
      site_logo_url: null,
    }

    return NextResponse.json({ settings: settings || defaultSettings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
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
    const {
      check_in_time,
      check_out_time,
      timezone,
      working_days,
      site_name,
      site_description,
      site_logo_url,
    } = body

    const { data: existing } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    const payload = {
      check_in_time: check_in_time || '08:30:00',
      check_out_time: check_out_time || '16:30:00',
      timezone: timezone || 'Asia/Jakarta',
      working_days: working_days || [1, 2, 3, 4, 5],
      site_name: site_name || 'ABSENKU',
      site_description: site_description || 'Sistem Absensi & Jurnal Peserta Didik PKL',
      site_logo_url: site_logo_url !== undefined ? site_logo_url : existing?.site_logo_url,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }

    let savedData
    if (existing) {
      const { data, error } = await supabase
        .from('settings')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      savedData = data
    } else {
      const { data, error } = await supabase
        .from('settings')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      savedData = data
    }

    await logAudit({
      action: 'UPDATE_SETTINGS',
      tableName: 'settings',
      recordId: savedData.id,
      oldData: existing,
      newData: savedData,
    })

    return NextResponse.json({
      success: true,
      message: 'Pengaturan sistem berhasil disimpan.',
      settings: savedData,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
