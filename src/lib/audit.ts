import { createClient, createAdminClient } from '@/lib/supabase/server'

interface LogAuditParams {
  action: string
  tableName: string
  recordId?: string
  oldData?: Record<string, unknown> | null
  newData?: Record<string, unknown> | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    const adminClient = createAdminClient()

    let actorName = user.email || 'Admin'
    try {
      const { data: profile } = await adminClient
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      if (profile?.full_name) actorName = profile.full_name
    } catch {
      // non-blocking
    }

    const validRecordId = recordId && UUID_REGEX.test(recordId) ? recordId : null

    await adminClient.from('audit_logs').insert({
      actor_id: user.id,
      actor_name: actorName,
      action,
      table_name: tableName,
      record_id: validRecordId,
      old_data: oldData ? { ...oldData, ...(recordId && !validRecordId ? { _recordId: recordId } : {}) } : null,
      new_data: newData ? { ...newData, ...(recordId && !validRecordId ? { _recordId: recordId } : {}) } : null,
    })
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
