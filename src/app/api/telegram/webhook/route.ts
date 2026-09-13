import { NextRequest, NextResponse } from 'next/server';
import {
  getTelegramConfig,
  isTelegramUserAuthorized,
  sendTelegramMessage,
  sendTelegramPhoto,
  formatStatusSummary,
  formatOfflineList,
} from '@/lib/telegram';
import { getRuijieDevices, RuijieDevice } from '@/lib/ruijie';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'monitoring_cache.json');

function getCachedMonitoring(): any {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    }
  } catch {
    // silent
  }
  return {};
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // Pastikan ini adalah update pesan teks
    const message = update.message || update.channel_post || update.edited_message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true, note: 'No text message' });
    }

    const chatId = message.chat?.id;
    const userId = message.from?.id || chatId;
    const userName = message.from?.first_name || message.from?.username || 'Teknisi';
    const rawText = message.text.trim();

    if (!rawText.startsWith('/')) {
      return NextResponse.json({ ok: true });
    }

    // 1. Otorisasi Keamanan Pengguna Telegram
    const isAuthorized = isTelegramUserAuthorized(userId);
    if (!isAuthorized) {
      await sendTelegramMessage(
        chatId,
        `⛔ <b>Akses Ditolak</b>\n\nAkun Telegram Anda (ID: <code>${userId}</code>) belum terdaftar di sistem otorisasi teknisi <b>ABSENKU NOC</b>.\n\nSilakan hubungi Administrator untuk mendaftarkan ID Anda.`
      );
      return NextResponse.json({ ok: true, status: 'unauthorized' });
    }

    // Parsing Command & Argumen
    const parts = rawText.split(/\s+/);
    const commandWithBot = parts[0].toLowerCase();
    const command = commandWithBot.split('@')[0]; // Strip @bot_username jika ada
    const arg = parts.slice(1).join(' ').trim();

    // 2. Dispatch Perintah
    switch (command) {
      case '/start':
      case '/help': {
        const cache = getCachedMonitoring();
        if (!cache.telegram_config) cache.telegram_config = {};
        if (!cache.telegram_config.default_chat_id) {
          cache.telegram_config.default_chat_id = String(chatId);
          try {
            fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
          } catch {}
        }

        const welcomeText = `👋 <b>Halo, ${userName}!</b>

Selamat datang di <b>Ruijie NOC Bot — Kabupaten Tanggamus</b>.
Bot ini terhubung secara cloud ke sistem monitoring ABSENKU.

📌 <b>Informasi Chat Ini:</b>
• ID Chat: <code>${chatId}</code>
• Tipe: <i>${message.chat?.type || 'private'}</i>

📋 <b>Daftar Perintah Tersedia:</b>
• <code>/status</code> — Ringkasan realtime total AP, online, & offline.
• <code>/offline</code> — Daftar seluruh perangkat yang sedang padam/mati.
• <code>/devices [keyword]</code> — Cari perangkat berdasarkan nama, IP, atau lokasi.
• <code>/device [SN]</code> — Cek detail teknis perangkat berdasarkan Serial Number.
• <code>/wifi</code> — Informasi konfigurasi SSID Wi-Fi resmi instansi.
• <code>/qrcode [SSID]</code> — Generate QR Code Wi-Fi siap scan untuk HP.
• <code>/setchat</code> — Jadikan chat/grup ini sebagai target penerima alert padam.
• <code>/check</code> — Jalankan pengecekan paksa cloud monitoring saat ini.

🔒 <b>Status Akses:</b> ✅ <i>Terotorisasi (ID: ${userId})</i>`;

        await sendTelegramMessage(chatId, welcomeText);
        break;
      }

      case '/setchat':
      case '/daftargrup': {
        const cache = getCachedMonitoring();
        if (!cache.telegram_config) cache.telegram_config = {};
        cache.telegram_config.default_chat_id = String(chatId);
        try {
          fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
        } catch {}

        await sendTelegramMessage(
          chatId,
          `✅ <b>Target Alert Berhasil Disimpan!</b>\n\nID Target: <code>${chatId}</code>\nNotifikasi otomatis jika ada Access Point/Switch Ruijie padam (24/7) akan langsung dikirimkan ke chat/grup ini.`
        );
        break;
      }

      case '/status': {
        const cache = getCachedMonitoring();
        const workerHealth = cache.worker_health;

        // Ambil data cepat
        const fetchResult = await getRuijieDevices();
        const summaryText = formatStatusSummary(fetchResult.summary, workerHealth);

        await sendTelegramMessage(chatId, summaryText);
        break;
      }

      case '/offline': {
        const fetchResult = await getRuijieDevices();
        const offlineList = fetchResult.devices.filter((d) => d.onlineStatus !== 'ON');
        const text = formatOfflineList(offlineList);

        await sendTelegramMessage(chatId, text);
        break;
      }

      case '/devices': {
        const fetchResult = await getRuijieDevices();
        let devices = fetchResult.devices;

        if (arg) {
          const q = arg.toLowerCase();
          devices = devices.filter(
            (d) =>
              d.name?.toLowerCase().includes(q) ||
              d.groupName?.toLowerCase().includes(q) ||
              d.localIp?.toLowerCase().includes(q) ||
              d.serialNumber?.toLowerCase().includes(q)
          );
        }

        if (devices.length === 0) {
          await sendTelegramMessage(chatId, `🔍 Tidak ditemukan perangkat dengan kata kunci: <b>"${arg}"</b>.`);
          break;
        }

        const list = devices
          .slice(0, 15)
          .map((d, i) => {
            const statusIcon = d.onlineStatus === 'ON' ? '🟢' : '🔴';
            return `${i + 1}. ${statusIcon} <b>${d.name}</b>\n   🏢 ${d.groupName || '-'} | IP: <code>${d.localIp || '-'}</code>\n   SN: <code>${d.serialNumber}</code>`;
          })
          .join('\n\n');

        const header = arg
          ? `🔍 <b>Hasil Pencarian ("${arg}") — ${devices.length} Perangkat:</b>\n──────────────────────\n`
          : `📶 <b>Daftar Perangkat (${devices.length} Total):</b>\n──────────────────────\n`;

        const extra = devices.length > 15 ? `\n\n<i>...dan ${devices.length - 15} perangkat lainnya. Gunakan kata kunci lebih spesifik: /devices &lt;nama/IP&gt;</i>` : '';

        await sendTelegramMessage(chatId, `${header}${list}${extra}`);
        break;
      }

      case '/device': {
        if (!arg) {
          await sendTelegramMessage(
            chatId,
            'ℹ️ <b>Format Perintah:</b>\nKetik: <code>/device &lt;Serial_Number&gt;</code>\nContoh: <code>/device 1234567890</code>'
          );
          break;
        }

        const fetchResult = await getRuijieDevices();
        const found = fetchResult.devices.find(
          (d) =>
            d.serialNumber?.toLowerCase() === arg.toLowerCase() ||
            d.localIp === arg ||
            d.mac?.toLowerCase() === arg.toLowerCase()
        );

        if (!found) {
          await sendTelegramMessage(chatId, `❌ Perangkat dengan SN/IP <code>${arg}</code> tidak ditemukan di Ruijie Cloud Tanggamus.`);
          break;
        }

        const isOnline = found.onlineStatus === 'ON';
        const detailMsg = `📱 <b>DETAIL PERANGKAT RUIJIE</b>
──────────────────────
<b>Nama:</b> <code>${found.name}</code>
<b>Status:</b> ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
${found.offlineReason ? `<b>Alasan Offline:</b> <i>${found.offlineReason}</i>\n` : ''}
<b>Tipe:</b> ${found.commonType || 'Access Point'} (${found.productType || '-'})
<b>Model / Class:</b> ${found.productClass || '-'}
<b>Lokasi / Site:</b> 🏢 <b>${found.groupName || 'Tanggamus'}</b>
<b>IP Lokal:</b> <code>${found.localIp || '-'}</code>
<b>CPE IP Publik:</b> <code>${found.cpeIp || '-'}</code>
<b>MAC Address:</b> <code>${found.mac || '-'}</code>
<b>Serial Number:</b> <code>${found.serialNumber}</code>
<b>Versi Firmware:</b> <code>${found.softwareVersion || '-'}</code>
──────────────────────`;

        await sendTelegramMessage(chatId, detailMsg);
        break;
      }

      case '/wifi': {
        const wifiMsg = `📶 <b>INFORMASI JARINGAN WI-FI RESMI</b>
──────────────────────
1. <b>SSID:</b> <code>DISKOMINFO_TANGGAMUS_PKL</code>
   <b>Keamanan:</b> WPA2-PSK
   <b>Lokasi:</b> Gedung Kominfo Tanggamus

2. <b>SSID:</b> <code>GENZ_TECH_INTERN</code>
   <b>Keamanan:</b> WPA2-PSK
   <b>Lokasi:</b> DeryGarage Bernung

──────────────────────
Ketik <code>/qrcode</code> untuk meminta QR Code koneksi instan Wi-Fi.`;

        await sendTelegramMessage(chatId, wifiMsg);
        break;
      }

      case '/qrcode': {
        const ssid = arg || 'DISKOMINFO_TANGGAMUS_PKL';
        const pass = 'TanggamusHebat2026';
        const wifiString = `WIFI:T:WPA;S:${ssid};P:${pass};;`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
          wifiString
        )}`;

        await sendTelegramPhoto(
          chatId,
          qrUrl,
          `📶 <b>QR Code Wi-Fi: ${ssid}</b>\n\nArahkan kamera HP Android/iPhone Anda ke gambar ini untuk terhubung otomatis tanpa mengetik kata sandi.`
        );
        break;
      }

      case '/check': {
        await sendTelegramMessage(chatId, '⏳ <i>Memulai pengecekan paksa status Ruijie Cloud Tanggamus...</i>');

        const cronUrl = new URL('/api/cron/ruijie-monitor?source=telegram_bot', req.url).toString();
        const res = await fetch(cronUrl);
        const data = await res.json();

        if (data.success) {
          const summary = data.summary || {};
          await sendTelegramMessage(
            chatId,
            `✅ <b>Pengecekan Selesai!</b>\n\nTotal: <code>${summary.total}</code> | 🟢 Online: <code>${summary.online}</code> | 🔴 Offline: <code>${summary.offline}</code>\nAlerts dikirim: ${data.alerts_sent?.length || 0}`
          );
        } else {
          await sendTelegramMessage(chatId, `⚠️ Gagal menjalankan pengecekan: ${data.error}`);
        }
        break;
      }

      default:
        await sendTelegramMessage(
          chatId,
          `❓ Perintah <code>${command}</code> tidak dikenali. Ketik <code>/help</code> untuk melihat panduan.`
        );
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook Error]:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
