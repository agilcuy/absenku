-- ============================================================
-- ABSENKU - Migration V7: Cloud Monitoring Ruijie & Telegram Bot
-- ============================================================
-- Petunjuk:
-- Salin seluruh isi skrip ini, buka Supabase Dashboard -> SQL Editor,
-- lalu klik 'Run'. Aman dijalankan berulang kali (idempotent).
-- ============================================================

-- 1. Tabel Master Perangkat Ruijie (Inventarisasi Hardware)
create table if not exists public.ruijie_devices (
  serial_number text primary key,
  name text not null,
  alias_name text,
  product_class text,
  product_type text,
  common_type text,
  group_name text,
  group_id bigint,
  building_id bigint,
  local_ip text,
  cpe_ip text,
  mac text,
  hardware_version text,
  software_version text,
  online_status text not null default 'ON' check (online_status in ('ON', 'OFF', 'UNKNOWN', 'CHECKING')),
  offline_reason text,
  retry_count integer not null default 0,
  last_online_at timestamptz,
  offline_detected_at timestamptz,
  last_checked_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index performa pencarian perangkat
create index if not exists idx_ruijie_devices_status on public.ruijie_devices(online_status);
create index if not exists idx_ruijie_devices_group on public.ruijie_devices(group_name);
create index if not exists idx_ruijie_devices_type on public.ruijie_devices(common_type);
create index if not exists idx_ruijie_devices_checked on public.ruijie_devices(last_checked_at desc);

-- 2. Tabel Histori Status Perangkat (Pelacakan Downtime & Uptime)
create table if not exists public.ruijie_device_status_history (
  id uuid primary key default gen_random_uuid(),
  device_sn text references public.ruijie_devices(serial_number) on delete cascade not null,
  device_name text,
  status text not null check (status in ('ONLINE', 'OFFLINE', 'RECOVERY', 'CHECKING', 'UNKNOWN')),
  reason text,
  downtime_seconds integer default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_ruijie_history_device on public.ruijie_device_status_history(device_sn, recorded_at desc);
create index if not exists idx_ruijie_history_status on public.ruijie_device_status_history(status);

-- 3. Tabel Log Notifikasi Telegram (Anti-Spam & Deduplikasi Alert)
create table if not exists public.ruijie_notification_logs (
  id uuid primary key default gen_random_uuid(),
  device_sn text not null,
  device_name text,
  notification_type text not null check (notification_type in ('OFFLINE_ALERT', 'RECOVERY_ALERT', 'DAILY_SUMMARY', 'SYSTEM_ALERT')),
  chat_id text not null,
  telegram_message_id text,
  message_text text,
  status text not null default 'SENT' check (status in ('SENT', 'FAILED', 'DUPLICATE_SKIPPED')),
  error_message text,
  sent_at timestamptz not null default now()
);

create index if not exists idx_ruijie_notif_device_type on public.ruijie_notification_logs(device_sn, notification_type, sent_at desc);

-- 4. Tabel Health Check Mesin Cloud Monitoring (Memastikan 24/7 Berjalan)
create table if not exists public.monitoring_worker_health (
  id uuid primary key default gen_random_uuid(),
  last_run_at timestamptz not null default now(),
  status text not null default 'OK' check (status in ('OK', 'WARNING', 'ERROR')),
  total_devices integer default 0,
  online_count integer default 0,
  offline_count integer default 0,
  checking_count integer default 0,
  execution_duration_ms integer default 0,
  source text default 'vercel_cron',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_worker_health_last_run on public.monitoring_worker_health(last_run_at desc);

-- 5. Tabel Konfigurasi Telegram & Monitoring
create table if not exists public.telegram_config (
  id uuid primary key default gen_random_uuid(),
  bot_token text,
  default_chat_id text,
  authorized_user_ids text[] default '{}',
  alert_enabled boolean default true,
  check_interval_minutes integer default 5,
  retry_threshold integer default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Row Level Security (RLS)
alter table public.ruijie_devices enable row level security;
alter table public.ruijie_device_status_history enable row level security;
alter table public.ruijie_notification_logs enable row level security;
alter table public.monitoring_worker_health enable row level security;
alter table public.telegram_config enable row level security;

-- Policies: Superadmin Full Access
drop policy if exists "ruijie_devices_superadmin" on public.ruijie_devices;
create policy "ruijie_devices_superadmin" on public.ruijie_devices
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'superadmin')
  );

drop policy if exists "ruijie_devices_read_auth" on public.ruijie_devices;
create policy "ruijie_devices_read_auth" on public.ruijie_devices
  for select using (auth.role() = 'authenticated');

drop policy if exists "ruijie_history_superadmin" on public.ruijie_device_status_history;
create policy "ruijie_history_superadmin" on public.ruijie_device_status_history
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'superadmin')
  );

drop policy if exists "ruijie_notif_superadmin" on public.ruijie_notification_logs;
create policy "ruijie_notif_superadmin" on public.ruijie_notification_logs
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'superadmin')
  );

drop policy if exists "worker_health_superadmin" on public.monitoring_worker_health;
create policy "worker_health_superadmin" on public.monitoring_worker_health
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'superadmin')
  );

drop policy if exists "worker_health_read_auth" on public.monitoring_worker_health;
create policy "worker_health_read_auth" on public.monitoring_worker_health
  for select using (auth.role() = 'authenticated');

drop policy if exists "telegram_config_superadmin" on public.telegram_config;
create policy "telegram_config_superadmin" on public.telegram_config
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'superadmin')
  );

-- ============================================================
-- SELESAI MIGRATION V7
-- ============================================================
