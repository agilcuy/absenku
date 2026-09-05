-- ============================================================
-- ABSENKU - Migration V5: Sistem Lembur & Fleksibilitas Jam Kerja
-- ============================================================
-- Petunjuk:
-- Salin seluruh isi skrip ini, buka Supabase Dashboard -> SQL Editor,
-- lalu klik 'Run'. Aman dijalankan berulang kali (idempotent).
-- ============================================================

-- 1. Pengaturan Jam Kerja & Lembur per Tempat PKL
alter table public.internship_places 
add column if not exists work_start_time time default '08:30:00';

alter table public.internship_places 
add column if not exists work_end_time time default '16:30:00';

alter table public.internship_places 
add column if not exists overtime_start_time time default '17:30:00';

alter table public.internship_places 
add column if not exists allow_overtime boolean default true;

-- Update nilai default jika null
update public.internship_places
set 
  work_start_time = coalesce(work_start_time, '08:30:00'),
  work_end_time = coalesce(work_end_time, '16:30:00'),
  overtime_start_time = coalesce(overtime_start_time, '17:30:00'),
  allow_overtime = coalesce(allow_overtime, true);

-- 2. Kolom Pencatatan Lembur pada Tabel Attendances
alter table public.attendances 
add column if not exists overtime_minutes integer default 0;

alter table public.attendances 
add column if not exists is_overtime boolean default false;

alter table public.attendances 
add column if not exists overtime_notes text;

-- Index performa untuk kueri lembur
create index if not exists idx_attendances_overtime on public.attendances(is_overtime, date);

-- ============================================================
-- SELESAI MIGRATION V5
-- ============================================================
