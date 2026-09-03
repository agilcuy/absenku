import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: true })

    const adminClient = createAdminClient()
    const nowIso = new Date().toISOString()

    // Mark user offline
    await adminClient
      .from('users')
      .update({
        is_online: false,
        last_seen: nowIso,
      })
      .eq('id', user.id)

    // Parse body safely (beacon might send text/plain or json)
    const text = await req.text()
    let sessionToken = ''
    try {
      const parsed = JSON.parse(text)
      sessionToken = parsed.session_token
    } catch {
      // ignore json parse error on beacon
    }

    if (sessionToken) {
      await adminClient
        .from('user_sessions')
        .update({
          is_active: false,
          logout_at: nowIso,
          last_active_at: nowIso,
        })
        .eq('user_id', user.id)
        .eq('session_token', sessionToken)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
