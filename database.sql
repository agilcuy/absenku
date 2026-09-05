-- ============================================================
-- ABSENKU - Database Schema
-- Sistem Absensi PKL Kominfo Tanggamus
-- Jalankan file ini di Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Users (profiles linked to Supabase Auth)
-- Internship Places (Tempat / Instansi PKL)
create table public.internship_places (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  phone text,
  pic_name text,
  pic_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Users (profiles linked to Supabase Auth)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  username text unique,
  phone text,
  avatar_url text,
  class_name text,
  major text,
  internship_place_id uuid references public.internship_places(id) on delete set null,
  mentor_id uuid references public.users(id) on delete set null,
  start_date date,
  end_date date,
  internship_status text not null default 'aktif' check (internship_status in ('belum_mulai', 'aktif', 'selesai')),
  role text not null default 'student' check (role in ('superadmin', 'pembimbing', 'student')),
  is_active boolean not null default true,
  last_seen timestamptz default now(),
  is_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Settings
create table public.settings (
  id uuid primary key default uuid_generate_v4(),
  check_in_time time not null default '08:30:00',
  check_out_time time not null default '16:30:00',
  timezone text not null default 'Asia/Jakarta',
  working_days integer[] not null default '{1,2,3,4,5}',
  site_name text not null default 'ABSENKU',
  site_description text not null default 'Sistem Absensi Peserta Didik PKL Kominfo Tanggamus',
  site_logo_url text,
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

-- Holidays
create table public.holidays (
  id uuid primary key default uuid_generate_v4(),
  date date unique not null,
  name text not null,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- Permits (Pengajuan Izin & Sakit)
create table public.permits (
  id uuid primary key default uuid_generate_v4(),
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

-- Attendances
create table public.attendances (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  check_in_time timestamptz,
  check_in_status text check (check_in_status in ('on_time', 'late', 'alpha', 'izin', 'sakit')),
  check_in_lat decimal(10,8),
  check_in_lng decimal(11,8),
  check_in_address text,
  check_out_time timestamptz,
  check_out_lat decimal(10,8),
  check_out_lng decimal(11,8),
  check_out_address text,
  is_manual boolean not null default false,
  note text,
  permit_id uuid references public.permits(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Attendance Photos
create table public.attendance_photos (
  id uuid primary key default uuid_generate_v4(),
  attendance_id uuid references public.attendances(id) on delete cascade not null,
  type text not null check (type in ('check_in', 'check_out')),
  photo_url text not null,
  file_name text,
  file_size integer,
  uploaded_at timestamptz not null default now()
);

-- User Sessions (Pencatatan Perangkat Login & Multi-device Detection)
create table public.user_sessions (
  id uuid primary key default uuid_generate_v4(),
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

-- Notifications (Pusat Notifikasi Internal)
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  message text not null,
  type text not null check (type in ('permit', 'attendance', 'reminder', 'warning', 'info')),
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Audit Logs
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.users(id),
  actor_name text,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_attendances_user_id on public.attendances(user_id);
create index idx_attendances_date on public.attendances(date);
create index idx_attendances_user_date on public.attendances(user_id, date);
create index idx_attendance_photos_attendance_id on public.attendance_photos(attendance_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index idx_holidays_date on public.holidays(date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.settings enable row level security;
alter table public.holidays enable row level security;
alter table public.attendances enable row level security;
alter table public.attendance_photos enable row level security;
alter table public.audit_logs enable row level security;

-- Function to check admin status without recursive RLS loop
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'superadmin'
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- USERS POLICIES
-- ============================================================

drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_select_admin" on public.users;
drop policy if exists "users_insert_admin" on public.users;
drop policy if exists "users_insert_trigger" on public.users;
drop policy if exists "users_update_own_safe" on public.users;
drop policy if exists "users_update_admin" on public.users;
drop policy if exists "users_delete_admin" on public.users;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_select_authenticated" on public.users
  for select using (auth.role() = 'authenticated');

create policy "users_insert_admin" on public.users
  for insert with check (public.is_admin());

create policy "users_insert_trigger" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own_safe" on public.users
  for update using (auth.uid() = id);

create policy "users_update_admin" on public.users
  for update using (public.is_admin());

create policy "users_delete_admin" on public.users
  for delete using (public.is_admin());

-- ============================================================
-- SETTINGS POLICIES
-- ============================================================

create policy "settings_select_all" on public.settings
  for select using (true);

create policy "settings_modify_admin" on public.settings
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'superadmin')
  );

-- ============================================================
-- HOLIDAYS POLICIES
-- ============================================================

create policy "holidays_select_all" on public.holidays
  for select using (true);

create policy "holidays_modify_admin" on public.holidays
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'superadmin')
  );

-- ============================================================
-- ATTENDANCES POLICIES
-- ============================================================

create policy "attendances_select_own" on public.attendances
  for select using (auth.uid() = user_id);

create policy "attendances_insert_own" on public.attendances
  for insert with check (auth.uid() = user_id);

create policy "attendances_update_own" on public.attendances
  for update using (auth.uid() = user_id);

create policy "attendances_select_admin" on public.attendances
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'superadmin')
  );

create policy "attendances_all_admin" on public.attendances
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'superadmin')
  );

-- ============================================================
-- ATTENDANCE PHOTOS POLICIES
-- ============================================================

create policy "photos_select_own" on public.attendance_photos
  for select using (
    exists (
      select 1 from public.attendances a
      where a.id = attendance_id and a.user_id = auth.uid()
    )
  );

create policy "photos_insert_own" on public.attendance_photos
  for insert with check (
    exists (
      select 1 from public.attendances a
      where a.id = attendance_id and a.user_id = auth.uid()
    )
  );

create policy "photos_select_admin" on public.attendance_photos
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'superadmin')
  );

create policy "photos_all_admin" on public.attendance_photos
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'superadmin')
  );

-- ============================================================
-- AUDIT LOGS POLICIES
-- ============================================================

create policy "audit_select_admin" on public.audit_logs
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'superadmin')
  );

create policy "audit_insert_any" on public.audit_logs
  for insert with check (true);

-- ============================================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger attendances_updated_at before update on public.attendances
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- DEFAULT DATA
-- ============================================================

insert into public.settings (check_in_time, check_out_time, timezone, working_days, site_name, site_description)
values ('08:30:00', '16:30:00', 'Asia/Jakarta', '{1,2,3,4,5}', 'ABSENKU', 'Sistem Absensi Peserta Didik PKL Kominfo Tanggamus');

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Jalankan ini juga di SQL Editor Supabase:

insert into storage.buckets (id, name, public)
values ('attendance-photos', 'attendance-photos', true)
on conflict (id) do nothing;

create policy "Anyone can view photos" on storage.objects
  for select using (bucket_id = 'attendance-photos');

create policy "Authenticated users can upload photos" on storage.objects
  for insert with check (
    bucket_id = 'attendance-photos'
    and auth.role() = 'authenticated'
  );

create policy "Users can delete own photos" on storage.objects
  for delete using (
    bucket_id = 'attendance-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- SELESAI
-- Setelah menjalankan SQL ini:
-- 1. Aktifkan Google OAuth di Supabase Dashboard > Authentication > Providers
-- 2. Login ke ABSENKU dengan akun Google Anda
-- 3. Buka Supabase Table Editor > users
-- 4. Cari email Anda, ubah role dari 'student' ke 'superadmin'
-- 5. Logout dan login kembali
-- ============================================================
