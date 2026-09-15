import fs from 'fs';
import path from 'path';

export interface WhatsAppConfig {
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
  qr_code: string | null;
  qr_data_url: string | null;
  pairing_code: string | null;
  bot_phone: string | null;
  target_phone: string;
  target_group_jid: string | null;
  requested_pairing_phone?: string | null;
  alert_enabled: boolean;
  last_connected_at: string | null;
  notification_logs?: Array<{
    id: string;
    target: string;
    type: string;
    text: string;
    sent_at: string;
    status: 'SENT' | 'FAILED';
  }>;
}

const CONFIG_PATH = path.join(process.cwd(), 'src', 'data', 'whatsapp_config.json');
const OUTBOUND_QUEUE_PATH = path.join(process.cwd(), 'src', 'data', 'whatsapp_outbound.json');

export function readWhatsAppConfig(): WhatsAppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('[WhatsApp] Error reading whatsapp_config.json:', e);
  }

  return {
    status: 'DISCONNECTED',
    qr_code: null,
    qr_data_url: null,
    pairing_code: null,
    bot_phone: null,
    target_phone: '',
    target_group_jid: null,
    alert_enabled: true,
    last_connected_at: null,
    notification_logs: [],
  };
}

export function writeWhatsAppConfig(data: Partial<WhatsAppConfig>): WhatsAppConfig {
  const current = readWhatsAppConfig();
  const merged: WhatsAppConfig = { ...current, ...data };
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (e) {
    console.error('[WhatsApp] Error writing whatsapp_config.json:', e);
  }
  return merged;
}

/**
 * Format Pesan Notifikasi Host Tanggamus DOWN (🚨 Merah) untuk WhatsApp
 */
export function formatWhatsAppHostDownAlert(
  host: {
    no: number;
    name: string;
    ip: string;
    category?: string;
  },
  detectedAt = new Date()
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

  return `🚨 *ALERT: JARINGAN TANGGAMUS DOWN*
─────────────────────────
📍 *Nama Tempat:* *${host.name}*
🌐 *IP Address:* \`${host.ip}\`
🏢 *Kategori:* ${host.category || 'OPD / Lokasi'}
🔢 *No Urut:* #${host.no}

⏱️ *Waktu Terdeteksi:* ${timeStr} WIB (${dateStr})
⚠️ *Kondisi:* 🔴 *REQUEST TIMED OUT (DOWN)*

_Mohon teknisi NOC Diskominfo Tanggamus segera memeriksa catu daya/ONU/koneksi fiber optik di lokasi tersebut._`;
}

/**
 * Format Pesan Notifikasi Host Tanggamus RECOVERY (✅ Hijau) untuk WhatsApp
 */
export function formatWhatsAppHostRecoveryAlert(
  host: {
    no: number;
    name: string;
    ip: string;
    category?: string;
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
  const durationStr = hours > 0 ? `${hours} Jam ${mins} Menit` : `${mins} Menit`;

  return `✅ *RECOVERY: JARINGAN TANGGAMUS PULIH*
─────────────────────────
📍 *Nama Tempat:* *${host.name}*
🌐 *IP Address:* \`${host.ip}\`
🏢 *Kategori:* ${host.category || 'OPD / Lokasi'}

⏱️ *Waktu Pulih:* ${timeStr} WIB
⏳ *Durasi Padam:* *${durationStr}*
🟢 *Status:* *NORMAL (ONLINE)*

_Koneksi jaringan telah kembali merespons ICMP ping dengan normal._`;
}

/**
 * Format Pesan Ringkasan Status 69 Host Tanggamus untuk WhatsApp
 */
export function formatWhatsAppStatusSummary(summary: {
  total: number;
  online: number;
  down: number;
  avgLatency: number;
  healthScore: number;
  lastChecked?: string;
}): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const percentOnline =
    summary.total > 0 ? ((summary.online / summary.total) * 100).toFixed(1) : '100';

  return `📊 *STATUS MONITORING JARINGAN TANGGAMUS*
─────────────────────────
🎯 *Total Host:* ${summary.total} Lokasi
🟢 *Host Online:* *${summary.online}* (${percentOnline}%)
🔴 *Host Down:* *${summary.down}*
⚡ *Rata-rata Latensi:* *${summary.avgLatency} ms*
🩺 *Skor Kesehatan:* *${summary.healthScore}%*

🕒 *Waktu Laporan:* ${timeStr} WIB

_Ketik perintah:_
• *!offline* — Daftar host yang padam
• *!ping [nama/ip]* — Tes ping instan
• *!hosts* — Daftar seluruh 69 host`;
}

/**
 * Memasukkan pesan ke antrean keluar (outbound queue) yang diproses oleh daemon Baileys
 */
export function queueOutboundWhatsAppMessage(target: string, text: string): void {
  try {
    let queue: Array<{ id: string; target: string; text: string; created_at: string }> = [];
    if (fs.existsSync(OUTBOUND_QUEUE_PATH)) {
      queue = JSON.parse(fs.readFileSync(OUTBOUND_QUEUE_PATH, 'utf-8'));
    }
    queue.push({
      id: `OUT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      target,
      text,
      created_at: new Date().toISOString(),
    });
    fs.writeFileSync(OUTBOUND_QUEUE_PATH, JSON.stringify(queue, null, 2), 'utf-8');
  } catch (e) {
    console.error('[WhatsApp] Error queuing message:', e);
  }
}
