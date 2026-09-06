-- ============================================================
-- ABSENKU - Migration V6: Sistem Broadcast Pengumuman Resmi
-- ============================================================
-- Petunjuk:
-- Salin seluruh isi skrip ini, buka Supabase Dashboard -> SQL Editor,
-- lalu klik 'Run'. Aman dijalankan berulang kali (idempotent).
-- ============================================================

create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  type text default 'info' check (type in ('info', 'warning', 'urgent', 'success')),
  internship_place_id uuid references public.internship_places(id) on delete cascade,
  is_pinned boolean default false,
  is_active boolean default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index performa
create index if not exists idx_announcements_place on public.announcements(internship_place_id, is_active, created_at desc);
create index if not exists idx_announcements_author on public.announcements(author_id);

-- RLS
alter table public.announcements enable row level security;

-- Policies
drop policy if exists "announcements_read" on public.announcements;
create policy "announcements_read" on public.announcements
  for select
  using (true);

drop policy if exists "announcements_superadmin" on public.announcements;
create policy "announcements_superadmin" on public.announcements
  for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'superadmin'
    )
  );

drop policy if exists "announcements_mentor" on public.announcements;
create policy "announcements_mentor" on public.announcements
  for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'pembimbing'
        and internship_place_id = public.announcements.internship_place_id
    )
  );

-- ============================================================
-- SELESAI MIGRATION V6
-- ============================================================
