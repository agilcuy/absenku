import fs from 'fs';
import path from 'path';

export interface TelegramMessageResult {
  ok: boolean;
  message_id?: number;
  description?: string;
}

export interface TelegramConfig {
  bot_token?: string;
  default_chat_id?: string;
  authorized_user_ids: string[];
  alert_enabled: boolean;
}

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
    console.warn('[Telegram Cache] Error writing cache:', err);
  }
}

/**
 * Mendapatkan konfigurasi Telegram dari Environment Variable atau Fallback Cache.
 */
export function getTelegramConfig(): TelegramConfig {
  const cache = readMonitoringCache();
  const dbConfig = cache.telegram_config || {};

  const bot_token = (
    process.env.TELEGRAM_BOT_TOKEN ||
    dbConfig.bot_token ||
    ''
  ).trim();

  const default_chat_id = (
    process.env.TELEGRAM_CHAT_ID ||
    dbConfig.default_chat_id ||
    ''
  ).trim();

  const rawAuthUsers =
    process.env.TELEGRAM_AUTHORIZED_USERS ||
    (Array.isArray(dbConfig.authorized_user_ids)
      ? dbConfig.authorized_user_ids.join(',')
      : '');

  const authorized_user_ids = rawAuthUsers
    .split(',')
    .map((id: string) => id.trim())
    .filter(Boolean);

  const alert_enabled =
    process.env.TELEGRAM_ALERT_ENABLED !== 'false' &&
    dbConfig.alert_enabled !== false;

  return {
    bot_token,
    default_chat_id,
    authorized_user_ids,
    alert_enabled,
  };
}

/**
 * Validasi otorisasi pengguna Telegram berdasarkan User ID.
 * Jika daftar otorisasi kosong, superadmin default diizinkan.
 */
export function isTelegramUserAuthorized(userId: string | number): boolean {
  const config = getTelegramConfig();
  const strId = String(userId).trim();

  if (config.authorized_user_ids.length === 0) {
    // Jika belum ada filter user yang didaftarkan, izinkan chat ID default
    return config.default_chat_id ? strId === config.default_chat_id : true;
  }

  return (
    config.authorized_user_ids.includes(strId) ||
    strId === config.default_chat_id
  );
}

/**
 * Mengirim pesan teks ke Telegram menggunakan Telegram Bot API resmi.
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'MarkdownV2';
    disable_web_page_preview?: boolean;
    reply_markup?: any;
  }
): Promise<TelegramMessageResult> {
  const config = getTelegramConfig();
  if (!config.bot_token) {
    return {
      ok: false,
      description: 'TELEGRAM_BOT_TOKEN belum dikonfigurasi di server.',
    };
  }

  const targetChatId = chatId || config.default_chat_id;
  if (!targetChatId) {
    return {
      ok: false,
      description: 'Chat ID target Telegram belum ditentukan.',
    };
  }

  const url = `https://api.telegram.org/bot${config.bot_token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: options?.parse_mode || 'HTML',
        disable_web_page_preview: options?.disable_web_page_preview ?? true,
        reply_markup: options?.reply_markup,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { ok: true, message_id: data.result?.message_id };
    }
    return { ok: false, description: data.description || 'Gagal mengirim pesan Telegram' };
  } catch (err: any) {
    console.error('[Telegram API] sendMessage Error:', err.message);
    return { ok: false, description: err.message };
  }
}

/**
 * Mengirim foto (misalnya QR Code Wi-Fi) ke chat Telegram.
 */
export async function sendTelegramPhoto(
  chatId: string | number,
  photoUrl: string,
  caption?: string
): Promise<TelegramMessageResult> {
  const config = getTelegramConfig();
  if (!config.bot_token) {
    return { ok: false, description: 'TELEGRAM_BOT_TOKEN belum diset.' };
  }

  const targetChatId = chatId || config.default_chat_id;
  const url = `https://api.telegram.org/bot${config.bot_token}/sendPhoto`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        photo: photoUrl,
        caption: caption || '',
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    return { ok: data.ok, message_id: data.result?.message_id, description: data.description };
  } catch (err: any) {
    return { ok: false, description: err.message };
  }
}

