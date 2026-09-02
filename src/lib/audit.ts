import { createClient } from '@/lib/supabase/server'

interface LogAuditParams {
  action: string
  tableName: string
  recordId?: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
}

export async function logAudit({
  action,
  tableName,
  recordId,
  oldData,
  newData,
}: LogAuditParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_name: profile?.full_name || user.email || 'Admin',
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData || null,
      new_data: newData || null,
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
