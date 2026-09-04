-- ============================================================
-- ABSENKU - Migration V4
-- Fitur: Jurnal Kegiatan Harian / Logbook PKL
-- Siswa mencatat pekerjaan harian & pembimbing memberi ulasan + rating
-- Jalankan skrip ini di Supabase SQL Editor.
-- ============================================================

-- 1. Buat tabel daily_journals
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

-- 2. Aktifkan RLS
alter table public.daily_journals enable row level security;

-- 3. Policy RLS
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
