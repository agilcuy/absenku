import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getAttendanceRecapData, getNowJakartaTime, getTodayJakarta, isTodayHoliday } from './db.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = path.resolve(__dirname, 'config.json')

// Helper untuk membaca konfigurasi grup
export function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const initial = { targetGroups: [] }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(initial, null, 2), 'utf-8')
      return initial
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    console.error('Error loading config:', e)
    return { targetGroups: [] }
  }
}

// Helper untuk menyimpan konfigurasi grup
export function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error saving config:', e)
  }
}

// Handler perintah chat
export async function handleCommand(sock, msg, from, text, senderName, isGroup) {
  const clean = text.trim().toLowerCase()

  // 1. Perintah: !help atau !menu
  if (clean === '!help' || clean === '!menu') {
    const reply = `🤖 *ABSENKU - BOT PRESENSI PKL*
Halo kak *${senderName}*! Berikut adalah daftar perintah yang tersedia:

📌 *PERINTAH UTAMA:*
• *!rekap* / *!absen* : Melihat ringkasan kehadiran hari ini per instansi PKL
• *!belum* : Melihat daftar siswa yang belum melakukan absen masuk
• *!link* : Mendapatkan tautan login ke aplikasi ABSENKU

⚙️ *PENGATURAN GRUP (Khusus di Grup WA):*
• *!daftargrup* : Daftarkan grup ini untuk menerima pengingat otomatis (07:00, 08:35, 16:30 WIB)
• *!statusgrup* : Cek status apakah grup ini terdaftar untuk broadcast
• *!hapusgrup* : Hentikan pengingat otomatis untuk grup ini

_Bot ini terhubung langsung ke sistem database ABSENKU realtime._`

    await sock.sendMessage(from, { text: reply }, { quoted: msg })
    return
  }

  // 2. Perintah: !daftargrup
  if (clean === '!daftargrup' || clean === '!setgrup') {
    if (!isGroup) {
      await sock.sendMessage(from, { text: '⚠️ Perintah *!daftargrup* hanya dapat digunakan di dalam Grup WhatsApp!' }, { quoted: msg })
      return
    }

    const cfg = loadConfig()
    if (!cfg.targetGroups.includes(from)) {
      cfg.targetGroups.push(from)
      saveConfig(cfg)
      await sock.sendMessage(
        from,
        {
          text: `✅ *GRUP BERHASIL DIDAFTARKAN!*

Grup ini telah aktif menerima notifikasi terjadwal dari *ABSENKU*:
⏰ *07:00 WIB* : Pengingat Pembukaan Presensi Masuk
⚠️ *08:35 WIB* : Peringatan Keterlambatan & Daftar Siswa Belum Absen
🏁 *16:30 WIB* : Pengingat Presensi Pulang & Pengisian Logbook Jurnal Harian

Terima kasih atas kerja samanya! 🚀`,
        },
        { quoted: msg }
      )
    } else {
      await sock.sendMessage(from, { text: 'ℹ️ Grup ini sudah terdaftar sebelumnya dalam daftar pengingat otomatis ABSENKU.' }, { quoted: msg })
    }
    return
  }

  // 3. Perintah: !statusgrup
  if (clean === '!statusgrup') {
    if (!isGroup) {
      await sock.sendMessage(from, { text: '⚠️ Perintah *!statusgrup* hanya berlaku di dalam Grup WhatsApp.' }, { quoted: msg })
      return
    }
    const cfg = loadConfig()
    const isRegistered = cfg.targetGroups.includes(from)
    const reply = isRegistered
      ? '🟢 *Status Grup: AKTIF*\nGrup ini terdaftar dan akan menerima broadcast pengingat presensi otomatis.'
      : '⚪ *Status Grup: BELUM TERDAFTAR*\nKetik *!daftargrup* jika ingin mengaktifkan pengingat presensi otomatis di grup ini.'
    await sock.sendMessage(from, { text: reply }, { quoted: msg })
    return
  }

  // 4. Perintah: !hapusgrup
  if (clean === '!hapusgrup') {
    if (!isGroup) return
    const cfg = loadConfig()
    if (cfg.targetGroups.includes(from)) {
      cfg.targetGroups = cfg.targetGroups.filter((g) => g !== from)
      saveConfig(cfg)
      await sock.sendMessage(from, { text: '🛑 *PENGINGAT DINONAKTIFKAN*\nGrup ini telah dihapus dari daftar broadcast otomatis ABSENKU.' }, { quoted: msg })
    } else {
      await sock.sendMessage(from, { text: 'ℹ️ Grup ini memang belum terdaftar dalam daftar pengingat.' }, { quoted: msg })
    }
    return
  }

  // 5. Perintah: !link
  if (clean === '!link' || clean === '!web') {
    const webUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const reply = `🌐 *PORTAL APLIKASI ABSENKU*
Silakan akses website resmi untuk melakukan absensi, izin/sakit, dan mengisi logbook jurnal:

🔗 *Link Web:* ${webUrl}
📱 Buka via browser HP dengan GPS & Kamera aktif!`
    await sock.sendMessage(from, { text: reply }, { quoted: msg })
    return
  }

  // 6. Perintah: !rekap atau !absen
  if (clean === '!rekap' || clean === '!absen' || clean === '!status') {
    await sock.sendMessage(from, { text: '⏳ Mengambil data presensi terkini dari database...' }, { quoted: msg })
    try {
      const holiday = await isTodayHoliday()
      const recap = await getAttendanceRecapData()
      const timeNow = getNowJakartaTime()

      let textReport = `📊 *REKAP PRESENSI SISWA PKL - ABSENKU*
📅 Tanggal: *${recap.todayStr}* (${timeNow})
${holiday ? `🎉 *Hari Libur:* ${holiday}\n` : ''}
👥 Total Siswa Aktif: *${recap.totalStudents}*
🟢 Hadir Tepat Waktu: *${recap.onTimeCount}*
🟡 Hadir Terlambat: *${recap.lateCount}*
🔵 Izin: *${recap.izinCount}*
🟣 Sakit: *${recap.sakitCount}*
🔴 Belum Absen: *${recap.belumCount}*

──────────────────────
🏢 *RINCIAN PER TEMPAT PENUGASAN PKL:*`

      for (const [placeName, pData] of Object.entries(recap.byPlace)) {
        textReport += `\n\n📌 *${placeName.toUpperCase()}* (${pData.total} Siswa)`
        textReport += `\n• Hadir: ${pData.onTime + pData.late} | Izin: ${pData.izin} | Sakit: ${pData.sakit} | Belum: ${pData.belum}`

        // Rincian siswa
        pData.students.forEach((s) => {
          let emoji = '⚪'
          let statusText = 'Belum Absen'
          if (s.status === 'on_time') {
            emoji = '🟢'
            statusText = `Hadir Tepat Waktu (${s.checkInTime})`
          } else if (s.status === 'late') {
            emoji = '🟡'
            statusText = `Terlambat (${s.checkInTime})`
          } else if (s.status === 'izin') {
            emoji = '🔵'
            statusText = 'Izin'
          } else if (s.status === 'sakit') {
            emoji = '🟣'
            statusText = 'Sakit'
          }
          textReport += `\n  ${emoji} ${s.name} : _${statusText}_`
        })
      }

      textReport += `\n\n──────────────────────\n_Ketik *!belum* untuk melihat nama-nama yang belum absen masuk._`
      await sock.sendMessage(from, { text: textReport }, { quoted: msg })
    } catch (err) {
      console.error('Error in !rekap:', err)
      await sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat mengambil rekap presensi. Pastikan koneksi database aktif.' }, { quoted: msg })
    }
    return
  }

  // 7. Perintah: !belum
  if (clean === '!belum' || clean === '!alpha') {
    try {
      const recap = await getAttendanceRecapData()
      if (recap.belumAbsenList.length === 0) {
        await sock.sendMessage(
          from,
          { text: `🎉 *Luar Biasa!* Seluruh siswa PKL (${recap.totalStudents} siswa) sudah melakukan presensi masuk hari ini.` },
          { quoted: msg }
        )
        return
      }

      let textUnchecked = `⚠️ *DAFTAR SISWA BELUM ABSEN MASUK*
📅 Tanggal: *${recap.todayStr}* (${getNowJakartaTime()})
🔴 Jumlah: *${recap.belumAbsenList.length} dari ${recap.totalStudents} Siswa*

Berikut nama-nama siswa yang belum terdeteksi presensi:`

      recap.belumAbsenList.forEach((s, idx) => {
        textUnchecked += `\n${idx + 1}. *${s.name}* (${s.className})\n   📍 Instansi: ${s.place}`
      })

      textUnchecked += `\n\n📢 *Peringatan:* Harap segera lakukan absensi masuk melalui website sebelum batas waktu berakhir!`
      await sock.sendMessage(from, { text: textUnchecked }, { quoted: msg })
    } catch (err) {
      console.error('Error in !belum:', err)
      await sock.sendMessage(from, { text: '❌ Terjadi kesalahan saat memeriksa daftar kehadiran siswa.' }, { quoted: msg })
    }
    return
  }
}
