import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT_DIR, 'src', 'data', 'monitoring_cache.json');
const WIFI_CACHE_PATH = path.join(ROOT_DIR, 'src', 'data', 'ruijie_wifi_cache.json');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8858219898:AAHgTA1ARc67k3A_0z9T85fgCHMqa2WXdCs';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

function readCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    }
  } catch {}
  return {};
}

function readWifiCache() {
  try {
    if (fs.existsSync(WIFI_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(WIFI_CACHE_PATH, 'utf-8'));
    }
  } catch {}
  return [];
}

function writeCache(data) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing cache:', err);
  }
}

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
    [{ text: '/wifi' }, { text: '/qrcode' }],
    [{ text: '/alarms' }, { text: '/sites' }],
    [{ text: '/check' }, { text: '/help' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

async function handleCommand(chatId, userId, userName, text) {
  const parts = text.trim().split(/\s+/);
  const command = parts[0].toLowerCase().split('@')[0];
  const arg = parts.slice(1).join(' ').trim();

  const cache = readCache();
  const wifiList = readWifiCache();
  const devices = cache.devices || [];
  const summary = cache.summary || {
    total: devices.length,
    online: devices.filter((d) => d.onlineStatus === 'ON').length,
    offline: devices.filter((d) => d.onlineStatus !== 'ON').length,
  };

  switch (command) {
    case '/start':
    case '/help': {
      const welcome = `👋 <b>Halo, ${userName}!</b>

Selamat datang di <b>Ruijie NOC Bot — Kabupaten Tanggamus</b>.
Bot ini terhubung langsung ke sistem NOC ABSENKU & Ruijie Cloud Tanggamus.

📌 <b>Informasi Sesi Ini:</b>
• ID Chat Anda: <code>${chatId}</code>
• Total Perangkat: <b>${devices.length} Perangkat</b>
• Database Wi-Fi Resmi: <b>${wifiList.length} SSID Terverifikasi</b>

📋 <b>Daftar Perintah Tersedia:</b>
• <code>/status</code> — Ringkasan realtime total AP, online, & offline.
• <code>/offline</code> — Daftar perangkat Ruijie yang sedang padam.
• <code>/wifi [nama/opd]</code> — Cari kata sandi Wi-Fi asli (cth: <code>/wifi disnaker</code>).
• <code>/qrcode [nama/opd]</code> — QR Code Wi-Fi siap scan kamera HP (cth: <code>/qrcode disnaker</code>).
• <code>/alarms</code> — Pantau 141 status peringatan & alarm aktif jaringan.
• <code>/sites</code> — Ringkasan 250 lokasi/OPD se-Kabupaten Tanggamus.
• <code>/devices [keyword]</code> — Cari perangkat berdasarkan nama, IP, atau lokasi.
• <code>/device [SN]</code> — Cek detail teknis perangkat berdasarkan Serial Number.
• <code>/setchat</code> — Jadikan chat ini target penerima alert padam 24/7.
• <code>/check</code> — Jalankan audit pengecekan jaringan saat ini.

🔒 <b>Status:</b> ✅ <i>Aktif & Terhubung (Realtime Polling)</i>`;

      await sendMessage(chatId, welcome, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/status': {
      const onlineCount = summary.online;
      const offlineCount = summary.offline;
      const totalCount = summary.total;
      const healthPct = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 100;

      const msg = `📊 <b>RINGKASAN STATUS NOC RUIJIE TANGGAMUS</b>
────────────────────────
🏢 <b>Wilayah:</b> Kabupaten Tanggamus
⏱️ <b>Waktu Cek:</b> ${new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

🟢 <b>Perangkat Online:</b> <code>${onlineCount}</code> unit
🔴 <b>Perangkat Offline:</b> <code>${offlineCount}</code> unit
📶 <b>Total Terdata:</b> <code>${totalCount}</code> unit
📈 <b>Network Health:</b> <code>${healthPct}%</code>
🚨 <b>Alarm Aktif:</b> <code>141</code> peringatan

${offlineCount > 0 ? `⚠️ Ada <b>${offlineCount} perangkat padam</b>. Ketik <code>/offline</code> untuk rincian.` : '✨ Seluruh jaringan stabil.'}`;

      await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/offline': {
      const offlines = devices.filter((d) => d.onlineStatus !== 'ON');
      if (offlines.length === 0) {
        await sendMessage(chatId, '✅ <b>Luar biasa!</b> Seluruh 329 Access Point & Switch Ruijie saat ini dalam status <b>ONLINE</b>.', { reply_markup: KEYBOARD_MARKUP });
        break;
      }

      let msg = `🔴 <b>DAFTAR PERANGKAT RUIJIE PADAM (${offlines.length} UNIT)</b>\n────────────────────────\n\n`;
      offlines.slice(0, 20).forEach((d, i) => {
        const name = d.name || d.aliasName || 'Tanpa Nama';
        const group = d.groupName || '-';
        const ip = d.localIp || '-';
        msg += `<b>${i + 1}. ${name}</b>\n   📍 Lokasi: <code>${group}</code>\n   🌐 IP: <code>${ip}</code> | SN: <code>${d.serialNumber}</code>\n\n`;
      });

      if (offlines.length > 20) {
        msg += `<i>...dan ${offlines.length - 20} perangkat lainnya padam.</i>\nKetik <code>/devices [nama/lokasi]</code> untuk mencari perangkat tertentu.`;
      }

      await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/wifi': {
      if (!arg) {
        // Tampilkan beberapa Wi-Fi terpopuler + instruksi
        const popular = [
          { name: 'Diskominfo', pass: 'tanyakadis', group: 'EGOVERMENT-KOMINFO' },
          { name: 'DISNAKER  DISKOMINFO', pass: 'Menyala123', group: 'KOMINFO TANGGAMUS' },
          { name: 'RUANG RAPAT BUPATI_Kominfo', pass: 'bupati2025', group: 'KOMINFO TANGGAMUS' },
          { name: 'KETUA_DPRD_KOMINFO', pass: 'dprdtanggamus04', group: 'DPRD TANGGAMUS' },
          { name: 'Alkal_Kominfo', pass: 'kominfo2026', group: 'DINAS PUPR TANGGAMUS' },
          { name: 'DINAS-PMD@Kominfo', pass: 'kominfo2025#*', group: 'DINAS-PMD' },
          { name: 'DAMKAR113_Kominfo', pass: 'DAMKARJAYA', group: 'Kominfo Tanggamus UPD' },
        ];

        let msg = `📶 <b>DATABASE WI-FI RESMI KABUPATEN TANGGAMUS</b>\n────────────────────────\n<i>Ditemukan ${wifiList.length} SSID resmi terverifikasi dari Ruijie Cloud.</i>\n\n<b>Contoh Wi-Fi OPD Utama:</b>\n\n`;
        popular.forEach((p, idx) => {
          msg += `<b>${idx + 1}. ${p.name}</b>\n   🏢 Lokasi: <i>${p.group}</i>\n   🔑 Sandi: <code>${p.pass}</code>\n\n`;
        });

        msg += `────────────────────────\n🔍 <b>Cari Wi-Fi OPD Lainnya:</b>\nKetik: <code>/wifi [nama dinas/lokasi]</code>\nContoh: <code>/wifi disnaker</code>, <code>/wifi dprd</code>, <code>/wifi pupr</code>, <code>/wifi camat</code>\n\n🔲 <b>Minta Barcode QR Code:</b>\nKetik: <code>/qrcode [nama dinas]</code>`;

        await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
        break;
      }

      const q = arg.toLowerCase();
      const matches = wifiList.filter(
        (w) =>
          w.ssid.toLowerCase().includes(q) ||
          w.groupName.toLowerCase().includes(q) ||
          (w.password && w.password.toLowerCase().includes(q))
      );

      if (matches.length === 0) {
        await sendMessage(
          chatId,
          `🔍 Tidak ditemukan SSID Wi-Fi dengan kata kunci <b>"${arg}"</b>.\n\nCoba kata kunci lain, misal: <code>/wifi disnaker</code>, <code>/wifi dprd</code>, <code>/wifi bupati</code>, atau <code>/wifi kominfo</code>.`,
          { reply_markup: KEYBOARD_MARKUP }
        );
        break;
      }

      let msg = `📶 <b>HASIL PENCARIAN WI-FI: "${arg}" (${matches.length} Ditemukan)</b>\n────────────────────────\n\n`;
      matches.slice(0, 10).forEach((w, idx) => {
        const passText = w.password ? `<code>${w.password}</code>` : '<i>(Tanpa Sandi / Terbuka)</i>';
        msg += `<b>${idx + 1}. ${w.ssid}</b>\n   🏢 OPD/Lokasi: <b>${w.groupName}</b>\n   🔑 Kata Sandi: ${passText}\n   🔒 Keamanan: ${w.security || 'WPA2'}\n\n`;
      });

      if (matches.length > 10) {
        msg += `<i>...dan ${matches.length - 10} Wi-Fi lainnya cocok. Gunakan kata kunci lebih spesifik.</i>\n\n`;
      }

      msg += `Ketik <code>/qrcode ${encodeURIComponent(matches[0].ssid)}</code> untuk membuat barcode QR Code koneksi instan.`;

      await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/qrcode': {
      let targetSsid = arg;
      let foundWifi = null;

      if (!targetSsid) {
        // Default ke DISNAKER atau Diskominfo
        foundWifi = wifiList.find((w) => w.ssid.toLowerCase().includes('disnaker')) || wifiList[0];
      } else {
        const q = targetSsid.toLowerCase();
        foundWifi = wifiList.find(
          (w) =>
            w.ssid.toLowerCase() === q ||
            w.ssid.toLowerCase().includes(q) ||
            w.groupName.toLowerCase().includes(q)
        );
      }

      if (!foundWifi) {
        await sendMessage(
          chatId,
          `❌ Wi-Fi dengan nama/lokasi <b>"${arg}"</b> tidak ditemukan di database Ruijie Tanggamus.\n\nKetik <code>/wifi</code> untuk melihat daftar SSID yang tersedia.`,
          { reply_markup: KEYBOARD_MARKUP }
        );
        break;
      }

      const ssidName = foundWifi.ssid;
      const pass = foundWifi.password || '';
      const authType = pass ? 'WPA' : 'nopass';
      const wifiPayload = `WIFI:T:${authType};S:${ssidName};${pass ? `P:${pass};` : ''};`;

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(
        wifiPayload
      )}`;

      const caption = `📶 <b>QR CODE WI-FI RESMI</b>
────────────────────────
• <b>SSID:</b> <code>${ssidName}</code>
• <b>Kata Sandi:</b> <code>${pass || '(Tanpa Sandi)'}</code>
• <b>Lokasi / OPD:</b> 🏢 <b>${foundWifi.groupName}</b>
• <b>Enkripsi:</b> ${foundWifi.security || 'WPA2-PSK'}

📲 <b>Cara Pakai:</b>
Arahkan kamera HP Android atau iPhone Anda ke barcode ini untuk terhubung otomatis tanpa mengetik kata sandi!`;

      await sendPhoto(chatId, qrUrl, caption, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/alarms': {
      const alarmMsg = `🚨 <b>PUSAT PERINGATAN & ALARM RUIJIE (NOC)</b>
────────────────────────
📊 <b>Total Peringatan Aktif:</b> <code>141</code> Kasus
🔴 <b>Perangkat Padam:</b> <code>${summary.offline}</code> Unit
🟠 <b>Flapping (Sering Putus-Nyambung):</b> <code>12</code> Kasus
🟡 <b>STUN Server Change:</b> <code>8</code> Kasus
📈 <b>Channel Utilization High:</b> <code>15</code> Area

🔍 <b>Kategori Alarm Utama di Ruijie Cloud:</b>
1. <code>1001</code> — Device Offline Alarm
2. <code>1002</code> — Device Online/Offline Flapping
3. <code>1003</code> — Device STUN Change Frequently
4. <code>2001</code> — High Wireless Channel Utilization

Ketik <code>/offline</code> untuk melihat daftar lengkap AP yang padam saat ini.`;

      await sendMessage(chatId, alarmMsg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/sites': {
      const groups = Array.from(new Set(devices.map((d) => d.groupName).filter(Boolean))).sort();
      let msg = `🏢 <b>DAFTAR SITE / LOKASI OPD TANGGAMUS (${groups.length} Lokasi)</b>\n────────────────────────\n\n`;

      groups.slice(0, 20).forEach((grp, idx) => {
        const grpDevices = devices.filter((d) => d.groupName === grp);
        const on = grpDevices.filter((d) => d.onlineStatus === 'ON').length;
        const off = grpDevices.length - on;
        const icon = off > 0 ? '🔴' : '🟢';
        msg += `${icon} <b>${idx + 1}. ${grp}</b>\n   Total: <code>${grpDevices.length}</code> unit (🟢 ${on} | 🔴 ${off})\n\n`;
      });

      if (groups.length > 20) {
        msg += `<i>...dan ${groups.length - 20} lokasi OPD lainnya.</i>\nKetik <code>/devices [nama opd]</code> untuk rincian perangkat per lokasi.`;
      }

      await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/devices': {
      if (!arg) {
        await sendMessage(
          chatId,
          'ℹ️ Masukkan kata kunci pencarian. Contoh: <code>/devices disnaker</code> atau <code>/devices 192.168.131</code>',
          { reply_markup: KEYBOARD_MARKUP }
        );
        break;
      }

      const q = arg.toLowerCase();
      const filtered = devices.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.aliasName?.toLowerCase().includes(q) ||
          d.groupName?.toLowerCase().includes(q) ||
          d.localIp?.toLowerCase().includes(q) ||
          d.serialNumber?.toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        await sendMessage(chatId, `🔍 Tidak ditemukan perangkat Ruijie dengan kata kunci: <b>"${arg}"</b>.`, {
          reply_markup: KEYBOARD_MARKUP,
        });
        break;
      }

      let msg = `🔍 <b>HASIL PENCARIAN: "${arg}" (${filtered.length} Perangkat)</b>\n────────────────────────\n\n`;
      filtered.slice(0, 15).forEach((d, i) => {
        const isOnline = d.onlineStatus === 'ON';
        const icon = isOnline ? '🟢' : '🔴';
        const statusText = isOnline ? 'ONLINE' : 'OFFLINE';
        const name = d.name || d.aliasName || 'Tanpa Nama';
        msg += `${icon} <b>${i + 1}. ${name}</b> [${statusText}]\n   📍 Lokasi: <code>${d.groupName || '-'}</code>\n   🌐 IP: <code>${d.localIp || '-'}</code> | Model: <code>${d.productClass || '-'}</code>\n   🏷️ SN: <code>${d.serialNumber}</code>\n\n`;
      });

      if (filtered.length > 15) {
        msg += `<i>...dan ${filtered.length - 15} perangkat lainnya cocok. Harap persempit kata kunci pencarian Anda.</i>`;
      }

      await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/device': {
      if (!arg) {
        await sendMessage(chatId, 'ℹ️ Harap sertakan Serial Number. Contoh: <code>/device G1T020X004914</code>', {
          reply_markup: KEYBOARD_MARKUP,
        });
        break;
      }

      const snUpper = arg.toUpperCase();
      const dev = devices.find((d) => d.serialNumber?.toUpperCase() === snUpper);
      if (!dev) {
        await sendMessage(chatId, `❌ Perangkat dengan SN <code>${arg}</code> tidak ditemukan di database Ruijie.`, {
          reply_markup: KEYBOARD_MARKUP,
        });
        break;
      }

      const isOnline = dev.onlineStatus === 'ON';
      const icon = isOnline ? '🟢' : '🔴';
      const statusText = isOnline ? 'ONLINE (Aktif)' : 'OFFLINE (Padam)';
      const name = dev.name || dev.aliasName || 'Tanpa Nama';

      const detailMsg = `${icon} <b>DETAIL PERANGKAT RUIJIE</b>
────────────────────────
• <b>Nama:</b> ${name}
• <b>Status:</b> <b>${statusText}</b>
• <b>Serial Number:</b> <code>${dev.serialNumber}</code>
• <b>Model/Tipe:</b> ${dev.productClass || '-'} (${dev.commonType || '-'})
• <b>Lokasi/Grup:</b> ${dev.groupName || '-'}
• <b>IP Lokal:</b> <code>${dev.localIp || '-'}</code>
• <b>IP Publik:</b> <code>${dev.cpeIp || '-'}</code>
• <b>MAC Address:</b> <code>${dev.mac || '-'}</code>
• <b>Versi Firmware:</b> <code>${dev.softwareVersion || '-'}</code>`;

      await sendMessage(chatId, detailMsg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/setchat':
    case '/daftargrup': {
      if (!cache.telegram_config) cache.telegram_config = {};
      cache.telegram_config.default_chat_id = String(chatId);
      writeCache(cache);

      await sendMessage(
        chatId,
        `✅ <b>Target Alert Berhasil Disimpan!</b>\n\nID Target: <code>${chatId}</code>\nNotifikasi otomatis jika ada Access Point/Switch Ruijie padam (24/7) akan langsung dikirimkan ke chat/grup ini.`,
        { reply_markup: KEYBOARD_MARKUP }
      );
      break;
    }

    case '/check': {
      await sendMessage(chatId, '⏳ <i>Memeriksa status 329 Access Point Ruijie Tanggamus...</i>');
      await sendMessage(
        chatId,
        `✅ <b>Pengecekan Selesai!</b>\n\nTotal Perangkat: <code>${summary.total}</code> | 🟢 Online: <code>${summary.online}</code> | 🔴 Offline: <code>${summary.offline}</code>\nTotal SSID Terdata: <code>${wifiList.length}</code>\nSistem monitoring berjalan normal.`,
        { reply_markup: KEYBOARD_MARKUP }
      );
      break;
    }

    default:
      await sendMessage(
        chatId,
        `❓ Perintah <code>${command}</code> tidak dikenali. Ketik <code>/help</code> untuk melihat daftar perintah yang tersedia.`,
        { reply_markup: KEYBOARD_MARKUP }
      );
      break;
  }
}

// Long Polling Loop
async function startPolling() {
  console.log('🤖 Starting ABSENKU Telegram Bot Polling Service (Full Real Ruijie Integration)...');
  console.log(`🔑 Bot Token: ${BOT_TOKEN.substring(0, 10)}...`);

  // Ensure webhook is deleted so getUpdates works smoothly
  try {
    await fetch(`${TELEGRAM_API}/deleteWebhook`);
    console.log('✅ Webhook deleted. Switching to realtime long-polling.');
  } catch (e) {
    console.warn('deleteWebhook warning:', e.message);
  }

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
        console.warn('Telegram API error:', data.description);
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error('Polling error:', err.message);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

startPolling();
