import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import {
  sendTelegramMessage,
  formatTanggamusHostDownAlert,
  formatTanggamusHostRecoveryAlert,
  getTelegramConfig,
} from './telegram';

const execPromise = util.promisify(exec);

export interface TanggamusHost {
  no: number;
  name: string;
  ip: string;
  category: string;
  status: 'UP' | 'DOWN' | 'PENDING';
  latency: number | null;
  lastCheck?: string;
  lastSeenUp?: string;
  downSince?: string | null;
  consecutiveDownCount: number;
  alertSent: boolean;
}

export interface NetworkMonitoringSummary {
  total: number;
  online: number;
  down: number;
  avgLatency: number;
  healthScore: number;
}

export interface DownHistoryEntry {
  id: string;
  no: number;
  name: string;
  ip: string;
  category: string;
  downAt: string;
  recoveredAt?: string | null;
  durationMinutes?: number | null;
}

export interface NetworkMonitoringCacheData {
  last_check_at: string | null;
  summary: NetworkMonitoringSummary;
  hosts: TanggamusHost[];
  down_history: DownHistoryEntry[];
  telegram_config?: {
    bot_token?: string;
    default_chat_id?: string;
    alert_enabled?: boolean;
  };
}

const HOSTS_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'tanggamus_hosts.json');
const CACHE_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'network_monitoring_cache.json');

/**
 * Membaca daftar master 69 host Tanggamus dari tanggamus_hosts.json
 */
