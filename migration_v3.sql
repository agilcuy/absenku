-- ============================================================
-- ABSENKU - Migration V3 & V4 (Combined & Idempotent)
-- 1. Fitur Geofencing & Titik Koordinat Tempat PKL
-- 2. Fitur Jurnal Kegiatan Harian / Logbook PKL
-- ============================================================
-- Petunjuk:
-- Salin seluruh isi skrip ini, buka Supabase Dashboard -> SQL Editor,
-- lalu klik 'Run'. Aman dijalankan berulang kali.
-- ============================================================

-- ============================================================
-- BAGIAN 1: GEOFENCING TEMPAT PKL
-- ============================================================
alter table public.internship_places add column if not exists latitude double precision default -5.4988;
alter table public.internship_places add column if not exists longitude double precision default 104.7088;
alter table public.internship_places add column if not exists radius_meters integer default 200;

-- Perbarui koordinat default untuk Kominfo Tanggamus (egov)
update public.internship_places
set 
  latitude = -5.4988,
  longitude = 104.7088,
  radius_meters = 200
where (name ilike '%kominfo%' or name = 'Kominfo Tanggamus (egov)')
  and (latitude is null or latitude = 0);

-- ============================================================
-- BAGIAN 2: JURNAL KEGIATAN HARIAN PKL (LOGBOOK)
-- ============================================================
create table if not exists public.daily_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  title text not null,
  description text not null,
  photo_url text,
  mentor_rating integer check (mentor_rating between 1 and 5),
  mentor_notes text,
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Aktifkan RLS
alter table public.daily_journals enable row level security;

-- Drop policy lama jika sudah ada agar tidak error duplikat
drop policy if exists "Users can manage own journals" on public.daily_journals;
drop policy if exists "Admins and Mentors can view all journals" on public.daily_journals;
drop policy if exists "Admins and Mentors can review journals" on public.daily_journals;

-- Siswa dapat membaca dan mengelola jurnal miliknya sendiri
create policy "Users can manage own journals"
  on public.daily_journals for all
  using (auth.uid() = user_id);

-- Superadmin & Pembimbing dapat membaca semua jurnal
create policy "Admins and Mentors can view all journals"
  on public.daily_journals for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('superadmin', 'pembimbing')
    )
  );

-- Superadmin & Pembimbing dapat mereview/update jurnal
create policy "Admins and Mentors can review journals"
  on public.daily_journals for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('superadmin', 'pembimbing')
    )
  );

-- Index performa
create index if not exists idx_daily_journals_user_date on public.daily_journals(user_id, date);
create index if not exists idx_daily_journals_date on public.daily_journals(date);

-- ============================================================
-- SELESAI
-- ============================================================
