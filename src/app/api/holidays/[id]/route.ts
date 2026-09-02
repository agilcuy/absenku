import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: oldData } = await supabase
      .from('holidays')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase.from('holidays').delete().eq('id', id)
    if (error) throw error

    await logAudit({
      action: 'DELETE_HOLIDAY',
      tableName: 'holidays',
      recordId: id,
      oldData,
    })

    return NextResponse.json({
      success: true,
      message: 'Hari libur berhasil dihapus.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
