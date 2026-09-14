import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const HOSTS_FILE = path.join(ROOT_DIR, 'src', 'data', 'tanggamus_hosts.json');
const NETWORK_CACHE_FILE = path.join(ROOT_DIR, 'src', 'data', 'network_monitoring_cache.json');
const WIFI_CACHE_PATH = path.join(ROOT_DIR, 'src', 'data', 'ruijie_wifi_cache.json');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8858219898:AAHgTA1ARc67k3A_0z9T85fgCHMqa2WXdCs';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Helper: Membaca master host
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

// Helper: Membaca cache monitoring
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
    telegram_config: {
      bot_token: BOT_TOKEN,
      default_chat_id: '6555969768',
      alert_enabled: true,
    },
  };
}

// Helper: Menulis cache monitoring
function writeNetworkCache(data) {
  try {
    const dir = path.dirname(NETWORK_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(NETWORK_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing network cache:', err);
  }
}

// Helper: Membaca cache Wi-Fi
function readWifiCache() {
  try {
    if (fs.existsSync(WIFI_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(WIFI_CACHE_PATH, 'utf-8'));
    }
  } catch {}
  return [];
}

// Telegram API Helper: Kirim Pesan Teks
async function sendMessage(chatId, text, options = {}) {
  try {
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || 'HTML',
      disable_web_page_preview: options.disable_web_page_preview ?? true,
    };
    if (options.reply_markup) {
      payload.reply_markup = options.reply_markup;
    }
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.error('sendMessage error:', e);
    return { ok: false, error: e.message };
  }
}

// Telegram API Helper: Kirim Foto
async function sendPhoto(chatId, photoUrl, caption = '', options = {}) {
  try {
    const payload = {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
    };
    if (options.reply_markup) {
      payload.reply_markup = options.reply_markup;
    }
    const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.error('sendPhoto error:', e);
    return { ok: false, error: e.message };
  }
}

const KEYBOARD_MARKUP = {
  keyboard: [
    [{ text: '/status' }, { text: '/offline' }],
    [{ text: '/ping capil' }, { text: '/check' }],
    [{ text: '/hosts' }, { text: '/wifi' }],
    [{ text: '/daftargrup' }, { text: '/help' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

// Ping Function dengan 1x retry
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

// Background Ping Loop: Berjalan terus menerus mengeping 69 host satu persatu
let isPingLoopRunning = false;

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

    const tgConfig = cache.telegram_config || {
      default_chat_id: '6555969768',
      alert_enabled: true,
    };
    const targetChatId = tgConfig.default_chat_id || '6555969768';
    const alertEnabled = tgConfig.alert_enabled !== false;

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

          if (alertEnabled && alertSent && targetChatId) {
            const hours = Math.floor(downtimeMinutes / 60);
            const mins = downtimeMinutes % 60;
            const durStr = hours > 0 ? `${hours} Jam ${mins} Menit` : `${mins} Menit`;

            const recoveryMsg = `✅ <b>RECOVERY: JARINGAN TANGGAMUS PULIH</b>

📍 <b>Nama Tempat:</b> <b>${master.name}</b>
🌐 <b>IP Address:</b> <code>${master.ip}</code>
🏢 <b>Kategori:</b> ${master.category}

⏱️ <b>Waktu Pulih:</b> ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
⏳ <b>Durasi Padam:</b> <b>${durStr}</b>
🟢 <b>Status:</b> <b>NORMAL (ONLINE)</b>

<i>Koneksi jaringan telah kembali merespons ICMP ping dengan normal.</i>`;

            sendMessage(targetChatId, recoveryMsg, { reply_markup: KEYBOARD_MARKUP }).catch((err) =>
              console.error('Error sending recovery alert:', err)
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
        if (alertEnabled && !alertSent && targetChatId) {
          const downMsg = `🚨 <b>ALERT: JARINGAN TANGGAMUS DOWN</b>

📍 <b>Nama Tempat:</b> <b>${master.name}</b>
🌐 <b>IP Address:</b> <code>${master.ip}</code>
🏢 <b>Kategori:</b> ${master.category}
🔢 <b>No Urut:</b> #${master.no}

⏱️ <b>Waktu Terdeteksi:</b> ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
⚠️ <b>Kondisi:</b> 🔴 <b>REQUEST TIMED OUT (DOWN)</b>

<i>Mohon teknisi NOC Diskominfo Tanggamus segera memeriksa catu daya/ONU/koneksi fiber optik di lokasi tersebut.</i>`;

          sendMessage(targetChatId, downMsg, { reply_markup: KEYBOARD_MARKUP }).catch((err) =>
            console.error('Error sending down alert:', err)
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

      // Jeda mikro antar host
      await new Promise((r) => setTimeout(r, 40));
    }

    const downCount = masterHosts.length - onlineCount;
    const avgLatency = onlineCount > 0 ? Math.round(totalLatency / onlineCount) : 0;
    const healthScore = Math.round((onlineCount / masterHosts.length) * 100);

    const updatedCache = {
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
      telegram_config: tgConfig,
    };

    writeNetworkCache(updatedCache);
    console.log(
      `[Ping Cycle Completed] 🟢 ${onlineCount} Online | 🔴 ${downCount} Down | Latency: ${avgLatency}ms | ${now.toLocaleTimeString()}`
    );
  } catch (err) {
    console.error('[Ping Cycle Error]:', err);
  } finally {
    isPingLoopRunning = false;
  }
}

// Telegram Command Handler
async function handleCommand(chatId, userId, userName, text) {
  const parts = text.trim().split(/\s+/);
  const command = parts[0].toLowerCase().split('@')[0];
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

  switch (command) {
    case '/start':
    case '/help': {
      const welcome = `👋 <b>Halo, ${userName}!</b>

Selamat datang di <b>NOC Monitoring Jaringan Tanggamus</b>.
Sistem ini memantau <b>69 Host ONU & Jaringan OPD</b> Pemerintah Kabupaten Tanggamus secara real-time.

📌 <b>Informasi Sesi:</b>
• Chat ID Anda: <code>${chatId}</code>
• Target Monitoring: <b>69 Host IP Tanggamus</b>
• Status Terkini: 🟢 <b>${summary.online} Online</b> | 🔴 <b>${summary.down} Down</b>

⚡ <b>Daftar Perintah Bot:</b>
• <code>/status</code> — Ringkasan kondisi jaringan & skor kesehatan
• <code>/offline</code> — Daftar perangkat ONU yang saat ini padam/down
• <code>/ping [nama/ip]</code> — Ping instan ke host tertentu (cth: <code>/ping capil</code>)
• <code>/hosts</code> — Menampilkan seluruh 69 daftar host & IP
• <code>/check</code> — Menjalankan ping berurutan ke 69 host saat ini
• <code>/wifi [kata kunci]</code> — Cari password asli Wi-Fi OPD Tanggamus
• <code>/qrcode [kata kunci]</code> — Buat QR Code Wi-Fi siap scan
• <code>/daftargrup</code> — Daftarkan chat/grup ini sebagai penerima alert 24/7`;

      await sendMessage(chatId, welcome, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/status': {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const percentOnline = summary.total > 0 ? ((summary.online / summary.total) * 100).toFixed(1) : '100';

      const msg = `📊 <b>STATUS MONITORING JARINGAN TANGGAMUS</b>
─────────────────────────
🎯 <b>Total Host:</b> <code>${summary.total} Lokasi</code>
🟢 <b>Host Online:</b> <b>${summary.online}</b> (${percentOnline}%)
🔴 <b>Host Down:</b> <b>${summary.down}</b>
⚡ <b>Rata-rata Latensi:</b> <b>${summary.avgLatency} ms</b>
🩺 <b>Skor Kesehatan:</b> <b>${summary.healthScore}%</b>

🕒 <b>Pemeriksaan Terakhir:</b> ${cache.last_check_at ? new Date(cache.last_check_at).toLocaleTimeString('id-ID') : timeStr} WIB

${summary.down > 0 ? '⚠️ <i>Terdapat host yang padam! Ketik <code>/offline</code> untuk rincian.</i>' : '✨ <i>Seluruh jaringan terhubung dengan optimal!</i>'}`;

      await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/offline':
    case '/down': {
      const downHosts = hosts.filter((h) => h.status === 'DOWN');
      if (downHosts.length === 0) {
        await sendMessage(
          chatId,
          `🟢 <b>ALHAMDULILLAH, SELURUH JARINGAN NORMAL!</b>\n\nSaat ini seluruh <b>${summary.total} Host ONU Tanggamus</b> aktif dan merespons ping dengan baik (0 host down).`,
          { reply_markup: KEYBOARD_MARKUP }
        );
        return;
      }

      let text = `🚨 <b>DAFTAR HOST PADAM / DOWN (${downHosts.length} Host):</b>\n─────────────────────────\n`;
      downHosts.forEach((h, idx) => {
        let durStr = '';
        if (h.downSince) {
          const mins = Math.max(1, Math.round((Date.now() - new Date(h.downSince).getTime()) / 60000));
          const hrs = Math.floor(mins / 60);
          const remMins = mins % 60;
          durStr = hrs > 0 ? ` (${hrs}j ${remMins}m)` : ` (${mins}m)`;
        }
        text += `${idx + 1}. 🔴 <b>${h.name}</b>\n   • IP: <code>${h.ip}</code>\n   • Kategori: ${h.category}${durStr ? `\n   • Padam: ${durStr}` : ''}\n`;
      });

      text += `\n<i>Mohon tim teknisi segera melakukan tindakan perbaikan.</i>`;
      await sendMessage(chatId, text, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/ping': {
      if (!arg) {
        await sendMessage(
          chatId,
          `ℹ️ <b>Format Perintah Ping:</b>\nKetik: <code>/ping [nama/ip]</code>\nContoh: <code>/ping capil</code> atau <code>/ping 192.168.97.6</code>`,
          { reply_markup: KEYBOARD_MARKUP }
        );
        return;
      }

      const q = arg.toLowerCase();
      const target = hosts.find(
        (h) => h.ip.includes(q) || h.name.toLowerCase().includes(q)
      );

      const targetIp = target ? target.ip : arg;
      const targetName = target ? target.name : arg;

      await sendMessage(chatId, `⏳ <i>Mengeping <b>${targetName}</b> (<code>${targetIp}</code>)...</i>`);
      const pingRes = await pingHost(targetIp, 1000, 1);

      if (pingRes.isOnline) {
        await sendMessage(
          chatId,
          `🟢 <b>PING BERHASIL (ONLINE)!</b>\n\n📍 <b>Host:</b> <b>${targetName}</b>\n🌐 <b>IP:</b> <code>${targetIp}</code>\n⚡ <b>Latensi:</b> <b>${pingRes.latency} ms</b>\n✅ Status: <b>Normal & Merespons ICMP</b>`,
          { reply_markup: KEYBOARD_MARKUP }
        );
      } else {
        await sendMessage(
          chatId,
          `🔴 <b>PING GAGAL (REQUEST TIMED OUT)!</b>\n\n📍 <b>Host:</b> <b>${targetName}</b>\n🌐 <b>IP:</b> <code>${targetIp}</code>\n❌ Status: <b>DOWN / Tidak Merespons</b>`,
          { reply_markup: KEYBOARD_MARKUP }
        );
      }
      break;
    }

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
          await sendMessage(chatId, `❌ Tidak ditemukan host dengan kata kunci: <b>${arg}</b>`, {
            reply_markup: KEYBOARD_MARKUP,
          });
          return;
        }

        let msg = `🔍 <b>HASIL PENCARIAN HOST (${filtered.length} Ditemukan):</b>\n─────────────────────────\n`;
        filtered.slice(0, 20).forEach((h) => {
          const icon = h.status === 'UP' ? '🟢' : '🔴';
          msg += `${icon} <b>${h.no}. ${h.name}</b>\n   • IP: <code>${h.ip}</code> | ${h.category}\n   • Latensi: ${h.latency !== null ? `${h.latency}ms` : 'Timeout'}\n`;
        });
        await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
        return;
      }

      // Tampilkan ringkasan kategori
      const categories = {};
      hosts.forEach((h) => {
        categories[h.category] = (categories[h.category] || 0) + 1;
      });

      let text = `📋 <b>DAFTAR 69 HOST JARINGAN TANGGAMUS</b>\n─────────────────────────\n`;
      text += `Total: <b>69 Host ONU</b> terbagi dalam kategori:\n`;
      for (const [cat, cnt] of Object.entries(categories)) {
        text += `• <b>${cat}:</b> ${cnt} Host\n`;
      }
      text += `\n<i>Gunakan <code>/hosts [kata kunci]</code> untuk mencari, misal: <code>/hosts sekda</code> atau <code>/hosts puskesmas</code></i>`;
      await sendMessage(chatId, text, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/check': {
      await sendMessage(
        chatId,
        `⏳ <i>Menjalankan pengecekan ICMP ping berurutan ke 69 host Tanggamus...</i>`
      );
      await runPeriodicPingCycle();
      const updated = readNetworkCache();
      const up = updated.summary.online;
      const down = updated.summary.down;
      const lat = updated.summary.avgLatency;

      await sendMessage(
        chatId,
        `✅ <b>Pengecekan Berurutan Selesai!</b>\n\n🎯 <b>Total:</b> <code>69 Host</code>\n🟢 <b>Online:</b> <b>${up}</b>\n🔴 <b>Down:</b> <b>${down}</b>\n⚡ <b>Rata-rata Latensi:</b> <b>${lat} ms</b>`,
        { reply_markup: KEYBOARD_MARKUP }
      );
      break;
    }

    case '/daftargrup':
    case '/setchat': {
      if (!cache.telegram_config) cache.telegram_config = {};
      cache.telegram_config.default_chat_id = String(chatId);
      writeNetworkCache(cache);

      await sendMessage(
        chatId,
        `✅ <b>Target Alert Berhasil Disimpan!</b>\n\nID Target: <code>${chatId}</code>\nNotifikasi otomatis jika ada host jaringan Tanggamus yang padam atau pulih (24/7) akan langsung dikirimkan ke chat ini.`,
        { reply_markup: KEYBOARD_MARKUP }
      );
      break;
    }

    // Retained: Wi-Fi & QR Code Tanggamus
    case '/wifi': {
      const wifiList = readWifiCache();
      if (!arg) {
        let msg = `📶 <b>DAFTAR WI-FI & PASSWORD OPD TANGGAMUS</b>\n─────────────────────────\n`;
        msg += `Total Tersedia: <b>${wifiList.length} SSID Resmi</b>\n\n`;
        msg += `Contoh pencarian:\n`;
        msg += `• <code>/wifi bupati</code>\n• <code>/wifi kominfo</code>\n• <code>/wifi dprd</code>\n• <code>/wifi pupr</code>\n• <code>/wifi camat</code>`;
        await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
        return;
      }

      const q = arg.toLowerCase();
      const matches = wifiList.filter(
        (w) =>
          (w.ssid && w.ssid.toLowerCase().includes(q)) ||
          (w.group_name && w.group_name.toLowerCase().includes(q))
      );

      if (matches.length === 0) {
        await sendMessage(chatId, `❌ Tidak ditemukan Wi-Fi dengan kata kunci: <b>${arg}</b>`, {
          reply_markup: KEYBOARD_MARKUP,
        });
        return;
      }

      let resMsg = `📶 <b>HASIL PENCARIAN WI-FI (${matches.length} Ditemukan):</b>\n─────────────────────────\n`;
      matches.slice(0, 10).forEach((w, i) => {
        const pwdDisplay = w.password ? `<code>${w.password}</code>` : '<i>(Open / Tanpa Password)</i>';
        resMsg += `${i + 1}. <b>${w.ssid}</b>\n   • Password: ${pwdDisplay}\n   • Lokasi: ${w.group_name}\n\n`;
      });

      resMsg += `💡 <i>Ketik <code>/qrcode ${matches[0].ssid}</code> untuk mendapatkan kode QR scan otomatis!</i>`;
      await sendMessage(chatId, resMsg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/qrcode': {
      const wifiList = readWifiCache();
      if (!arg) {
        await sendMessage(
          chatId,
          `ℹ️ <b>Format Perintah QR Code:</b>\nKetik: <code>/qrcode [nama wifi]</code>\nContoh: <code>/qrcode Diskominfo</code> atau <code>/qrcode bupati</code>`,
          { reply_markup: KEYBOARD_MARKUP }
        );
        return;
      }

      const q = arg.toLowerCase();
      const match = wifiList.find(
        (w) =>
          (w.ssid && w.ssid.toLowerCase().includes(q)) ||
          (w.group_name && w.group_name.toLowerCase().includes(q))
      );

      if (!match) {
        await sendMessage(chatId, `❌ Tidak ditemukan Wi-Fi dengan kata kunci: <b>${arg}</b>`, {
          reply_markup: KEYBOARD_MARKUP,
        });
        return;
      }

      const encType = match.password ? 'WPA' : 'nopass';
      const qrPayload = `WIFI:T:${encType};S:${match.ssid};P:${match.password || ''};;`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrPayload)}`;

      const caption = `📶 <b>QR CODE WI-FI RESMI TANGGAMUS</b>\n─────────────────────────\n• <b>SSID:</b> <code>${match.ssid}</code>\n• <b>Password:</b> <code>${match.password || '(Open)'}</code>\n• <b>Lokasi:</b> ${match.group_name}\n\n<i>Arahkan kamera smartphone untuk langsung terhubung!</i>`;

      await sendPhoto(chatId, qrUrl, caption, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    default:
      await sendMessage(
        chatId,
        `❓ Perintah <code>${command}</code> tidak dikenali. Ketik <code>/help</code> untuk melihat daftar perintah.`,
        { reply_markup: KEYBOARD_MARKUP }
      );
      break;
  }
}

// Telegram Long Polling Runner
async function startPolling() {
  console.log('🤖 Starting ABSENKU Tanggamus Network Monitoring Telegram Bot...');
  console.log(`🔑 Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);

  // Hapus webhook jika sebelumnya aktif
  try {
    await fetch(`${TELEGRAM_API}/deleteWebhook`);
    console.log('✅ Webhook deleted. Realtime long-polling aktif.');
  } catch (e) {
    console.warn('deleteWebhook warning:', e.message);
  }

  // Jalankan siklus pengecekan ping pertama
  runPeriodicPingCycle().catch(console.error);

  // Jadwalkan siklus ping berkala setiap 60 detik (1 menit)
  setInterval(() => {
    runPeriodicPingCycle().catch(console.error);
  }, 60 * 1000);

  let offset = 0;

  while (true) {
    try {
      const url = `${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=20`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          const msg = update.message || update.channel_post || update.edited_message;
          if (msg && msg.text) {
            const chatId = msg.chat?.id;
            const userId = msg.from?.id || chatId;
            const userName = msg.from?.first_name || msg.from?.username || 'Teknisi';
            const text = msg.text.trim();

            console.log(`[Telegram IN] from ${userName} (${chatId}): ${text}`);
            try {
              await handleCommand(chatId, userId, userName, text);
            } catch (cmdErr) {
              console.error('handleCommand error:', cmdErr);
            }
          }
        }
      } else if (!data.ok) {
        console.warn('Telegram API warning:', data.description);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error('Polling network error:', err.message);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

startPolling();
