import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.id === id) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menghapus akun administrator Anda sendiri yang sedang aktif digunakan.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Hanya Superadmin' }, { status: 403 })
    }

    // Get target admin info
    const { data: targetAdmin } = await adminClient
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', id)
      .maybeSingle()

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Administrator tidak ditemukan.' }, { status: 404 })
    }

    // 1. Delete from public.users
    const { error: delError } = await adminClient
      .from('users')
      .delete()
      .eq('id', id)

    if (delError) throw delError

    // 2. Delete from auth.users
    try {
      await adminClient.auth.admin.deleteUser(id)
    } catch (authErr) {
      console.warn('Could not delete auth user:', authErr)
    }

    // 3. Log audit
    try {
      await logAudit({
        action: 'DELETE_ADMINISTRATOR',
        tableName: 'users',
        recordId: id,
        oldData: targetAdmin,
      })
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: `Akun Administrator "${targetAdmin.full_name}" berhasil dihapus.`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
