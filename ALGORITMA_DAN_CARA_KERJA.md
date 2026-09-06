# 📘 DOKUMENTASI LENGKAP: ALGORITMA & CARA KERJA SISTEM ABSENKU PKL
### (Dashboard Siswa, Pembimbing PKL, dan Superadmin)

Dokumen ini menjelaskan secara menyeluruh arsitektur, algoritma, logika bisnis, formula perhitungan, serta alur kerja (*workflow*) yang diterapkan pada sistem **ABSENKU** untuk ketiga peran pengguna: **Siswa**, **Pembimbing PKL**, dan **Superadmin**.

---

## DAFTAR ISI
1. [Arsitektur Umum & Sistem Keamanan (RBAC)](#1-arsitektur-umum--sistem-keamanan-rbac)
2. [Dashboard Siswa (Portal Peserta Didik PKL)](#2-dashboard-siswa-portal-peserta-didik-pkl)
   - [2.1. Algoritma Geofencing & Radius GPS (Haversine Formula)](#21-algoritma-geofencing--radius-gps-haversine-formula)
   - [2.2. Algoritma Validasi Jam Kehadiran (Masuk & Pulang)](#22-algoritma-validasi-jam-kehadiran-masuk--pulang)
   - [2.3. Algoritma Perhitungan Waktu Lembur (Overtime)](#23-algoritma-perhitungan-waktu-lembur-overtime)
   - [2.4. Algoritma Anti-Fraud Swafoto & Watermarking Otomatis](#24-algoritma-anti-fraud-swafoto--watermarking-otomatis)
   - [2.5. Algoritma Streak Kedisiplinan & Gamifikasi](#25-algoritma-streak-kedisiplinan--gamifikasi)
   - [2.6. Fitur & Menu Lengkap Siswa (Quick Action Hub)](#26-fitur--menu-lengkap-siswa-quick-action-hub)
3. [Dashboard Pembimbing PKL (Portal Mentor Instansi)](#3-dashboard-pembimbing-pkl-portal-mentor-instansi)
   - [3.1. Algoritma Multi-Tenant Instansi (Data Scoping)](#31-algoritma-multi-tenant-instansi-data-scoping)
   - [3.2. Monitoring Presensi & Status Online Siswa Realtime](#32-monitoring-presensi--status-online-siswa-realtime)
   - [3.3. Manajemen Akun Siswa & Reset Password Instan](#33-manajemen-akun-siswa--reset-password-instan)
   - [3.4. Workflow Evaluasi & Nilai Jurnal Harian (Logbook)](#34-workflow-evaluasi--nilai-jurnal-harian-logbook)
   - [3.5. Rekap Lembur & Hak Koreksi Durasi Lembur](#35-rekap-lembur--hak-koreksi-durasi-lembur)
   - [3.6. Manajemen Jam Kerja & Batas Lembur Instansi](#36-manajemen-jam-kerja--batas-lembur-instansi)
4. [Dashboard Superadmin (Portal Administrator Pusat)](#4-dashboard-superadmin-portal-administrator-pusat)
   - [4.1. Global Access & Master Control (God Mode)](#41-global-access--master-control-god-mode)
   - [4.2. Manajemen Master Data (Siswa, Mentor, Tempat PKL)](#42-manajemen-master-data-siswa-mentor-tempat-pkl)
   - [4.3. Monitoring Operasional & Absensi Lintas Instansi](#43-monitoring-operasional--absensi-lintas-instansi)
   - [4.4. Rekap Lembur Terpusat & Ekspor Laporan CSV](#44-rekap-lembur-terpusat--ekspor-laporan-csv)
   - [4.5. Sistem Keamanan Audit Log & Pelacakan Login](#45-sistem-keamanan-audit-log--pelacakan-login)
5. [Tabel Matriks Hak Akses Antar Peran](#5-tabel-matriks-hak-akses-antar-peran)

---

## 1. Arsitektur Umum & Sistem Keamanan (RBAC)

ABSENKU menggunakan pendekatan **Role-Based Access Control (RBAC)** berlapis yang mengamankan rute frontend, proses middleware server, hingga query basis data PostgreSQL:

```
                  [ USER AKSES APLIKASI ]
                             │
                             ▼
                [ Next.js Middleware (proxy.ts) ]
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     [ Belum Login ]   [ Sesi Valid ]   [ Data Tidak Lengkap ]
            │                │                │
            ▼                ▼                ▼
     Redirect /login   Cek Role User    Redirect /onboarding
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
 [ Role: student ]   [ Role: pembimbing ]  [ Role: superadmin ]
        │                    │                    │
        ▼                    ▼                    ▼
   /dashboard           /pembimbing             /admin
```

### Mekanisme Proteksi:
1. **Middleware Server ([proxy.ts](file:///d:/ABSENKU/proxy.ts))**:
   - Memeriksa token otentikasi Supabase pada setiap request HTTP.
   - Mencegah *escalation privilege*: Siswa yang mencoba mengetikkan `/admin` atau `/pembimbing` akan otomatis dipantulkan kembali ke `/dashboard`.
   - Mengarahkan akun siswa baru yang belum melengkapi data identitas (kelas, jurusan, no HP, tempat PKL) ke halaman `/onboarding`.
2. **Backend API Route Handlers**:
   - Setiap endpoint API di `/api/...` memanggil helper `getCallerAccess(user)` untuk memverifikasi role aktual dari database Supabase menggunakan `Service Role Key` (kebal manipulasi client).
3. **Database RLS (Row Level Security)**:
   - Data diproteksi langsung di level baris tabel PostgreSQL sehingga pengguna hanya dapat membaca atau memodifikasi data sesuai perannya.

---

## 2. Dashboard Siswa (Portal Peserta Didik PKL)

Dashboard Siswa (`/dashboard`) dirancang sebagai pusat operasional harian peserta magang/PKL dengan desain ergonomis, responsif, dan fokus pada presensi yang cepat dan anti-kecurangan.

---

### 2.1. Algoritma Geofencing & Radius GPS (Haversine Formula)

Agar siswa tidak dapat melakukan absensi palsu dari rumah atau luar area penugasan, sistem menerapkan **Haversine Formula** untuk menghitung jarak nyata antara koordinat GPS perangkat siswa dengan titik koordinat resmi kantor PKL:

#### Rumus Matematis:
$$\Delta\phi = \text{lat}_2 - \text{lat}_1, \quad \Delta\lambda = \text{lng}_2 - \text{lng}_1$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cdot \cos(\phi_2) \cdot \sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$d = R \cdot c$$

*Keterangan:*
- $R$ = Radius bumi ($6.371.000\text{ meter}$).
- $(\text{lat}_1, \text{lng}_1)$ = Koordinat GPS aktual dari browser/HP siswa.
- $(\text{lat}_2, \text{lng}_2)$ = Koordinat resmi tempat PKL penugasan siswa.
- $d$ = Jarak nyata dalam satuan meter.

#### Logika Keputusan:
```
JIKA d <= Radius_Kantor (default 200 meter):
    Status: "DI DALAM RADIUS" (Absensi DIPERBOLEHKAN)
SELAIN ITU:
    Status: "DI LUAR RADIUS" (Absensi DITOLAK dengan pesan error jarak)
```

---

### 2.2. Algoritma Validasi Jam Kehadiran (Masuk & Pulang)

Sistem menggunakan waktu acuan **WIB (Waktu Indonesia Barat / Asia/Jakarta)** yang disinkronkan dari server, bukan dari jam lokal HP siswa (mencegah siswa memundurkan jam HP):

```
       06:00 WIB           08:30 WIB            16:30 WIB          17:30 WIB           24:00 WIB
──────────┬───────────────────┬─────────────────────┬───────────────────┬───────────────────┬──────►
  Absen   │   Absen Masuk:    │    Jam Bekerja      │   Absen Pulang    │   Absen Pulang    │ Absen
  Belum   │   TEPAT WAKTU     │   (Absen Masuk:     │     Reguler       │     + LEMBUR      │ Selesai
  Dibuka  │                   │    TERLAMBAT)       │                   │   (Hitung Menit)  │
```

1. **Absensi Masuk**:
   - **< 06:00 WIB**: Tombol dikunci (Belum waktunya masuk).
   - **06:00 s/d 08:30 WIB**: Absensi dibuka $\rightarrow$ Status kehadiran: **`on_time` (Tepat Waktu)**.
   - **> 08:30 WIB**: Absensi dibuka $\rightarrow$ Status kehadiran: **`late` (Terlambat)**.
2. **Absensi Pulang**:
   - **< Jam Kerja Berakhir (16:30 WIB)**: Tombol dikunci (Belum waktunya pulang).
   - **16:30 s/d Batas Lembur (17:30 WIB)**: Absensi pulang normal (tanpa jam lembur).
   - **17:30 s/d 24:00 WIB**: Absensi pulang lembur (dihitung durasi selisih lemburnya).

---

### 2.3. Algoritma Perhitungan Waktu Lembur (Overtime)

Perhitungan lembur dieksekusi secara otomatis pada saat siswa menekan tombol **Absen Pulang**:

#### Formula:
```
Waktu_Checkout = Jam saat siswa klik Absen Pulang
Waktu_Mulai_Lembur = Setting tempat PKL (default: 17:30 WIB)

JIKA Waktu_Checkout > Waktu_Mulai_Lembur:
    Selisih_Detik = Waktu_Checkout - Waktu_Mulai_Lembur
    overtime_minutes = FLOOR(Selisih_Detik / 60)
    is_overtime = TRUE
SELAIN ITU:
    overtime_minutes = 0
    is_overtime = FALSE
```

#### Contoh Kasus:
- Jadwal lembur instansi: **17:30 WIB**.
- Siswa checkout pukul **20:15 WIB**.
- Selisih waktu = $20:15 - 17:30 = 2\text{ jam } 45\text{ menit}$.
- Database menyimpan: `overtime_minutes: 165` dan `is_overtime: true`.
- Tampilan di antarmuka siswa: **`⚡ 2 Jam 45 Menit`**.

---

### 2.4. Algoritma Anti-Fraud Swafoto & Watermarking Otomatis

Untuk mencegah manipulasi kehadiran (seperti titip absen atau memakai foto lama dari galeri):
1. **Strict Live Camera**: Sistem menggunakan antarmuka `CameraCaptureModal` yang memanggil `getUserMedia()` kamera depan perangkat secara langsung. Pemilihan berkas dari galeri foto dinonaktifkan (`allowGallery: false`).
2. **Dynamic Canvas Watermarking**:
   Sebelum foto dikirim ke server Supabase, kanvas HTML5 memproses gambar dan membubuhkan stempel air permanen yang mencantumkan:
   - Nama Lengkap Siswa
   - Jenis Absen (*ABSENSI MASUK* / *ABSENSI PULANG*)
   - Tanggal & Jam Detik Aktual (Format WIB)
   - Koordinat Geografis (Latitude & Longitude)
   - Nama Instansi Tempat PKL
3. Hasil foto ber-watermark diunggah ke *Supabase Storage bucket: `attendances`*.

---

### 2.5. Algoritma Streak Kedisiplinan & Gamifikasi

Untuk meningkatkan motivasi kedisiplinan siswa:
- **Streak Tracker**: Dihitung dari riwayat presensi hari-hari kerja sebelumnya.
- Jika siswa hadir **Tepat Waktu** berturut-turut, nilai `streak` bertambah $+1$ per hari dan diberikan bonus poin ($10 \times \text{streak}$).
- Jika siswa **Terlambat** atau **Alpha/Tidak Hadir**, streak di-reset kembali ke $0$.

---

### 2.6. Fitur & Menu Lengkap Siswa (Quick Action Hub)

Dashboard siswa menyediakan **Quick Action Hub** (6 Menu Lengkap) yang dapat diakses dengan 1 ketukan:

1. 📝 **Izin & Sakit (`/dashboard/permits`)**:
   - Form pengajuan dispensasi izin atau sakit.
   - Pilihan tanggal mulai s/d tanggal selesai.
   - Wajib melampirkan foto bukti (surat dokter atau surat izin orang tua).
   - Menampilkan status persetujuan dari pembimbing (*Menunggu / Disetujui / Ditolak*).
2. 📖 **Jurnal Kegiatan (`/dashboard/journals`)**:
   - Logbook harian wajib bagi siswa PKL.
   - Mengisi uraian pekerjaan/tugas, jam mulai, jam selesai, kendala, dan foto bukti hasil pekerjaan.
   - Menampilkan status review, paraf digital, dan rating bintang (1-5) dari Pembimbing.
3. ⚡ **Rekap Lembur (`/dashboard/overtime`)**:
   - Rekapitulasi jam lembur mandiri (*strictly read-only* bagi siswa).
   - Menampilkan total jam kerja ekstra, jadwal lembur kantor, dan catatan verifikasi pembimbing.
4. 📅 **Riwayat Absensi (`/dashboard/history`)**:
   - Kalender visual kehadiran dan daftar log harian lengkap.
   - Siswa dapat melihat kembali foto bukti masuk/pulang dan titik lokasi peta absensi.
5. 🌐 **Topologi & SOP Teknis (`/dashboard/structure`)**:
   - Peta hierarki tim kerja, struktur organisasi, dan SOP penanganan gangguan jaringan di instansi.
6. 👤 **Profil Siswa (`/dashboard/profile`)**:
   - Informasi biodata lengkap (NISN/Username, Kelas, Jurusan, Nomor WhatsApp, Instansi PKL).
   - Fitur ganti kata sandi login mandiri.

---

## 3. Dashboard Pembimbing PKL (Portal Mentor Instansi)

Portal Pembimbing (`/pembimbing`) ditujukan bagi instruktur/mentor di instansi tempat siswa magang untuk memantau, mendampingi, dan memverifikasi kinerja siswa bimbingannya.

---

### 3.1. Algoritma Multi-Tenant Instansi (Data Scoping)

Pembimbing memiliki batasan kewenangan (*tenant isolation*):
```
ID_Instansi_Pembimbing = pembimbing.internship_place_id

Query Data Siswa:
    SELECT * FROM users 
    WHERE role = 'student' 
      AND (internship_place_id = ID_Instansi_Pembimbing OR mentor_id = pembimbing.id)
```
- Pembimbing di instansi **Dinas Kominfo** *hanya* dapat melihat, mengabsenkan, dan menilai siswa yang bertugas di Dinas Kominfo.
- Data siswa instansi lain (**GEN-Z TECH**, dsb.) otomatis disembunyikan oleh API backend.

---

### 3.2. Monitoring Presensi & Status Online Siswa Realtime

1. **Statistik Instansi Harian**:
   - Total siswa di instansinya.
   - Jumlah siswa yang sudah hadir hari ini (Tepat Waktu vs Terlambat).
   - Jumlah siswa yang belum absen masuk.
   - Jumlah pengajuan izin/sakit yang menunggu persetujuan.
2. **Realtime Heartbeat Presence**:
   - Menggunakan komponen `PresenceHeartbeat` berbasis WebSocket Supabase.
   - Pembimbing dapat melihat indikator *lampu hijau (Online)* apabila siswa sedang aktif membuka aplikasi ABSENKU.

---

### 3.3. Manajemen Akun Siswa & Reset Password Instan

Pembimbing memiliki kewenangan mengelola akun peserta didik di instansinya secara mandiri tanpa harus meminta bantuan Superadmin:
- **Tambah Akun Siswa Baru**: Mendaftarkan siswa yang baru masuk PKL (otomatis terhubung ke instansi bimbingan mentor).
- **Edit Data Siswa**: Memperbaiki nama, kelas, jurusan, nomor kontak, atau status magang (*Aktif / Selesai*).
- **Reset Password Cepat**: Mengembalikan kata sandi siswa ke default (`123`) jika siswa lupa password.
- **Export Presensi CSV**: Mengunduh rekap presensi seluruh siswa instansinya ke format file spreadsheet Excel/CSV.

---

### 3.4. Workflow Evaluasi & Nilai Jurnal Harian (Logbook)

```
[ Siswa Mengisi Jurnal ] ──► [ Notifikasi Masuk ke Pembimbing ]
                                           │
                                           ▼
                            [ Pembimbing Review Jurnal ]
                            - Cek deskripsi tugas
                            - Periksa foto bukti kerja
                                           │
                                           ▼
                            [ Beri Nilai ⭐ & Catatan Paraf ]
                                           │
                                           ▼
                            [ Jurnal Berstatus: "Disetujui" ]
```
- Pembimbing memberikan rating **1 hingga 5 Bintang**.
- Menuliskan umpan balik/catatan pembimbing (misal: *"Pekerjaan crimping kabel RJ-45 rapi dan telah diuji flukemeter, lanjutkan!"*).

---

### 3.5. Rekap Lembur & Hak Koreksi Durasi Lembur

Berbeda dengan siswa yang hanya bisa melihat (*read-only*), Pembimbing memiliki **Akses Edit** terhadap data lembur:
- **Tabel Rekap Lembur Siswa**: Menampilkan seluruh catatan lembur siswa bimbingan di instansinya.
- **Modal Koreksi Lembur**:
  - Pembimbing dapat menyesuaikan jumlah **Jam** dan **Menit** lembur jika ada ketidaksesuaian waktu checkout aktual dengan durasi kerja riil.
  - Memasukkan catatan verifikasi pembimbing.
  - Endpoint `PUT /api/overtime/[id]` memvalidasi bahwa siswa yang diedit benar-benar siswa binaan pembimbing tersebut dan mencatat audit log.

---

### 3.6. Manajemen Jam Kerja & Batas Lembur Instansi

Pembimbing memiliki tombol pintas **"Atur Jam & Lembur"**:
- Mengatur jam masuk kerja resmi kantor (misal: `08:30 WIB`).
- Mengatur jam pulang resmi kantor (misal: `16:30 WIB`).
- Mengatur jam mulai aktivasi lembur (misal: `17:30 WIB`).
- Mengaktifkan atau menonaktifkan fitur lembur bagi instansi tersebut.

---

## 4. Dashboard Superadmin (Portal Administrator Pusat)

Dashboard Superadmin (`/admin`) merupakan pusat kendali tertinggi sistem ABSENKU dengan hak akses menyeluruh (*God Mode*) lintas instansi, lintas sekolah, dan lintas peran.

---

### 4.1. Global Access & Master Control (God Mode)

- Tidak dibatasi oleh `internship_place_id`.
- Dapat memantau seluruh instansi PKL secara simultan.
- Memiliki proteksi *Master Superadmin* khusus (`mikrotikagil@gmail.com`) yang kebal terhadap pembatasan operasional.

---

### 4.2. Manajemen Master Data (Siswa, Mentor, Tempat PKL)

1. **Master Peserta Didik (`/admin/students`)**:
   - Manajemen basis data seluruh siswa dari berbagai sekolah dan jurusan.
   - Penempatan instansi PKL dan penugasan guru/instruktur pembimbing.
   - Filter berdasarkan tempat PKL, kelas, dan status keaktifan.
2. **Master Pembimbing PKL (`/admin/mentors`)**:
   - Menambah, mengubah, dan menonaktifkan akun pembimbing PKL.
   - Memetakan pembimbing ke instansi tempat bertugas.
3. **Master Tempat / Instansi PKL (`/admin/places`)**:
   - Menambahkan kantor/instansi PKL baru (misal: Kominfo, GEN-Z TECH, Telkom, dll.).
   - Menentukan titik koordinat pusat $(lat, lng)$ via peta Leaflet / Google Maps.
   - Mengatur besaran radius geofencing toleransi (misal: 100m, 200m, 500m).
   - Mengonfigurasi jam kerja dan jadwal lembur spesifik per instansi.

---

### 4.3. Monitoring Operasional & Absensi Lintas Instansi

1. **Riwayat Presensi Global (`/admin/attendances`)**:
   - Menyajikan feed absensi seluruh siswa secara realtime.
   - Dilengkapi filter tanggal, bulan, tahun, status, dan pencarian instansi.
   - Tombol pengiriman pesan peringatan via **WhatsApp API / wa.me** bagi siswa yang belum absen masuk pagi hari.
   - Fitur koreksi/input absensi manual untuk kondisi darurat.
2. **Pengajuan Izin & Sakit (`/admin/permits`)**:
   - Mengawasi seluruh dispensasi siswa se-kabupaten/kota.
   - Hak memproses atau menganulir persetujuan izin.
3. **Jurnal Kegiatan PKL Global (`/admin/journals`)**:
   - Mengaudit seluruh logbook harian siswa di seluruh kantor.
   - Mampu memberikan nilai dan paraf pengganti jika pembimbing berhalangan.
4. **Kalender Presensi (`/admin/calendar`)**:
   - Matriks visual kalender jadwal libur nasional dan hari kerja operasional.

---

### 4.4. Rekap Lembur Terpusat & Ekspor Laporan CSV

Pada halaman **/admin/overtime**:
- **Statistik Agregat Nasional/Daerah**:
  - Total sesi lembur seluruh siswa.
  - Akumulasi total jam lembur gabungan.
  - Jumlah siswa unik yang pernah lembur.
  - Rata-rata durasi lembur per sesi.
- **Filter Fleksibel**:
  - Filter berdasarkan nama instansi PKL (*Semua Instansi* atau spesifik satu tempat).
  - Filter berdasarkan rentang tanggal (*Dari Tanggal* s/d *Sampai Tanggal*).
  - Filter pencarian nama siswa atau kelas.
- **Hak Edit Lembur**:
  - Superadmin memiliki tombol **Edit Lembur** di setiap baris data untuk menyesuaikan jam/menit dan catatan verifikasi.
- **Export CSV / Excel**:
  - Mengunduh seluruh rekap lembur terfilter dalam format berkas CSV siap cetak untuk pelaporan nilai magang atau honorium lembur.

---

### 4.5. Sistem Keamanan Audit Log & Pelacakan Login

1. **Audit Logs (`/admin/audit`)**:
   - Setiap aksi penambahan data, pengeditan durasi lembur, perubahan jadwal kerja, persetujuan izin, dan penghapusan data secara otomatis dicatat ke tabel `audit_logs`.
   - Menyimpan informasi: `user_id` pelaku, `action`, nama `table`, nilai sebelum perubahan (*old_data*), dan nilai setelah perubahan (*new_data*).
2. **Aktivitas Login (`/admin/login-activity`)**:
   - Melacak riwayat sesi login seluruh pengguna.
   - Menyimpan alamat IP, jenis perangkat (*mobile/desktop*), browser, dan stempel waktu (*timestamp*).

---

## 5. Tabel Matriks Hak Akses Antar Peran

| Fitur / Modul | Siswa (`student`) | Pembimbing (`pembimbing`) | Superadmin (`superadmin`) |
|---|:---:|:---:|:---:|
| **Absen Masuk & Pulang (Kamera + GPS)** |  (Akun Pribadi) | ❌ |  (Opsional Admin) |
| **Ajukan Izin & Sakit** |  (Akun Pribadi) | ❌ | ❌ |
| **Approval Izin & Sakit** | ❌ (Hanya Melihat) |  (Siswa Instansinya) |  (Semua Siswa) |
| **Isi Jurnal Harian (Logbook)** |  (Akun Pribadi) | ❌ | ❌ |
| **Review & Beri Nilai Bintang Jurnal** | ❌ (Hanya Melihat Nilai) |  (Siswa Instansinya) |  (Semua Siswa) |
| **Melihat Rekap Lembur** |  (Data Pribadi) |  (Siswa Instansinya) |  (Semua Siswa) |
| **Mengedit Durasi Jam Lembur** | ❌ (Dilarang / 403) |  (Siswa Instansinya) |  (Semua Siswa) |
| **Mengatur Jam Kerja & Jam Mulai Lembur** | ❌ |  (Instansi Penugasannya) |  (Semua Instansi) |
| **Mendaftarkan & Mengedit Siswa PKL** | ❌ |  (Siswa Instansinya) |  (Semua Siswa) |
| **Reset Password Siswa (ke `123`)** | ❌ |  (Siswa Instansinya) |  (Semua Siswa) |
| **Manajemen Tempat / Koordinat PKL** | ❌ | ❌ |  (Semua Tempat PKL) |
| **Manajemen Akun Pembimbing PKL** | ❌ | ❌ |  (Penuh) |
| **Melihat Audit Log & Aktivitas Login** | ❌ | ❌ |  (Penuh) |
| **Download / Export Laporan CSV** | ❌ |  (Instansinya) |  (Semua Instansi) |

---

## Ringkasan Alur Kerja Terpadu (End-to-End Workflow)

```
[ SUPERADMIN ]
Menyiapkan Master Data: Lokasi PKL, Radius GPS, Jam Kerja, Akun Pembimbing & Siswa.
      │
      ▼
[ SISWA PKL ]
1. Datang ke kantor PKL -> Sinyal GPS divalidasi (< 200m).
2. Pukul 06:00 - 08:30 WIB: Buka HP -> Ambil foto live (Watermarking) -> Absen Masuk.
3. Menjalankan tugas PKL -> Catat di Jurnal Harian (Logbook).
4. Pukul 16:30 WIB ke atas: Klik Absen Pulang.
   (Jika checkout lewat pukul 17:30 WIB, lembur dihitung otomatis).
      │
      ▼
[ PEMBIMBING PKL ]
1. Memantau kehadiran siswa di instansinya via dashboard.
2. Memeriksa & memberikan paraf nilai (⭐ 1-5) pada Jurnal Kegiatan.
3. Menyetujui surat izin/sakit jika ada pengajuan.
4. Memeriksa rekap lembur & mengoreksi durasi jika diperlukan.
      │
      ▼
[ SUPERADMIN ]
Mengaudit laporan akhir, memeriksa integritas log, dan mengunduh rekapitulasi CSV lengkap.
```

---
*Dokumen ini dibuat otomatis sebagai panduan resmi arsitektur sistem ABSENKU PKL.*
