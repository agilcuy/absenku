import cron from 'node-cron'
import { loadConfig } from './commands.mjs'
import { getAttendanceRecapData, getTodayJakarta, isTodayHoliday } from './db.mjs'

// Helper broadcast pesan ke seluruh grup terdaftar
export async function broadcastToGroups(sock, messageText) {
  const cfg = loadConfig()
  const groups = cfg.targetGroups || []

  if (groups.length === 0) {
    console.log('ℹ️ [CRON] Tidak ada grup WhatsApp yang terdaftar untuk menerima broadcast.')
    return
  }

  console.log(`📢 [CRON] Mengirim broadcast ke ${groups.length} grup WhatsApp...`)
  for (const groupJid of groups) {
    try {
      await sock.sendMessage(groupJid, { text: messageText })
      console.log(`   ✅ Terkirim ke grup: ${groupJid}`)
    } catch (err) {
      console.error(`   ❌ Gagal mengirim ke grup ${groupJid}:`, err?.message || err)
    }
  }
}

// Inisialisasi jadwal Cron (Zona Waktu: Asia/Jakarta)
export function initCronJobs(sock) {
  console.log('⏰ [CRON] Menjadwalkan pengingat otomatis presensi ABSENKU (Asia/Jakarta)...')

  // 1. Pukul 07:00 WIB (Senin s.d Jumat) - Pengingat Masuk
  cron.schedule(
    '0 7 * * 1-5',
    async () => {
      try {
        console.log('⏰ [CRON] Menjalankan pengingat 07:00 WIB...')
        const holiday = await isTodayHoliday()
        if (holiday) {
          console.log(`ℹ️ [CRON] Hari ini libur (${holiday}), melewati pengingat pagi.`)
          return
        }

        const msg = `🌅 *SELAMAT PAGI REKAN-REKAN PKL!*
Hari ini: *${getTodayJakarta()}*

Presensi masuk *ABSENKU* telah dibuka. Harap perhatikan hal-hal berikut:
1. Pastikan Anda sudah tiba di lokasi penugasan PKL (radius 200m).
2. Aktifkan izin Lokasi (GPS) dan Kamera di browser HP Anda.
3. Lakukan swafoto langsung di lokasi sebelum batas waktu (pukul 08:30 WIB) agar tercatat *Tepat Waktu*.

Semangat menjalankan kegiatan PKL hari ini dan jaga selalu kedisiplinan! 🚀`

        await broadcastToGroups(sock, msg)
      } catch (e) {
        console.error('Error in cron 07:00:', e)
      }
    },
    { timezone: 'Asia/Jakarta' }
  )

  // 2. Pukul 08:35 WIB (Senin s.d Jumat) - Peringatan Belum Absen & Terlambat
  cron.schedule(
    '35 8 * * 1-5',
    async () => {
      try {
        console.log('⏰ [CRON] Menjalankan pengecekan keterlambatan 08:35 WIB...')
        const holiday = await isTodayHoliday()
        if (holiday) return

        const recap = await getAttendanceRecapData()
        if (recap.belumAbsenList.length === 0) {
          const msg = `👏 *APRESIASI KEHADIRAN*
Luar biasa! Seluruh peserta PKL (*${recap.totalStudents} siswa*) telah melakukan absensi masuk sebelum batas waktu. Tetap pertahankan kedisiplinan!`
          await broadcastToGroups(sock, msg)
          return
        }

        let msg = `⚠️ *PERINGATAN: BATAS WAKTU ABSENSI TELAH BERAKHIR*
Waktu presensi tepat waktu (08:30 WIB) telah ditutup.

🔴 *Daftar Siswa Terdeteksi Belum Absen Masuk:*`

        recap.belumAbsenList.forEach((s, idx) => {
          msg += `\n${idx + 1}. *${s.name}* (${s.className}) - ${s.place}`
        })

        msg += `\n\n📢 *Segera lakukan absensi masuk sekarang* (status akan tercatat *Terlambat*). Jika berhalangan karena izin atau sakit, silakan ajukan surat permohonan melalui menu Pengajuan Izin di website.`

        await broadcastToGroups(sock, msg)
      } catch (e) {
        console.error('Error in cron 08:35:', e)
      }
    },
    { timezone: 'Asia/Jakarta' }
  )

  // 3. Pukul 16:30 WIB (Senin s.d Jumat) - Pengingat Absensi Pulang & Logbook Jurnal
  cron.schedule(
    '30 16 * * 1-5',
    async () => {
      try {
        console.log('⏰ [CRON] Menjalankan pengingat pulang 16:30 WIB...')
        const holiday = await isTodayHoliday()
        if (holiday) return

        const msg = `🏁 *WAKTU PULANG & PENGISIAN JURNAL HARIAN (LOGBOOK)*
Jam operasional PKL hari ini telah selesai.

Diingatkan kepada seluruh rekan PKL untuk:
1. 📸 *Lakukan Presensi Pulang (Check-out)* di website sebelum meninggalkan lokasi penugasan.
2. 📝 *Isi Jurnal Kegiatan Harian (Logbook)* di dashboard dan lampirkan foto dokumentasi kegiatan kerja Anda hari ini agar dapat ditinjau oleh Pembimbing.

Terima kasih atas dedikasi dan kerja kerasnya hari ini. Selamat beristirahat dan sampai jumpa besok! 👋`

        await broadcastToGroups(sock, msg)
      } catch (e) {
        console.error('Error in cron 16:30:', e)
      }
    },
    { timezone: 'Asia/Jakarta' }
  )

  console.log('✅ [CRON] 3 Jadwal pengingat otomatis telah aktif (07:00, 08:35, 16:30 WIB).')
}