/**
 * Format Pesan Notifikasi Perangkat OFFLINE (🚨 Merah)
 */
export function formatOfflineAlert(
  device: {
    name: string;
    serialNumber: string;
    commonType?: string;
    productType?: string;
    groupName?: string;
    localIp?: string;
    mac?: string;
    offlineReason?: string;
    lastOnline?: number;
  },
  detectedAt = new Date(),
  lastSeen = 'Tidak diketahui'
): string {
  const timeStr = detectedAt.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateStr = detectedAt.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `🚨 <b>RUIJIE DEVICE OFFLINE CONFIRMED</b>

<b>Perangkat:</b> <code>${device.name || 'Unknown Device'}</code>
<b>Tipe:</b> ${device.commonType || 'Access Point'} (${device.productType || '-'})
<b>Lokasi / Site:</b> 🏢 <b>${device.groupName || 'Tanggamus'}</b>
<b>IP Lokal:</b> <code>${device.localIp || '-'}</code>
<b>MAC Address:</b> <code>${device.mac || '-'}</code>
<b>Serial Number:</b> <code>${device.serialNumber}</code>

<b>Waktu Terdeteksi:</b> ${timeStr} WIB (${dateStr})
<b>Alasan Offline:</b> <i>${device.offlineReason || 'Koneksi heartbeat terputus / Daya padam'}</i>

<b>Status:</b> 🔴 <b>OFFLINE</b>
<i>Mohon teknisi jaringan terdekat segera melakukan pengecekan perangkat/catu daya.</i>`;
}

/**
 * Format Pesan Notifikasi Perangkat RECOVERY (✅ Hijau)
 */
export function formatRecoveryAlert(
  device: {
    name: string;
    serialNumber: string;
    commonType?: string;
    groupName?: string;
    localIp?: string;
  },
  downtimeMinutes: number,
  recoveredAt = new Date()
): string {
  const timeStr = recoveredAt.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const hours = Math.floor(downtimeMinutes / 60);
  const mins = downtimeMinutes % 60;
  const durationStr =
    hours > 0 ? `${hours} Jam ${mins} Menit` : `${mins} Menit`;

  return `✅ <b>RUIJIE DEVICE RECOVERY</b>

<b>Perangkat:</b> <code>${device.name || 'Perangkat'}</code>
<b>Lokasi / Site:</b> 🏢 <b>${device.groupName || 'Tanggamus'}</b>
<b>IP Lokal:</b> <code>${device.localIp || '-'}</code>
<b>Serial Number:</b> <code>${device.serialNumber}</code>

<b>Waktu Pulih:</b> ${timeStr} WIB
<b>Total Durasi Offline:</b> ⏱️ <b>${durationStr}</b>

<b>Status:</b> 🟢 <b>ONLINE (Normal)</b>
<i>Perangkat telah terhubung kembali ke Ruijie Cloud Tanggamus.</i>`;
}

/**
 * Format Pesan Ringkasan Status (/status)
 */
export function formatStatusSummary(summary: {
  total: number;
  online: number;
  offline: number;
  totalNetworks: number;
  lastChecked?: string;
}, workerHealth?: {
  last_run_at?: string;
  source?: string;
  status?: string;
}): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const lastRunStr = workerHealth?.last_run_at
    ? new Date(workerHealth.last_run_at).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' WIB'
    : 'Baru saja';

  const healthBadge =
    workerHealth?.status === 'ERROR'
      ? '🔴 PERINGATAN API'
      : '🟢 AKTIF 24/7';

  return `📊 <b>STATUS MONITORING RUIJIE TANGGAMUS</b>
──────────────────────
<b>Mesin Monitoring Cloud:</b> ${healthBadge}
<b>Pengecekan Terakhir:</b> ${lastRunStr} (${workerHealth?.source || 'Cloud Cron'})

📶 <b>Total Perangkat:</b> <code>${summary.total}</code> Unit
🟢 <b>Perangkat Online:</b> <code>${summary.online}</code> Unit (${summary.total > 0 ? Math.round((summary.online / summary.total) * 100) : 0}%)
🔴 <b>Perangkat Offline:</b> <code>${summary.offline}</code> Unit
🏢 <b>Total Lokasi/Site:</b> <code>${summary.totalNetworks}</code> Area

<b>Waktu Server:</b> ${timeStr} WIB
──────────────────────
Ketik <code>/offline</code> untuk melihat rincian perangkat yang mati.
Ketik <code>/wifi</code> untuk informasi Wi-Fi dan QR Code.`;
}

