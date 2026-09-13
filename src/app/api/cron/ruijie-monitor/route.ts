import { NextRequest, NextResponse } from 'next/server';
import { getRuijieDevices, RuijieDevice, RuijieSummary } from '@/lib/ruijie';
import {
  getTelegramConfig,
  sendTelegramMessage,
  formatOfflineAlert,
  formatRecoveryAlert,
  canSendNotification,
  logNotificationSent,
} from '@/lib/telegram';
import { createAdminClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout max for Vercel functions

const CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'monitoring_cache.json');

function readMonitoringCache(): any {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    }
  } catch {
    // silent
  }
  return {};
}

function writeMonitoringCache(data: any): void {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Monitoring Worker Cache] Error writing cache:', err);
  }
}

/**
 * Handler utama Cloud Monitoring Worker
 * Berjalan otomatis via Vercel Cron / GitHub Actions 24/7 mandiri tanpa ketergantungan PC.
 */
export async function GET(req: NextRequest) {
  return handleMonitoringRun(req);
}

export async function POST(req: NextRequest) {
  return handleMonitoringRun(req);
}

async function handleMonitoringRun(req: NextRequest) {
  const startTime = Date.now();
  const url = new URL(req.url, 'http://localhost:3000');
  const source = url.searchParams.get('source') || 'cloud_cron';
  const forceRefresh = url.searchParams.get('refresh') !== 'false';

  const alertsSent: Array<{ type: string; deviceSn: string; name: string; result: any }> = [];

  try {
    // 1. Fetch data dari Ruijie Cloud Tanggamus
    const fetchResult = await getRuijieDevices({ refresh: forceRefresh });
    const { devices, summary, fromCache } = fetchResult;

    if (!devices || devices.length === 0) {
      throw new Error('Gagal memperoleh data perangkat dari Ruijie Cloud');
    }

    const cache = readMonitoringCache();
    const prevDevices: RuijieDevice[] = cache.devices || [];
    const prevMap = new Map<string, RuijieDevice>(prevDevices.map((d) => [d.serialNumber, d]));

    const telegramConfig = getTelegramConfig();
    const updatedDevices: any[] = [];
    const nowIso = new Date().toISOString();

    // 2. Evaluasi status setiap perangkat & Jalankan Proteksi False Offline + Retry Threshold
    for (const d of devices) {
      const prev = prevMap.get(d.serialNumber);
      const prevStatus: 'ON' | 'OFF' | 'CHECKING' =
        (prev as any)?.confirmed_status || prev?.onlineStatus || 'ON';
      const isCurrentlyOff = d.onlineStatus !== 'ON';

      let retryCount = (prev as any)?.retry_count || 0;
      let offlineDetectedAt = (prev as any)?.offline_detected_at || null;
      let confirmedStatus: 'ON' | 'OFF' | 'CHECKING' = 'ON';

      if (isCurrentlyOff) {
        if (prevStatus === 'ON') {
          // Pertama kali terdeteksi mati: Masukkan ke tahap CHECKING (Proteksi False Offline)
          retryCount = 1;
          offlineDetectedAt = nowIso;
          confirmedStatus = 'CHECKING';
          console.log(`[Monitoring] Device ${d.name} (${d.serialNumber}) first failure, set to CHECKING.`);
        } else if (prevStatus === 'CHECKING') {
          // Pengecekan kedua kali berturut-turut masih mati: Konfirmasi OFFLINE!
          retryCount = 2;
          confirmedStatus = 'OFF';
          console.log(`[Monitoring] Device ${d.name} confirmed OFFLINE after retry threshold.`);

          // Kirim Notifikasi Telegram jika diaktifkan & lolos deduplikasi
          if (telegramConfig.alert_enabled && telegramConfig.default_chat_id) {
            if (canSendNotification(d.serialNumber, 'OFFLINE_ALERT')) {
              const alertMsg = formatOfflineAlert(d, new Date(offlineDetectedAt || nowIso));
              const sendRes = await sendTelegramMessage(telegramConfig.default_chat_id, alertMsg);

              if (sendRes.ok) {
                logNotificationSent(
                  d.serialNumber,
                  d.name,
                  'OFFLINE_ALERT',
                  telegramConfig.default_chat_id,
                  alertMsg
                );
                alertsSent.push({
                  type: 'OFFLINE_ALERT',
                  deviceSn: d.serialNumber,
                  name: d.name,
                  result: sendRes,
                });
              }
            }
          }
        } else {
          // Tetap OFFLINE (Deduplikasi aktif: tidak mengirim pesan berulang!)
          confirmedStatus = 'OFF';
          retryCount = Math.min(retryCount + 1, 999);
        }
      } else {
        // Perangkat sekarang ONLINE
        confirmedStatus = 'ON';

        if (prevStatus === 'OFF' || (prev as any)?.confirmed_status === 'OFF') {
          // Pemulihan dari status OFFLINE -> Kirim RECOVERY ALERT!
          const offlineDurationMs = offlineDetectedAt ? Date.now() - new Date(offlineDetectedAt).getTime() : 10 * 60 * 1000;
          const downtimeMinutes = Math.max(1, Math.round(offlineDurationMs / (60 * 1000)));

          console.log(`[Monitoring] Device ${d.name} RECOVERED after ${downtimeMinutes} mins offline.`);

          if (telegramConfig.alert_enabled && telegramConfig.default_chat_id) {
            if (canSendNotification(d.serialNumber, 'RECOVERY_ALERT')) {
              const recoveryMsg = formatRecoveryAlert(d, downtimeMinutes, new Date());
              const sendRes = await sendTelegramMessage(telegramConfig.default_chat_id, recoveryMsg);

              if (sendRes.ok) {
                logNotificationSent(
                  d.serialNumber,
                  d.name,
                  'RECOVERY_ALERT',
                  telegramConfig.default_chat_id,
                  recoveryMsg
                );
                alertsSent.push({
                  type: 'RECOVERY_ALERT',
                  deviceSn: d.serialNumber,
                  name: d.name,
                  result: sendRes,
                });
              }
            }
          }
        }

        retryCount = 0;
        offlineDetectedAt = null;
      }

      updatedDevices.push({
        ...d,
        confirmed_status: confirmedStatus,
        retry_count: retryCount,
        offline_detected_at: offlineDetectedAt,
        last_checked_at: nowIso,
      });
    }

    const executionDuration = Date.now() - startTime;

    // 3. Update Health Check Worker
    const workerHealth = {
      last_run_at: nowIso,
      status: fromCache ? 'WARNING' : 'OK',
      total_devices: devices.length,
      online_count: devices.filter((d) => d.onlineStatus === 'ON').length,
      offline_count: devices.filter((d) => d.onlineStatus !== 'ON').length,
      checking_count: updatedDevices.filter((d) => d.confirmed_status === 'CHECKING').length,
      execution_duration_ms: executionDuration,
      source,
      alerts_sent_count: alertsSent.length,
    };

    // 4. Simpan ke Cache Disk Cadangan
    cache.devices = updatedDevices;
    cache.worker_health = workerHealth;
    writeMonitoringCache(cache);

    // 5. Coba simpan ke Supabase Database jika tabel sudah ada (Background Sinkronisasi)
    try {
      const adminClient = createAdminClient();
      await adminClient.from('monitoring_worker_health').insert({
        last_run_at: nowIso,
        status: workerHealth.status,
        total_devices: workerHealth.total_devices,
        online_count: workerHealth.online_count,
        offline_count: workerHealth.offline_count,
        checking_count: workerHealth.checking_count,
        execution_duration_ms: executionDuration,
        source,
      });
    } catch {
      // Abaikan jika tabel migration_v7 belum di-run di Supabase
    }

    return NextResponse.json({
      success: true,
      message: 'Cloud monitoring worker executed successfully.',
      worker_health: workerHealth,
      summary,
      alerts_sent: alertsSent,
      from_cache: fromCache,
    });
  } catch (err: any) {
    console.error('[Cloud Monitoring Worker] Execution error:', err);

    // False Offline Protection: Catat error tanpa menuduh perangkat offline!
    const cache = readMonitoringCache();
    cache.worker_health = {
      last_run_at: new Date().toISOString(),
      status: 'ERROR',
      error_message: err.message,
      execution_duration_ms: Date.now() - startTime,
      source,
    };
    writeMonitoringCache(cache);

    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal mengeksekusi cloud monitoring worker',
        execution_duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
