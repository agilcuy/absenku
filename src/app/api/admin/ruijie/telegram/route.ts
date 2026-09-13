import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getCallerAccess } from '@/lib/auth';
import {
  getTelegramConfig,
  sendTelegramMessage,
} from '@/lib/telegram';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'monitoring_cache.json');

function readMonitoringCache(): any {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    }
  } catch {
    // silent
  }
  return {};
}

function writeMonitoringCache(data: any): void {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Telegram Route Cache] Error writing cache:', err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { isAdmin } = await getCallerAccess(user, adminClient);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = getTelegramConfig();
    const cache = readMonitoringCache();

    // Mask bot token for display
    let maskedToken = '';
    if (config.bot_token) {
      maskedToken =
        config.bot_token.length > 10
          ? `${config.bot_token.substring(0, 6)}...${config.bot_token.substring(config.bot_token.length - 4)}`
          : '********';
    }

    return NextResponse.json({
      success: true,
      config: {
        has_token: !!config.bot_token,
        masked_token: maskedToken,
        default_chat_id: config.default_chat_id,
        authorized_user_ids: config.authorized_user_ids,
        alert_enabled: config.alert_enabled,
      },
      worker_health: cache.worker_health || {
        status: 'STANDBY',
        last_run_at: null,
      },
      recent_logs: (cache.notification_logs || []).slice(-15).reverse(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { isAdmin } = await getCallerAccess(user, adminClient);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    const cache = readMonitoringCache();
    if (!cache.telegram_config) cache.telegram_config = {};

    if (action === 'save_config') {
      const { bot_token, default_chat_id, authorized_user_ids, alert_enabled } = body;

      if (bot_token && bot_token.trim() && !bot_token.includes('...')) {
        cache.telegram_config.bot_token = bot_token.trim();
      }
      if (default_chat_id !== undefined) {
        cache.telegram_config.default_chat_id = default_chat_id.trim();
      }
      if (authorized_user_ids !== undefined) {
        cache.telegram_config.authorized_user_ids = Array.isArray(authorized_user_ids)
          ? authorized_user_ids
          : String(authorized_user_ids)
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
      }
      if (alert_enabled !== undefined) {
        cache.telegram_config.alert_enabled = Boolean(alert_enabled);
      }

      writeMonitoringCache(cache);

      return NextResponse.json({
        success: true,
        message: 'Konfigurasi Telegram berhasil disimpan ke cache server.',
      });
    }

    if (action === 'test_message') {
      const config = getTelegramConfig();
      const targetChat = body.chat_id || config.default_chat_id;

      if (!config.bot_token) {
        return NextResponse.json(
          { error: 'Token bot belum diset. Masukkan token bot terlebih dahulu.' },
          { status: 400 }
        );
      }

      if (!targetChat) {
        return NextResponse.json(
          { error: 'Target Chat ID belum ditentukan.' },
          { status: 400 }
        );
      }

      const testMsg = `🔔 <b>TES KONEKSI TELEGRAM BOT ABSENKU</b>
──────────────────────
Waktu: <b>${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</b>
Status Bot: 🟢 <b>Koneksi Berhasil & Aktif!</b>
Server: <code>Vercel Cloud Edge</code>

<i>Sistem notifikasi alert offline dan pemulihan Ruijie Cloud Tanggamus siap bekerja 24/7.</i>`;

      const result = await sendTelegramMessage(targetChat, testMsg);

      if (!result.ok) {
        return NextResponse.json(
          { error: result.description || 'Gagal mengirim pesan uji coba' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Pesan uji coba berhasil dikirim ke Telegram!',
        message_id: result.message_id,
      });
    }

    if (action === 'register_webhook') {
      const config = getTelegramConfig();
      if (!config.bot_token) {
        return NextResponse.json(
          { error: 'Token bot belum diset.' },
          { status: 400 }
        );
      }

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'https://absenku-three.vercel.app';
      const webhookUrl = `${appUrl}/api/telegram/webhook`;

      const setRes = await fetch(
        `https://api.telegram.org/bot${config.bot_token}/setWebhook?url=${encodeURIComponent(
          webhookUrl
        )}`
      );
      const setData = await setRes.json();

      if (!setData.ok) {
        return NextResponse.json(
          { error: setData.description || 'Gagal mendaftarkan webhook ke Telegram' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Webhook berhasil didaftarkan ke Telegram: ${webhookUrl}`,
        result: setData,
      });
    }

    return NextResponse.json({ error: 'Action tidak dikenali.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
