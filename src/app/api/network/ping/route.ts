import { NextRequest, NextResponse } from 'next/server';
import {
  pingSingleHost,
  runSequentialPing,
  readNetworkCache,
  writeNetworkCache,
  TanggamusHost,
} from '@/lib/network-ping';
import {
  formatTanggamusHostDownAlert,
  formatTanggamusHostRecoveryAlert,
  getTelegramConfig,
  sendTelegramMessage,
} from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { all, ip, sendAlerts = true } = body;

    // Skenario 1: Ping seluruh 69 host secara berurutan
    if (all) {
      const updatedCache = await runSequentialPing({
        sendAlerts: Boolean(sendAlerts),
      });

      return NextResponse.json({
        success: true,
        message: `Pemeriksaan berurutan ${updatedCache.summary.total} host selesai.`,
        data: updatedCache,
      });
    }

    // Skenario 2: Ping satu host spesifik berdasarkan IP
    if (ip) {
      const pingResult = await pingSingleHost(ip, 800, 1);
      const cache = readNetworkCache();
      const hostIndex = (cache.hosts || []).findIndex((h) => h.ip === ip);

      let updatedHost: TanggamusHost | null = null;
      const nowIso = new Date().toISOString();
      const isUp = pingResult.isOnline;

      if (hostIndex !== -1) {
        const prev = cache.hosts[hostIndex];
        const wasDown = prev.status === 'DOWN';

        let consecutiveDownCount = prev.consecutiveDownCount || 0;
        let alertSent = prev.alertSent;
        let downSince = prev.downSince;

        if (isUp) {
          if (wasDown && alertSent && sendAlerts) {
            const downtimeMs = downSince ? Date.now() - new Date(downSince).getTime() : 0;
            const downtimeMinutes = Math.max(1, Math.round(downtimeMs / 60000));
            const recoveryMsg = formatTanggamusHostRecoveryAlert(
              { no: prev.no, name: prev.name, ip: prev.ip, category: prev.category },
              downtimeMinutes,
              new Date()
            );
            const tgConfig = getTelegramConfig();
            if (tgConfig.alert_enabled) {
              sendTelegramMessage(tgConfig.default_chat_id || '', recoveryMsg).catch((err) =>
                console.error('[Telegram] Error sending recovery alert:', err)
              );
            }
            alertSent = false;
            downSince = null;
          }
          consecutiveDownCount = 0;
        } else {
          consecutiveDownCount += 1;
          if (!downSince) downSince = nowIso;
          if (!alertSent && sendAlerts) {
            const downMsg = formatTanggamusHostDownAlert(
              { no: prev.no, name: prev.name, ip: prev.ip, category: prev.category },
              new Date()
            );
            const tgConfig = getTelegramConfig();
            if (tgConfig.alert_enabled) {
              sendTelegramMessage(tgConfig.default_chat_id || '', downMsg).catch((err) =>
                console.error('[Telegram] Error sending down alert:', err)
              );
            }
            alertSent = true;
          }
        }

        updatedHost = {
          ...prev,
          status: isUp ? 'UP' : 'DOWN',
          latency: isUp ? pingResult.latency : null,
          lastCheck: nowIso,
          lastSeenUp: isUp ? nowIso : prev.lastSeenUp,
          downSince,
          consecutiveDownCount,
          alertSent,
        };

        cache.hosts[hostIndex] = updatedHost;

        // Perbarui summary ringkas
        const onlineCount = cache.hosts.filter((h) => h.status === 'UP').length;
        const downCount = cache.hosts.length - onlineCount;
        const validLatencies = cache.hosts
          .filter((h) => h.status === 'UP' && h.latency !== null)
          .map((h) => h.latency as number);
        const avgLat =
          validLatencies.length > 0
            ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
            : 0;

        cache.summary = {
          total: cache.hosts.length,
          online: onlineCount,
          down: downCount,
          avgLatency: avgLat,
          healthScore: Math.round((onlineCount / cache.hosts.length) * 100),
        };
        cache.last_check_at = nowIso;

        writeNetworkCache(cache);
      }

      return NextResponse.json({
        success: true,
        isOnline: pingResult.isOnline,
        latency: pingResult.latency,
        host: updatedHost,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Parameter "all: true" atau "ip" harus disediakan.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API /api/network/ping] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengeksekusi ping' },
      { status: 500 }
    );
  }
}