export function getMasterHosts(): Array<{ no: number; name: string; ip: string; category: string }> {
  try {
    if (fs.existsSync(HOSTS_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(HOSTS_FILE_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('[NetworkPing] Error reading master hosts:', e);
  }
  return [];
}

/**
 * Membaca cache monitoring jaringan Tanggamus
 */
export function readNetworkCache(): NetworkMonitoringCacheData {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('[NetworkPing] Error reading cache:', e);
  }

  return {
    last_check_at: null,
    summary: { total: 69, online: 0, down: 0, avgLatency: 0, healthScore: 100 },
    hosts: [],
    down_history: [],
  };
}

/**
 * Menyimpan data ke cache monitoring
 */
export function writeNetworkCache(data: NetworkMonitoringCacheData): void {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[NetworkPing] Error writing cache:', e);
  }
}

/**
 * Mengeksekusi ICMP Ping ke 1 Host IP dengan mekanisme retry anti false-positive
 */
export async function pingSingleHost(
  ip: string,
  timeoutMs: number = 800,
  retryCount: number = 1
): Promise<{ isOnline: boolean; latency: number | null }> {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? `ping -n 1 -w ${timeoutMs} ${ip}` : `ping -c 1 -W 1 ${ip}`;

  const attemptPing = async (): Promise<{ isOnline: boolean; latency: number | null }> => {
    const start = Date.now();
    try {
      const { stdout } = await execPromise(cmd);
      const duration = Date.now() - start;
      const isOnline = stdout.includes('TTL=') || stdout.includes('ttl=');
      if (!isOnline) {
        return { isOnline: false, latency: null };
      }
      const match = stdout.match(/time[=<]([0-9]+)ms/i);
      const latency = match ? parseInt(match[1], 10) : duration;
      return { isOnline: true, latency };
    } catch {
      return { isOnline: false, latency: null };
    }
  };

  let res = await attemptPing();
  if (!res.isOnline && retryCount > 0) {
    // Retry sekali lagi setelah jeda 100ms untuk mencegah false alarm karena ARP delay
    await new Promise((r) => setTimeout(r, 100));
    res = await attemptPing();
  }

  return res;
}

/**
 * Menjalankan siklus pengecekan ping berurutan ke 69 host (satu persatu)
 */
export async function runSequentialPing(options?: {
  onProgress?: (host: TanggamusHost, index: number, total: number) => void;
  sendAlerts?: boolean;
}): Promise<NetworkMonitoringCacheData> {
  const sendAlerts = options?.sendAlerts ?? true;
  const masterHosts = getMasterHosts();
  const cache = readNetworkCache();
  const existingMap = new Map<string, TanggamusHost>();

  for (const h of cache.hosts || []) {
    existingMap.set(h.ip, h);
  }

  const updatedHosts: TanggamusHost[] = [];
  const downHistory: DownHistoryEntry[] = [...(cache.down_history || [])];
  const now = new Date();
  const nowIso = now.toISOString();

  let totalLatency = 0;
  let onlineCount = 0;

  for (let i = 0; i < masterHosts.length; i++) {
    const master = masterHosts[i];
    const prev = existingMap.get(master.ip);

    // Ping host satu persatu
    const pingResult = await pingSingleHost(master.ip, 750, 1);
    const isUp = pingResult.isOnline;

    let consecutiveDownCount = prev ? prev.consecutiveDownCount : 0;
    let alertSent = prev ? prev.alertSent : false;
    let downSince = prev ? prev.downSince : null;
    let lastSeenUp = prev ? prev.lastSeenUp : undefined;

    if (isUp) {
      onlineCount++;
      totalLatency += pingResult.latency || 0;
      lastSeenUp = nowIso;

      // Cek apakah baru saja pulih dari DOWN
      if (prev && prev.status === 'DOWN') {
        const downtimeMs = downSince ? now.getTime() - new Date(downSince).getTime() : 0;
        const downtimeMinutes = Math.max(1, Math.round(downtimeMs / (60 * 1000)));

        // Update riwayat gangguan
        const openIncident = downHistory.find((entry) => entry.ip === master.ip && !entry.recoveredAt);
        if (openIncident) {
          openIncident.recoveredAt = nowIso;
          openIncident.durationMinutes = downtimeMinutes;
        }

        // Kirim notifikasi RECOVERY ke Telegram jika sebelumnya kirim alert
        if (sendAlerts && alertSent) {
          const recoveryText = formatTanggamusHostRecoveryAlert(
            { no: master.no, name: master.name, ip: master.ip, category: master.category },
            downtimeMinutes,
            now
          );
          const tgConfig = getTelegramConfig();
          if (tgConfig.alert_enabled) {
            sendTelegramMessage(tgConfig.default_chat_id || '', recoveryText).catch((err) =>
              console.error('[Telegram] Error sending recovery alert:', err)
            );
          }
        }

        alertSent = false;
        downSince = null;
        consecutiveDownCount = 0;
      }
    } else {
      // Host DOWN
      consecutiveDownCount = (prev ? prev.consecutiveDownCount : 0) + 1;
      if (!downSince) {
        downSince = nowIso;
      }

      // Catat log insiden baru jika belum tercatat
      const existingOpen = downHistory.find((entry) => entry.ip === master.ip && !entry.recoveredAt);
      if (!existingOpen) {
        downHistory.unshift({
          id: `INC-${Date.now()}-${master.no}`,
          no: master.no,
          name: master.name,
          ip: master.ip,
          category: master.category,
          downAt: nowIso,
          recoveredAt: null,
          durationMinutes: null,
        });
      }

      // Kirim Notifikasi Host DOWN jika belum dikirim (Deduplikasi)
      if (sendAlerts && !alertSent) {
        const downText = formatTanggamusHostDownAlert(
          { no: master.no, name: master.name, ip: master.ip, category: master.category },
          now
        );
        const tgConfig = getTelegramConfig();
        if (tgConfig.alert_enabled) {
          sendTelegramMessage(tgConfig.default_chat_id || '', downText).catch((err) =>
            console.error('[Telegram] Error sending down alert:', err)
          );
        }
        alertSent = true;
      }
    }

    const updatedItem: TanggamusHost = {
      no: master.no,
      name: master.name,
      ip: master.ip,
      category: master.category,
      status: isUp ? 'UP' : 'DOWN',
      latency: isUp ? pingResult.latency : null,
      lastCheck: nowIso,
      lastSeenUp,
      downSince,
      consecutiveDownCount: isUp ? 0 : consecutiveDownCount,
      alertSent,
    };

    updatedHosts.push(updatedItem);

    if (options?.onProgress) {
      options.onProgress(updatedItem, i + 1, masterHosts.length);
    }

    // Jeda mikro 30ms antar ping
    await new Promise((r) => setTimeout(r, 30));
  }

  const downCount = masterHosts.length - onlineCount;
  const avgLatency = onlineCount > 0 ? Math.round(totalLatency / onlineCount) : 0;
  const healthScore = masterHosts.length > 0 ? Math.round((onlineCount / masterHosts.length) * 100) : 100;

  // Batasi history maksimal 100 entry
  const trimmedHistory = downHistory.slice(0, 100);

  const updatedCacheData: NetworkMonitoringCacheData = {
    last_check_at: nowIso,
    summary: {
      total: masterHosts.length,
      online: onlineCount,
      down: downCount,
      avgLatency,
      healthScore,
    },
    hosts: updatedHosts,
    down_history: trimmedHistory,
    telegram_config: cache.telegram_config,
  };

  writeNetworkCache(updatedCacheData);
  return updatedCacheData;
}