/**
 * Format Daftar Perangkat Offline (/offline)
 */
export function formatOfflineList(
  devices: Array<{
    name: string;
    groupName?: string;
    localIp?: string;
    serialNumber: string;
    offlineReason?: string;
  }>
): string {
  if (devices.length === 0) {
    return `🎉 <b>SELURUH PERANGKAT ONLINE</b>\n\nTidak ada perangkat yang mengalami gangguan saat ini. Semua Access Point dan Switch di Kabupaten Tanggamus berfungsi normal (100% Online).`;
  }

  const list = devices
    .slice(0, 20) // Maksimal 20 agar tidak kepanjangan di chat Telegram
    .map((d, idx) => {
      return `<b>${idx + 1}. ${d.name}</b>\n   🏢 <i>${d.groupName || 'Tanpa Grup'}</i> | IP: <code>${d.localIp || '-'}</code>\n   SN: <code>${d.serialNumber}</code>`;
    })
    .join('\n\n');

  const extra =
    devices.length > 20
      ? `\n\n<i>...dan ${devices.length - 20} perangkat lainnya. Lihat selengkapnya di Dashboard Web.</i>`
      : '';

  return `🚨 <b>DAFTAR PERANGKAT OFFLINE (${devices.length} Unit)</b>\n──────────────────────\n${list}${extra}\n\n<i>Ketik /device &lt;Serial_Number&gt; untuk cek detail spesifik.</i>`;
}

/**
 * Cek Deduplikasi Notifikasi
 * Mencegah pengiriman spam alert berulang untuk perangkat yang sama selama masih offline.
 */
export function canSendNotification(
  deviceSn: string,
  type: 'OFFLINE_ALERT' | 'RECOVERY_ALERT'
): boolean {
  const cache = readMonitoringCache();
  const logs = cache.notification_logs || [];

  // Cari log terakhir untuk perangkat ini
  const recentLogs = logs.filter((l: any) => l.device_sn === deviceSn);
  if (recentLogs.length === 0) {
    return true; // Belum pernah dikirimi notifikasi
  }

  const lastLog = recentLogs[recentLogs.length - 1];

  if (type === 'OFFLINE_ALERT') {
    // Jangan kirim jika notifikasi terakhir sudah OFFLINE_ALERT
    if (lastLog.notification_type === 'OFFLINE_ALERT') {
      return false; // DEDUPLIKASI: Sudah dikabarkan, jangan spam!
    }
  } else if (type === 'RECOVERY_ALERT') {
    // Jangan kirim recovery jika belum pernah offline atau notif terakhir sudah RECOVERY
    if (lastLog.notification_type === 'RECOVERY_ALERT') {
      return false;
    }
  }

  return true;
}

/**
 * Catat Pengiriman Notifikasi ke Log Cache
 */
export function logNotificationSent(
  deviceSn: string,
  deviceName: string,
  type: 'OFFLINE_ALERT' | 'RECOVERY_ALERT',
  chatId: string,
  messageText: string
): void {
  const cache = readMonitoringCache();
  if (!cache.notification_logs) cache.notification_logs = [];

  cache.notification_logs.push({
    id: Date.now().toString(),
    device_sn: deviceSn,
    device_name: deviceName,
    notification_type: type,
    chat_id: chatId,
    message_text: messageText.substring(0, 100) + '...',
    sent_at: new Date().toISOString(),
  });

  // Batasi log maksimal 200 riwayat terakhir
  if (cache.notification_logs.length > 200) {
    cache.notification_logs = cache.notification_logs.slice(-200);
  }

  writeMonitoringCache(cache);
}
