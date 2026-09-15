import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
import * as baileys from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

const makeWASocket = baileys.makeWASocket || baileys.default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
const execPromise = util.promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const HOSTS_FILE = path.join(ROOT_DIR, 'src', 'data', 'tanggamus_hosts.json');
const NETWORK_CACHE_FILE = path.join(ROOT_DIR, 'src', 'data', 'network_monitoring_cache.json');
const WIFI_CACHE_PATH = path.join(ROOT_DIR, 'src', 'data', 'ruijie_wifi_cache.json');
const WHATSAPP_CONFIG_PATH = path.join(ROOT_DIR, 'src', 'data', 'whatsapp_config.json');
const OUTBOUND_QUEUE_PATH = path.join(ROOT_DIR, 'src', 'data', 'whatsapp_outbound.json');
const SESSION_DIR = path.resolve(__dirname, 'session');

// ==========================================
// CONFIG & CACHE HELPERS
// ==========================================
function readWhatsAppConfig() {
  try {
    if (fs.existsSync(WHATSAPP_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(WHATSAPP_CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading whatsapp_config:', e);
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

function writeWhatsAppConfig(updates) {
  try {
    const current = readWhatsAppConfig();
    const merged = { ...current, ...updates };
    const dir = path.dirname(WHATSAPP_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WHATSAPP_CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (err) {
    console.error('Error writing whatsapp_config:', err);
  }
}

function readMasterHosts() {
  try {
    if (fs.existsSync(HOSTS_FILE)) {
      return JSON.parse(fs.readFileSync(HOSTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading master hosts:', e);
  }
  return [];
}

function readNetworkCache() {
  try {
    if (fs.existsSync(NETWORK_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(NETWORK_CACHE_FILE, 'utf-8'));
    }
  } catch {}
  return {
    last_check_at: null,
    summary: { total: 69, online: 0, down: 0, avgLatency: 0, healthScore: 100 },
    hosts: [],
    down_history: [],
  };
}

function writeNetworkCache(data) {
  try {
    const dir = path.dirname(NETWORK_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(NETWORK_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing network cache:', err);
  }
}

function readWifiCache() {
  try {
    if (fs.existsSync(WIFI_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(WIFI_CACHE_PATH, 'utf-8'));
    }
  } catch {}
  return [];
}

function appendNotificationLog(entry) {
  try {
    const conf = readWhatsAppConfig();
    const logs = conf.notification_logs || [];
    logs.unshift({
      id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      target: entry.target,
      type: entry.type || 'ALERT',
      text: entry.text,
      sent_at: new Date().toISOString(),
      status: entry.status || 'SENT',
    });
    // Simpan max 50 log terakhir
    writeWhatsAppConfig({ notification_logs: logs.slice(0, 50) });
  } catch (e) {
    console.error('appendNotificationLog error:', e);
  }
}

// Format nomor telepon menjadi JID WhatsApp yang valid
function formatToJid(rawTarget) {
  if (!rawTarget) return null;
  const cleaned = rawTarget.trim();
  if (cleaned.endsWith('@s.whatsapp.net') || cleaned.endsWith('@g.us')) {
    return cleaned;
  }
  let digits = cleaned.replace(/[^0-9]/g, '');
  if (digits.startsWith('08')) {
    digits = '628' + digits.slice(2);
  } else if (digits.startsWith('8')) {
    digits = '628' + digits.slice(1);
  }
  return digits ? `${digits}@s.whatsapp.net` : null;
}

// ==========================================
// PING FUNCTION & SEQUENTIAL ICMP RUNNER
// ==========================================
async function pingHost(ip, timeoutMs = 750, retry = 1) {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? `ping -n 1 -w ${timeoutMs} ${ip}` : `ping -c 1 -W 1 ${ip}`;

  const attempt = async () => {
    const start = Date.now();
    try {
      const { stdout } = await execPromise(cmd);
      const duration = Date.now() - start;
      const isOnline = stdout.includes('TTL=') || stdout.includes('ttl=');
      if (!isOnline) return { isOnline: false, latency: null };
      const match = stdout.match(/time[=<]([0-9]+)ms/i);
      const latency = match ? parseInt(match[1], 10) : duration;
      return { isOnline: true, latency };
    } catch {
      return { isOnline: false, latency: null };
    }
  };

  let res = await attempt();
  if (!res.isOnline && retry > 0) {
    await new Promise((r) => setTimeout(r, 100));
    res = await attempt();
  }
  return res;
}

let activeSocket = null;
let isPingLoopRunning = false;

// Format Alert Down WhatsApp
function formatWhatsAppDownAlert(master, now) {
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return `🚨 *ALERT: JARINGAN TANGGAMUS DOWN*
─────────────────────────
📍 *Nama Tempat:* *${master.name}*
🌐 *IP Address:* \`${master.ip}\`
🏢 *Kategori:* ${master.category}
🔢 *No Urut:* #${master.no}

⏱️ *Waktu Terdeteksi:* ${timeStr} WIB (${dateStr})
⚠️ *Kondisi:* 🔴 *REQUEST TIMED OUT (DOWN)*

_Mohon teknisi NOC Diskominfo Tanggamus segera memeriksa catu daya/ONU/koneksi fiber optik di lokasi tersebut._`;
}

// Format Alert Recovery WhatsApp
function formatWhatsAppRecoveryAlert(master, downtimeMinutes, now) {
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const hours = Math.floor(downtimeMinutes / 60);
  const mins = downtimeMinutes % 60;
  const durStr = hours > 0 ? `${hours} Jam ${mins} Menit` : `${mins} Menit`;

  return `✅ *RECOVERY: JARINGAN TANGGAMUS PULIH*
─────────────────────────
📍 *Nama Tempat:* *${master.name}*
🌐 *IP Address:* \`${master.ip}\`
🏢 *Kategori:* ${master.category}

⏱️ *Waktu Pulih:* ${timeStr} WIB
⏳ *Durasi Padam:* *${durStr}*
🟢 *Status:* *NORMAL (ONLINE)*

_Koneksi jaringan telah kembali merespons ICMP ping dengan normal._`;
}

// Kirim pesan WhatsApp menggunakan activeSocket
async function sendWhatsAppMessage(target, text, type = 'ALERT') {
  if (!activeSocket) {
    console.warn('[WhatsApp Bot] Socket belum aktif, pesan disimpan di log.');
    appendNotificationLog({ target, text, type, status: 'FAILED' });
    return false;
  }

  const jid = formatToJid(target);
  if (!jid) {
    console.warn(`[WhatsApp Bot] Target ${target} tidak valid.`);
    return false;
  }

  try {
    await activeSocket.sendMessage(jid, { text });
    console.log(`[WhatsApp Outbound] Pesan terkirim ke ${jid}`);
    appendNotificationLog({ target: jid, text, type, status: 'SENT' });
    return true;
  } catch (err) {
    console.error(`[WhatsApp Outbound Error] Gagal kirim ke ${jid}:`, err.message);
    appendNotificationLog({ target: jid, text, type, status: 'FAILED' });
    return false;
  }
}

// Background Ping Loop: Berjalan terus menerus mengeping 69 host satu persatu
async function runPeriodicPingCycle() {
  if (isPingLoopRunning) return;
  isPingLoopRunning = true;

  try {
    const masterHosts = readMasterHosts();
    if (masterHosts.length === 0) {
      isPingLoopRunning = false;
      return;
    }

    const cache = readNetworkCache();
    const existingMap = new Map();
    for (const h of cache.hosts || []) {
      existingMap.set(h.ip, h);
    }

    const waConfig = readWhatsAppConfig();
    const target = waConfig.target_group_jid || waConfig.target_phone;
    const alertEnabled = waConfig.alert_enabled !== false;

    const now = new Date();
    const nowIso = now.toISOString();
    const updatedHosts = [];
    const downHistory = [...(cache.down_history || [])];

    let onlineCount = 0;
    let totalLatency = 0;

    for (const master of masterHosts) {
      const prev = existingMap.get(master.ip);
      const pingRes = await pingHost(master.ip, 750, 1);
      const isUp = pingRes.isOnline;

      let consecutiveDownCount = prev ? prev.consecutiveDownCount || 0 : 0;
      let alertSent = prev ? Boolean(prev.alertSent) : false;
      let downSince = prev ? prev.downSince : null;
      let lastSeenUp = prev ? prev.lastSeenUp : undefined;

      if (isUp) {
        onlineCount++;
        totalLatency += pingRes.latency || 0;
        lastSeenUp = nowIso;

        // Cek jika baru saja RECOVERY dari status DOWN
        if (prev && prev.status === 'DOWN') {
          const downtimeMs = downSince ? now.getTime() - new Date(downSince).getTime() : 0;
          const downtimeMinutes = Math.max(1, Math.round(downtimeMs / 60000));

          // Tutup riwayat insiden
          const openInc = downHistory.find((inc) => inc.ip === master.ip && !inc.recoveredAt);
          if (openInc) {
            openInc.recoveredAt = nowIso;
            openInc.durationMinutes = downtimeMinutes;
          }

          if (alertEnabled && alertSent && target && activeSocket) {
            const recoveryMsg = formatWhatsAppRecoveryAlert(master, downtimeMinutes, now);
            sendWhatsAppMessage(target, recoveryMsg, 'RECOVERY').catch((err) =>
              console.error('Error sending WA recovery alert:', err)
            );
          }

          alertSent = false;
          downSince = null;
          consecutiveDownCount = 0;
        }
      } else {
        // Host DOWN
        consecutiveDownCount += 1;
        if (!downSince) downSince = nowIso;

        // Buka log insiden baru
        const existingOpen = downHistory.find((inc) => inc.ip === master.ip && !inc.recoveredAt);
        if (!existingOpen) {
          downHistory.unshift({
            id: `INC-${Date.now()}-${master.no}`,
            no: master.no,
            name: master.name,
            ip: master.ip,
            category: master.category,
            downAt: nowIso,
            recoveredAt: null,
            durationMinutes: null,
          });
        }

        // Kirim alert jika belum dikirim (Deduplikasi)
        if (alertEnabled && !alertSent && target && activeSocket) {
          const downMsg = formatWhatsAppDownAlert(master, now);
          sendWhatsAppMessage(target, downMsg, 'DOWN').catch((err) =>
            console.error('Error sending WA down alert:', err)
          );
          alertSent = true;
        }
      }

      updatedHosts.push({
        no: master.no,
        name: master.name,
        ip: master.ip,
        category: master.category,
        status: isUp ? 'UP' : 'DOWN',
        latency: isUp ? pingRes.latency : null,
        lastCheck: nowIso,
        lastSeenUp,
        downSince,
        consecutiveDownCount: isUp ? 0 : consecutiveDownCount,
        alertSent,
      });

      // Jeda mikro 40ms antar host agar beban ICMP halus
      await new Promise((r) => setTimeout(r, 40));
    }

    const downCount = masterHosts.length - onlineCount;
    const avgLatency = onlineCount > 0 ? Math.round(totalLatency / onlineCount) : 0;
    const healthScore = Math.round((onlineCount / masterHosts.length) * 100);

    const updatedCache = {
      ...cache,
      last_check_at: nowIso,
      summary: {
        total: masterHosts.length,
        online: onlineCount,
        down: downCount,
        avgLatency,
        healthScore,
      },
      hosts: updatedHosts,
      down_history: downHistory.slice(0, 100),
    };

    writeNetworkCache(updatedCache);
    console.log(
      `[WA Ping Cycle] 🟢 ${onlineCount} Online | 🔴 ${downCount} Down | Latency: ${avgLatency}ms | ${now.toLocaleTimeString()}`
    );
  } catch (err) {
    console.error('[Ping Cycle Error]:', err);
  } finally {
    isPingLoopRunning = false;
  }
}

// ==========================================
// OUTBOUND QUEUE PROCESSOR
// ==========================================
async function processOutboundQueue() {
  if (!activeSocket) return;
  try {
    if (!fs.existsSync(OUTBOUND_QUEUE_PATH)) return;
    const queue = JSON.parse(fs.readFileSync(OUTBOUND_QUEUE_PATH, 'utf-8') || '[]');
    if (!Array.isArray(queue) || queue.length === 0) return;

    // Ambil semua pesan dan kosongkan file
    fs.writeFileSync(OUTBOUND_QUEUE_PATH, JSON.stringify([], null, 2), 'utf-8');

    for (const item of queue) {
      if (item.target && item.text) {
        console.log(`[Queue Worker] Mengirim pesan antrean ke ${item.target}...`);
        await sendWhatsAppMessage(item.target, item.text, item.type || 'OUTBOUND');
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  } catch (e) {
    console.error('Error processing outbound queue:', e);
  }
}

// ==========================================
// WHATSAPP COMMAND HANDLER
// ==========================================
async function handleWhatsAppCommand(sock, msg, from, text, senderName, isGroup) {
  const raw = text.trim();
  const parts = raw.split(/\s+/);
  const command = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ').trim();

  const cache = readNetworkCache();
  const hosts = cache.hosts || [];
  const summary = cache.summary || {
    total: 69,
    online: hosts.filter((h) => h.status === 'UP').length,
    down: hosts.filter((h) => h.status === 'DOWN').length,
    avgLatency: 0,
    healthScore: 100,
  };

  const reply = async (msgText) => {
    await sock.sendMessage(from, { text: msgText }, { quoted: msg });
  };

  switch (command) {
    case '!start':
    case '/start':
    case '!help':
    case '/help': {
      const welcome = `👋 *Halo, ${senderName}!*

Selamat datang di *NOC Monitoring Jaringan Tanggamus (WhatsApp Bot)*.
Sistem ini memantau *69 Host ONU & Jaringan OPD* Pemerintah Kabupaten Tanggamus secara real-time 24/7.

📌 *Informasi Sesi:*
• JID Anda / Grup: \`${from}\`
• Target Monitoring: *69 Host IP Tanggamus*
• Status Terkini: 🟢 *${summary.online} Online* | 🔴 *${summary.down} Down*

⚡ *Daftar Perintah Bot:*
• *!status* — Ringkasan kondisi jaringan & skor kesehatan
• *!offline* — Daftar perangkat ONU yang saat ini padam/down
• *!ping [nama/ip]* — Ping instan ke host tertentu (cth: \`!ping capil\`)
• *!hosts* — Menampilkan ringkasan kategori 69 host
• *!check* — Menjalankan ping paksa berurutan ke 69 host saat ini
• *!wifi [kata kunci]* — Cari password asli Wi-Fi OPD Tanggamus
• *!daftargrup* — Daftarkan grup/chat ini sebagai penerima alert 24/7`;

      await reply(welcome);
      break;
    }

    case '!status':
    case '/status': {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const percentOnline = summary.total > 0 ? ((summary.online / summary.total) * 100).toFixed(1) : '100';

      const msgText = `📊 *STATUS MONITORING JARINGAN TANGGAMUS*
─────────────────────────
🎯 *Total Host:* \`${summary.total} Lokasi\`
🟢 *Host Online:* *${summary.online}* (${percentOnline}%)
🔴 *Host Down:* *${summary.down}*
⚡ *Rata-rata Latensi:* *${summary.avgLatency} ms*
🩺 *Skor Kesehatan:* *${summary.healthScore}%*

🕒 *Pemeriksaan Terakhir:* ${cache.last_check_at ? new Date(cache.last_check_at).toLocaleTimeString('id-ID') : timeStr} WIB

${summary.down > 0 ? '⚠️ _Terdapat host yang padam! Ketik *!offline* untuk rincian._' : '✨ _Seluruh jaringan terhubung dengan optimal!_'}`;

      await reply(msgText);
      break;
    }

    case '!offline':
    case '/offline':
    case '!down':
    case '/down': {
      const downHosts = hosts.filter((h) => h.status === 'DOWN');
      if (downHosts.length === 0) {
        await reply(
          `🟢 *ALHAMDULILLAH, SELURUH JARINGAN NORMAL!*\n\nSaat ini seluruh *${summary.total} Host ONU Tanggamus* aktif dan merespons ICMP ping dengan baik (0 host down).`
        );
        return;
      }

      let resText = `🚨 *DAFTAR HOST PADAM / DOWN (${downHosts.length} Host):*\n─────────────────────────\n`;
      downHosts.forEach((h, idx) => {
        let durStr = '';
        if (h.downSince) {
          const mins = Math.max(1, Math.round((Date.now() - new Date(h.downSince).getTime()) / 60000));
          const hrs = Math.floor(mins / 60);
          const remMins = mins % 60;
          durStr = hrs > 0 ? ` (${hrs}j ${remMins}m)` : ` (${mins}m)`;
        }
        resText += `${idx + 1}. 🔴 *${h.name}*\n   • IP: \`${h.ip}\`\n   • Kategori: ${h.category}${durStr ? `\n   • Padam: *${durStr}*` : ''}\n`;
      });

      resText += `\n_Mohon tim teknisi NOC segera melakukan tindakan perbaikan._`;
      await reply(resText);
      break;
    }

    case '!ping':
    case '/ping': {
      if (!arg) {
        await reply(
          `ℹ️ *Format Perintah Ping:*\nKetik: \`!ping [nama/ip]\`\nContoh: \`!ping capil\` atau \`!ping 192.168.97.6\``
        );
        return;
      }

      const q = arg.toLowerCase();
      const target = hosts.find((h) => h.ip.includes(q) || h.name.toLowerCase().includes(q));

      const targetIp = target ? target.ip : arg;
      const targetName = target ? target.name : arg;

      await reply(`⏳ _Mengeping *${targetName}* (\`${targetIp}\`)..._`);
      const pingRes = await pingHost(targetIp, 1000, 1);

      if (pingRes.isOnline) {
        await reply(
          `🟢 *PING BERHASIL (ONLINE)!*\n\n📍 *Host:* *${targetName}*\n🌐 *IP:* \`${targetIp}\`\n⚡ *Latensi:* *${pingRes.latency} ms*\n✅ *Status:* Normal & Merespons ICMP`
        );
      } else {
        await reply(
          `🔴 *PING GAGAL (REQUEST TIMED OUT)!*\n\n📍 *Host:* *${targetName}*\n🌐 *IP:* \`${targetIp}\`\n❌ *Status:* DOWN / Tidak Merespons`
        );
      }
      break;
    }

    case '!hosts':
    case '/hosts': {
      if (arg) {
        const q = arg.toLowerCase();
        const filtered = hosts.filter(
          (h) =>
            h.name.toLowerCase().includes(q) ||
            h.ip.includes(q) ||
            h.category.toLowerCase().includes(q)
        );

        if (filtered.length === 0) {
          await reply(`❌ Tidak ditemukan host dengan kata kunci: *${arg}*`);
          return;
        }

        let resText = `🔍 *HASIL PENCARIAN HOST (${filtered.length} Ditemukan):*\n─────────────────────────\n`;
        filtered.slice(0, 15).forEach((h) => {
          const icon = h.status === 'UP' ? '🟢' : '🔴';
          resText += `${icon} *${h.no}. ${h.name}*\n   • IP: \`${h.ip}\` | ${h.category}\n   • Latensi: ${h.latency !== null ? `${h.latency}ms` : 'Timeout'}\n`;
        });
        await reply(resText);
        return;
      }

      // Tampilkan ringkasan kategori
      const categories = {};
      hosts.forEach((h) => {
        categories[h.category] = (categories[h.category] || 0) + 1;
      });

      let textMsg = `📋 *DAFTAR 69 HOST JARINGAN TANGGAMUS*\n─────────────────────────\n`;
      textMsg += `Total: *69 Host ONU* terbagi dalam kategori:\n`;
      for (const [cat, cnt] of Object.entries(categories)) {
        textMsg += `• *${cat}:* ${cnt} Host\n`;
      }
      textMsg += `\n_Gunakan \`!hosts [kata kunci]\` untuk mencari, misal: \`!hosts sekda\` atau \`!hosts puskesmas\`_`;
      await reply(textMsg);
      break;
    }

    case '!check':
    case '/check': {
      await reply(`⏳ _Menjalankan pengecekan ICMP ping berurutan ke 69 host Tanggamus..._`);
      await runPeriodicPingCycle();
      const updated = readNetworkCache();
      const up = updated.summary.online;
      const down = updated.summary.down;
      const lat = updated.summary.avgLatency;

      await reply(
        `✅ *Pengecekan Berurutan Selesai!*\n\n🎯 *Total:* \`69 Host\`\n🟢 *Online:* *${up}*\n🔴 *Down:* *${down}*\n⚡ *Rata-rata Latensi:* *${lat} ms*`
      );
      break;
    }

    case '!daftargrup':
    case '/daftargrup':
    case '!setalert':
    case '/setalert': {
      const isGroupChat = from.endsWith('@g.us');
      writeWhatsAppConfig({
        target_group_jid: isGroupChat ? from : null,
        target_phone: isGroupChat ? '' : from.replace('@s.whatsapp.net', ''),
        alert_enabled: true,
      });

      await reply(
        `✅ *Target Alert WhatsApp Berhasil Didaftarkan!*\n\n📍 *Target JID:* \`${from}\`\n🔔 *Status Alert:* *AKTIF (24/7)*\n\nSetiap ada host jaringan Tanggamus yang padam (🚨) atau pulih (✅), notifikasi langsung dikirimkan ke ${isGroupChat ? 'grup ini' : 'chat pribadi ini'}.`
      );
      break;
    }

    case '!wifi':
    case '/wifi': {
      const wifiList = readWifiCache();
      if (!arg) {
        let msgWifi = `📶 *DAFTAR WI-FI & PASSWORD OPD TANGGAMUS*\n─────────────────────────\n`;
        msgWifi += `Total Tersedia: *${wifiList.length} SSID Resmi*\n\n`;
        msgWifi += `Contoh pencarian:\n`;
        msgWifi += `• \`!wifi bupati\`\n• \`!wifi kominfo\`\n• \`!wifi dprd\`\n• \`!wifi pupr\`\n• \`!wifi camat\``;
        await reply(msgWifi);
        return;
      }

      const q = arg.toLowerCase();
      const matches = wifiList.filter(
        (w) =>
          (w.ssid && w.ssid.toLowerCase().includes(q)) ||
          (w.group_name && w.group_name.toLowerCase().includes(q))
      );

      if (matches.length === 0) {
        await reply(`❌ Tidak ditemukan Wi-Fi dengan kata kunci: *${arg}*`);
        return;
      }

      let resMsg = `📶 *HASIL PENCARIAN WI-FI (${matches.length} Ditemukan):*\n─────────────────────────\n`;
      matches.slice(0, 10).forEach((w, i) => {
        const pwdDisplay = w.password ? `\`${w.password}\`` : '_(Open / Tanpa Password)_';
        resMsg += `${i + 1}. *${w.ssid}*\n   • Password: ${pwdDisplay}\n   • Lokasi: ${w.group_name}\n\n`;
      });
      await reply(resMsg);
      break;
    }

    default:
      if (raw.startsWith('!') || raw.startsWith('/')) {
        await reply(
          `❓ Perintah *${command}* tidak dikenali. Ketik *!help* untuk melihat panduan perintah NOC.`
        );
      }
      break;
  }
}

// ==========================================
// START BAILEYS WHATSAPP CLIENT
// ==========================================
async function startWhatsAppClient() {
  console.log('=======================================================');
  console.log('📱 ABSENKU - WHATSAPP NOC MONITORING BOT (TANGGAMUS)');
  console.log('=======================================================');
  console.log(`📁 Lokasi session Baileys: ${SESSION_DIR}`);

  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  writeWhatsAppConfig({ status: 'CONNECTING' });

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  let version = [2, 3000, 1015901307];
  try {
    const vInfo = await fetchLatestBaileysVersion();
    version = vInfo.version;
  } catch {}

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['NOC Tanggamus', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
  });

  activeSocket = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 QR CODE WHATSAPP BARU TERSEDIA:');
      qrcodeTerminal.generate(qr, { small: true });

      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
        writeWhatsAppConfig({
          status: 'QR_READY',
          qr_code: qr,
          qr_data_url: qrDataUrl,
        });
        console.log('✅ QR Code Data URL berhasil disimpan ke whatsapp_config.json');
      } catch (qrErr) {
        console.error('Error generating QR Data URL:', qrErr);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ Koneksi WhatsApp terputus (Status: ${statusCode}). Reconnect: ${shouldReconnect}`);

      writeWhatsAppConfig({
        status: 'DISCONNECTED',
        qr_code: null,
        qr_data_url: null,
      });

      activeSocket = null;

      if (shouldReconnect) {
        setTimeout(startWhatsAppClient, 5000);
      } else {
        console.log('❌ Sesi WhatsApp telah Logout. Menyiapkan sesi baru...');
        // Hapus file sesi lama jika logged out agar bisa pairing ulang
        try {
          fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        } catch {}
        setTimeout(startWhatsAppClient, 3000);
      }
    } else if (connection === 'open') {
      const botPhone = sock.user?.id ? sock.user.id.split(':')[0] : 'Connected';
      console.log('\n=======================================================');
      console.log('🎉 BOT WHATSAPP NOC TANGGAMUS BERHASIL TERHUBUNG!');
      console.log(`📱 Nomor Bot: ${botPhone}`);
      console.log(`💬 Sesi tersimpan: ${SESSION_DIR}`);
      console.log('=======================================================\n');

      writeWhatsAppConfig({
        status: 'CONNECTED',
        bot_phone: botPhone,
        qr_code: null,
        qr_data_url: null,
        pairing_code: null,
        last_connected_at: new Date().toISOString(),
      });
    }
  });

  // Watcher untuk Pairing Code yang diminta lewat Web UI (/api/whatsapp/pair)
  const pairingCheckerInterval = setInterval(async () => {
    try {
      const conf = readWhatsAppConfig();
      if (conf.requested_pairing_phone) {
        const phone = conf.requested_pairing_phone;
        console.log(`[Pairing Service] Menerima permintaan Pairing Code untuk nomor: ${phone}`);

        // Bersihkan request agar tidak diproses berulang
        writeWhatsAppConfig({ requested_pairing_phone: null });

        if (!sock.authState.creds.registered) {
          // Bersihkan nomor telepon
          let cleanPhone = phone.replace(/[^0-9]/g, '');
          if (cleanPhone.startsWith('08')) cleanPhone = '628' + cleanPhone.slice(2);
          if (cleanPhone.startsWith('8')) cleanPhone = '628' + cleanPhone.slice(1);

          try {
            console.log(`[Pairing Service] Meminta Pairing Code dari WhatsApp untuk: ${cleanPhone}...`);
            const code = await sock.requestPairingCode(cleanPhone);
            const formattedCode = code ? (code.match(/.{1,4}/g)?.join('-') || code) : code;
            console.log(`✅ [Pairing Code Berhasil]: ${formattedCode}`);

            writeWhatsAppConfig({
              pairing_code: formattedCode,
              status: 'QR_READY',
            });
          } catch (pairErr) {
            console.error('Gagal membuat pairing code:', pairErr);
            writeWhatsAppConfig({ pairing_code: 'ERROR: ' + pairErr.message });
          }
        } else {
          console.log('[Pairing Service] Akun WhatsApp sudah terdaftar/terhubung.');
          writeWhatsAppConfig({ pairing_code: 'ALREADY_REGISTERED' });
        }
      }
    } catch (err) {
      console.error('Pairing checker error:', err);
    }
  }, 1500);

  // Penanganan Pesan Masuk (Commands)
  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (msg.key.fromMe) continue;

        const from = msg.key.remoteJid;
        if (!from) continue;

        const isGroup = from.endsWith('@g.us');
        const senderName = msg.pushName || 'Teknisi';

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          '';

        const trimmed = text.trim();
        if (!trimmed.startsWith('!') && !trimmed.startsWith('/')) continue;

        console.log(`📩 [WA IN] dari ${senderName} (${from}): "${trimmed}"`);
        await handleWhatsAppCommand(sock, msg, from, trimmed, senderName, isGroup);
      }
    } catch (err) {
      console.error('Error handling WA message:', err);
    }
  });

  return sock;
}

// ==========================================
// MAIN DAEMON ENTRY POINT
// ==========================================
async function runDaemon() {
  console.log('🚀 Memulai Daemon Monitoring IP Tanggamus & WhatsApp NOC Bot...');

  // 1. Jalankan WhatsApp Baileys Client
  try {
    await startWhatsAppClient();
  } catch (waErr) {
    console.error('Gagal menginisialisasi WhatsApp client:', waErr);
  }

  // 2. Jalankan siklus ping pertama
  runPeriodicPingCycle().catch(console.error);

  // 3. Interval ping 60 detik berkala
  setInterval(() => {
    runPeriodicPingCycle().catch(console.error);
  }, 60 * 1000);

  // 4. Interval pengecekan outbound queue setiap 2 detik
  setInterval(() => {
    processOutboundQueue().catch(console.error);
  }, 2000);
}

runDaemon().catch((err) => {
  console.error('Fatal Daemon Error:', err);
  process.exit(1);
});
