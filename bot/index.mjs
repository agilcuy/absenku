import baileysPackage from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import path from 'path'
import { fileURLToPath } from 'url'
import { handleCommand } from './commands.mjs'
import { initCronJobs } from './cron.mjs'

const makeWASocket = baileysPackage.default || baileysPackage
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileysPackage

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_DIR = path.resolve(__dirname, 'session')

let cronInitialized = false

async function startBot() {
  console.log('───────────────────────────────────────────────────────')
  console.log('🤖  ABSENKU - WHATSAPP BOT SERVICE (BAILEYS MULTI-DEVICE)')
  console.log('───────────────────────────────────────────────────────')
  console.log(`📁 Lokasi sesi login: ${SESSION_DIR}`)

  // 1. Inisialisasi state autentikasi multi-file
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  // 2. Dapatkan versi Baileys terkini
  let version = [2, 3000, 1015901307]
  try {
    const vInfo = await fetchLatestBaileysVersion()
    version = vInfo.version
  } catch {
    // Gunakan fallback versi standar
  }

  // 3. Konfigurasi soket WhatsApp
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }), // Heningkan log verbose agar terminal bersih
    printQRInTerminal: false, // Kita cetak manual dengan format rapi
    auth: state,
    browser: ['ABSENKU Bot', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
  })

  // Simpan kredensial setiap ada update token
  sock.ev.on('creds.update', saveCreds)

  // 4. Penanganan status koneksi & QR Code
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('\n📲 SILAKAN SCAN QR CODE DI BAWAH INI DENGAN WHATSAPP ANDA:\n')
      qrcode.generate(qr, { small: true })
      console.log('\n📌 Petunjuk:')
      console.log('1. Buka WhatsApp di smartphone Anda')
      console.log('2. Buka Menu (titik 3 di Android) atau Pengaturan (iOS)')
      console.log('3. Pilih "Perangkat Tertaut" -> "Tautkan Perangkat"')
      console.log('4. Arahkan kamera ke QR Code di atas\n')
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      console.log(`⚠️ Koneksi terputus (Kode status: ${statusCode}). Mencoba menghubungkan kembali: ${shouldReconnect}`)

      if (shouldReconnect) {
        setTimeout(startBot, 4000)
      } else {
        console.log('❌ Anda telah logout dari sesi WhatsApp. Hapus folder "bot/session" jika ingin menghubungkan nomor baru.')
      }
    } else if (connection === 'open') {
      console.log('\n=======================================================')
      console.log('🎉 BOT WHATSAPP ABSENKU BERHASIL TERHUBUNG!')
      console.log(`📱 Nomor Bot: ${sock.user?.id?.split(':')[0] || 'Terhubung'}`)
      console.log('💬 Siap menerima perintah di Grup WhatsApp:')
      console.log('   - Ketik "!daftargrup" di dalam grup untuk mendaftarkan grup')
      console.log('   - Ketik "!rekap" untuk melihat kehadiran hari ini')
      console.log('   - Ketik "!belum" untuk melihat siswa yang belum absen')
      console.log('   - Ketik "!help" untuk panduan lengkap')
      console.log('=======================================================\n')

      // Aktifkan scheduler cron hanya sekali saat koneksi terbuka
      if (!cronInitialized) {
        initCronJobs(sock)
        cronInitialized = true
      }
    }
  })

  // 5. Penanganan pesan masuk
  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return

      for (const msg of m.messages) {
        // Jangan respon pesan dari bot itu sendiri
        if (msg.key.fromMe) continue

        const from = msg.key.remoteJid
        if (!from) continue

        const isGroup = from.endsWith('@g.us')
        const senderName = msg.pushName || 'Rekan PKL'

        // Ekstraksi teks pesan
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          ''

        if (!text.trim().startsWith('!')) continue

        console.log(`📩 Pesan perintah diterima: "${text}" dari ${senderName} (${isGroup ? 'Grup' : 'Pribadi'})`)

        await handleCommand(sock, msg, from, text, senderName, isGroup)
      }
    } catch (err) {
      console.error('Error processing incoming message:', err)
    }
  })
}

// Jalankan bot
startBot().catch((err) => {
  console.error('Fatal error starting WhatsApp Bot:', err)
})
