import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseUserAgent, getClientIp } from '@/lib/device'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const body = await req.json().catch(() => ({}))
    const sessionToken = body.session_token || 'default-session'

    const ua = req.headers.get('user-agent') || ''
    const devInfo = parseUserAgent(ua)
    const ip = getClientIp(req)
    const nowIso = new Date().toISOString()

    // 1. Update user last_seen & is_online
    await adminClient
      .from('users')
      .update({
        last_seen: nowIso,
        is_online: true,
      })
      .eq('id', user.id)

    // 2. Track / update user_sessions
    // Check if this session already exists for this user and token
    const { data: existingSession } = await adminClient
      .from('user_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('session_token', sessionToken)
      .maybeSingle()

    if (existingSession) {
      await adminClient
        .from('user_sessions')
        .update({
          last_active_at: nowIso,
          is_active: true,
          ip_address: ip,
          device_type: devInfo.deviceType,
          os: devInfo.os,
          browser: devInfo.browser,
        })
        .eq('id', existingSession.id)
    } else {
      await adminClient.from('user_sessions').insert({
        user_id: user.id,
        session_token: sessionToken,
        device_type: devInfo.deviceType,
        os: devInfo.os,
        browser: devInfo.browser,
        ip_address: ip,
        user_agent: ua,
        login_at: nowIso,
        last_active_at: nowIso,
        is_active: true,
      })
    }

    // 3. Multi-device check (active sessions in last 60 seconds)
    const sixtySecAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: activeSessions } = await adminClient
      .from('user_sessions')
      .select('id, device_type, os, browser')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gte('last_active_at', sixtySecAgo)

    const isMultiDevice = (activeSessions?.length || 0) > 1

    return NextResponse.json({
      success: true,
      is_online: true,
      multi_device: isMultiDevice,
      active_sessions_count: activeSessions?.length || 1,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
