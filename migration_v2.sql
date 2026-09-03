-- ============================================================
-- ABSENKU - Migration V2
-- Fitur: Sistem Izin & Sakit, Manajemen Siswa Lengkap, Data Pembimbing,
-- Tempat PKL, Presence Realtime (Online/Offline), Sesi Perangkat, & Notifikasi.
-- Jalankan skrip ini di Supabase SQL Editor.
-- ============================================================

-- 1. Perbarui batasan role pada tabel users agar mendukung 'pembimbing'
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('superadmin', 'pembimbing', 'student'));

-- 2. Buat tabel Tempat / Instansi PKL
create table if not exists public.internship_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  pic_name text,
  pic_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tambahkan kolom-kolom baru pada tabel users untuk data lengkap siswa & presence
alter table public.users add column if not exists username text;
alter table public.users add column if not exists class_name text;
alter table public.users add column if not exists major text;
alter table public.users add column if not exists internship_place_id uuid references public.internship_places(id) on delete set null;
alter table public.users add column if not exists mentor_id uuid references public.users(id) on delete set null;
alter table public.users add column if not exists start_date date;
alter table public.users add column if not exists end_date date;
alter table public.users add column if not exists internship_status text not null default 'aktif';
alter table public.users add column if not exists last_seen timestamptz default now();
alter table public.users add column if not exists is_online boolean not null default false;

-- Tambahkan constraint status PKL jika belum ada
alter table public.users drop constraint if exists users_internship_status_check;
alter table public.users add constraint users_internship_status_check check (internship_status in ('belum_mulai', 'aktif', 'selesai'));

-- 4. Buat tabel Pengajuan Izin & Sakit (Permits)
create table if not exists public.permits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('izin', 'sakit')),
  start_date date not null,
  end_date date not null,
  reason text not null,
  proof_url text,
  status text not null default 'menunggu' check (status in ('menunggu', 'disetujui', 'ditolak')),
  reviewed_by uuid references public.users(id),
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Perbarui check constraint pada tabel attendances agar mendukung status 'izin' dan 'sakit'
alter table public.attendances drop constraint if exists attendances_check_in_status_check;
alter table public.attendances add constraint attendances_check_in_status_check check (check_in_status in ('on_time', 'late', 'alpha', 'izin', 'sakit'));

alter table public.attendances add column if not exists permit_id uuid references public.permits(id) on delete set null;

-- 6. Buat tabel Sesi Perangkat Login (User Sessions) untuk multi-device & login activity
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  device_type text,
  os text,
  browser text,
  ip_address text,
  user_agent text,
  session_token text,
  is_active boolean not null default true,
  login_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  logout_at timestamptz
);

-- 7. Buat tabel Notifikasi Internal
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text not null check (type in ('permit', 'attendance', 'reminder', 'warning', 'info')),
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 8. Indexes untuk performa cepat
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_internship_place on public.users(internship_place_id);
create index if not exists idx_users_mentor on public.users(mentor_id);
create index if not exists idx_users_last_seen on public.users(last_seen);
create index if not exists idx_permits_user on public.permits(user_id);
create index if not exists idx_permits_status on public.permits(status);
create index if not exists idx_permits_dates on public.permits(start_date, end_date);
create index if not exists idx_user_sessions_user on public.user_sessions(user_id);
create index if not exists idx_user_sessions_active on public.user_sessions(user_id, is_active, last_active_at);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

-- 9. Row Level Security (RLS)
alter table public.internship_places enable row level security;
alter table public.permits enable row level security;
alter table public.user_sessions enable row level security;
alter table public.notifications enable row level security;

-- Policies Internship Places: Terbuka baca untuk authenticated user
drop policy if exists "internship_places_read" on public.internship_places;
create policy "internship_places_read" on public.internship_places for select using (auth.role() = 'authenticated');

-- Policies Permits: Siswa bisa baca & submit miliknya, Superadmin & Pembimbing baca semua
drop policy if exists "permits_select_own" on public.permits;
create policy "permits_select_own" on public.permits for select using (auth.uid() = user_id or auth.role() = 'authenticated');
drop policy if exists "permits_insert_own" on public.permits;
create policy "permits_insert_own" on public.permits for insert with check (auth.uid() = user_id);

-- Policies User Sessions: Siswa akses miliknya, Admin akses semua
drop policy if exists "user_sessions_own" on public.user_sessions;
create policy "user_sessions_own" on public.user_sessions for all using (auth.uid() = user_id or auth.role() = 'authenticated');

-- Policies Notifications: Hanya pemilik yang bisa akses
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications for all using (auth.uid() = user_id or auth.role() = 'authenticated');
