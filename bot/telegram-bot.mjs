import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CACHE_PATH = path.join(ROOT_DIR, 'src', 'data', 'monitoring_cache.json');

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

async function sendPhoto(chatId, photoUrl, caption = '') {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
      }),
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
Bot ini terhubung secara realtime ke sistem NOC ABSENKU.

📌 <b>Informasi Sesi Ini:</b>
• ID Chat Anda: <code>${chatId}</code>
• Total Perangkat Dipantau: <b>${devices.length} Perangkat</b>

📋 <b>Daftar Perintah Tersedia:</b>
• <code>/status</code> — Ringkasan realtime total AP, online, & offline.
• <code>/offline</code> — Daftar seluruh perangkat yang sedang padam/mati.
• <code>/devices [kata kunci]</code> — Cari perangkat berdasarkan nama, IP, atau lokasi.
• <code>/device [SN]</code> — Cek detail teknis perangkat berdasarkan Serial Number.
• <code>/wifi</code> — Informasi konfigurasi SSID Wi-Fi resmi instansi.
• <code>/qrcode [SSID]</code> — Barcode QR Code Wi-Fi siap scan kamera HP.
• <code>/setchat</code> — Daftarkan chat/grup ini sebagai target notifikasi otomatis padam.
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
      offlines.slice(0, 25).forEach((d, i) => {
        const name = d.name || d.aliasName || 'Tanpa Nama';
        const group = d.groupName || '-';
        const ip = d.localIp || '-';
        msg += `<b>${i + 1}. ${name}</b>\n   📍 Lokasi: <code>${group}</code>\n   🌐 IP: <code>${ip}</code> | SN: <code>${d.serialNumber}</code>\n\n`;
      });

      if (offlines.length > 25) {
        msg += `<i>...dan ${offlines.length - 25} perangkat lainnya padam.</i>\nKetik <code>/devices [nama/lokasi]</code> untuk mencari perangkat tertentu.`;
      }

      await sendMessage(chatId, msg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/devices': {
      if (!arg) {
        await sendMessage(chatId, 'ℹ️ Masukkan kata kunci pencarian. Contoh: <code>/devices disnaker</code> atau <code>/devices 192.168.131</code>', { reply_markup: KEYBOARD_MARKUP });
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
        await sendMessage(chatId, `🔍 Tidak ditemukan perangkat Ruijie dengan kata kunci: <b>"${arg}"</b>.`, { reply_markup: KEYBOARD_MARKUP });
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
        await sendMessage(chatId, 'ℹ️ Harap sertakan Serial Number. Contoh: <code>/device G1T020X004914</code>', { reply_markup: KEYBOARD_MARKUP });
        break;
      }

      const snUpper = arg.toUpperCase();
      const dev = devices.find((d) => d.serialNumber?.toUpperCase() === snUpper);
      if (!dev) {
        await sendMessage(chatId, `❌ Perangkat dengan SN <code>${arg}</code> tidak ditemukan di database Ruijie.`, { reply_markup: KEYBOARD_MARKUP });
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

    case '/wifi': {
      const wifiMsg = `📶 <b>INFORMASI JARINGAN WI-FI RESMI</b>
────────────────────────
1. <b>SSID:</b> <code>DISKOMINFO_TANGGAMUS_PKL</code>
   <b>Keamanan:</b> WPA2-PSK
   <b>Lokasi:</b> Gedung Kominfo Tanggamus

2. <b>SSID:</b> <code>GENZ_TECH_INTERN</code>
   <b>Keamanan:</b> WPA2-PSK
   <b>Lokasi:</b> DeryGarage Bernung

────────────────────────
Ketik <code>/qrcode</code> untuk meminta Barcode QR Code koneksi otomatis.`;

      await sendMessage(chatId, wifiMsg, { reply_markup: KEYBOARD_MARKUP });
      break;
    }

    case '/qrcode': {
      const ssid = arg || 'DISKOMINFO_TANGGAMUS_PKL';
      const pass = 'TanggamusHebat2026';
      const wifiString = `WIFI:T:WPA;S:${ssid};P:${pass};;`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
        wifiString
      )}`;

      await sendPhoto(
        chatId,
        qrUrl,
        `📶 <b>QR Code Wi-Fi: ${ssid}</b>\n\nArahkan kamera HP Android/iPhone Anda ke barcode ini untuk terhubung otomatis tanpa mengetik kata sandi.`
      );
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
        `✅ <b>Pengecekan Selesai!</b>\n\nTotal Perangkat: <code>${summary.total}</code> | 🟢 Online: <code>${summary.online}</code> | 🔴 Offline: <code>${summary.offline}</code>\nSistem monitoring berjalan normal.`,
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
  console.log('🤖 Starting ABSENKU Telegram Bot Polling Service...');
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
