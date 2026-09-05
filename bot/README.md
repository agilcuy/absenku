# 🤖 Bot WhatsApp ABSENKU - Panduan Penggunaan

Modul bot WhatsApp otomatis untuk sistem presensi PKL **ABSENKU** berbasis library `@whiskeysockets/baileys`.

---

## 🚀 Cara Menjalankan Bot

1. Buka terminal pada folder proyek `ABSENKU`, lalu jalankan:
   ```bash
   npm run bot
   ```
2. Terminal akan menampilkan **QR Code**.
3. Buka aplikasi **WhatsApp** di smartphone:
   * Masuk ke **Menu / Setelan** $\rightarrow$ **Perangkat Tertaut (Linked Devices)**.
   * Pilih **Tautkan Perangkat** dan arahkan kamera HP ke QR Code di terminal.
4. Setelah berhasil scan, bot akan menampilkan pesan **"BOT WHATSAPP ABSENKU BERHASIL TERHUBUNG!"**.

---

## 👥 Cara Memasukkan Bot ke Grup WhatsApp

1. Masukkan nomor WhatsApp yang dijadikan bot ke dalam **Grup WhatsApp Siswa / Pembimbing**.
2. Di dalam grup WhatsApp tersebut, ketik perintah:
   ```text
   !daftargrup
   ```
3. Bot akan membalas bahwa grup berhasil didaftarkan. Mulai saat itu, grup tersebut akan otomatis menerima pengingat presensi terjadwal.

---

## ⏰ Jadwal Pengingat Otomatis (Cron WIB)

Bot secara otomatis mengirim pesan ke seluruh grup terdaftar setiap hari kerja (Senin - Jumat):

* **07:00 WIB** : Pengingat presensi masuk telah dibuka & panduan selfie di lokasi penugasan.
* **08:35 WIB** : Peringatan batas waktu tepat waktu selesai beserta daftar siswa yang belum melakukan check-in.
* **16:30 WIB** : Pengingat presensi pulang (check-out) dan pengisian Jurnal Kegiatan Harian (Logbook).

---

## 💬 Daftar Perintah Chat (Commands)

Perintah ini dapat diketik kapan saja di dalam grup WhatsApp maupun di chat pribadi ke nomor bot:

| Perintah | Fungsi |
| :--- | :--- |
| `!rekap` / `!absen` | Menampilkan rekapitulasi kehadiran hari ini per instansi PKL (GEN-Z TECH, Kominfo Tanggamus, dll). |
| `!belum` | Menampilkan daftar nama siswa yang belum melakukan absen masuk hari ini. |
| `!daftargrup` | Mendaftarkan grup WA saat ini untuk menerima pengingat otomatis. |
| `!statusgrup` | Mengecek apakah grup ini sudah terdaftar untuk menerima broadcast. |
| `!hapusgrup` | Menghentikan pengingat otomatis untuk grup ini. |
| `!link` | Mengirimkan tautan website aplikasi ABSENKU. |
| `!help` / `!menu` | Menampilkan panduan bantuan perintah. |

---

## 🔒 Keamanan Sesi

* Sesi login disimpan secara lokal di folder `bot/session/`.
* Folder `bot/session/` dan `bot/config.json` telah dimasukkan ke dalam `.gitignore` sehingga data rahasia nomor WhatsApp Anda tidak akan terunggah ke repositori git.
