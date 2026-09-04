-- ============================================================
-- ABSENKU - Migration V3
-- Fitur: Geofencing & Koordinat Lokasi Tempat PKL
-- Tambahkan kolom latitude, longitude, dan radius_meters pada tabel internship_places
-- Jalankan skrip ini di Supabase SQL Editor.
-- ============================================================

-- 1. Tambahkan kolom koordinat dan radius geofencing pada tabel internship_places
alter table public.internship_places add column if not exists latitude double precision default -5.4988;
alter table public.internship_places add column if not exists longitude double precision default 104.7088;
alter table public.internship_places add column if not exists radius_meters integer default 200;

-- 2. Perbarui koordinat default untuk Kominfo Tanggamus (egov)
update public.internship_places
set 
  latitude = -5.4988,
  longitude = 104.7088,
  radius_meters = 200
where (name ilike '%kominfo%egov%' or name = 'Kominfo Tanggamus (egov)')
  and (latitude is null or latitude = 0);
