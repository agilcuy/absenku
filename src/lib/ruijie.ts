import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface RuijieDevice {
  serialNumber: string;
  name: string;
  aliasName?: string;
  productClass: string;
  productType: string;
  commonType: string;
  onlineStatus: 'ON' | 'OFF';
  offlineReason?: string;
  groupName: string;
  groupId: number;
  buildingId?: number;
  localIp: string;
  cpeIp: string;
  mac: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  lastOnline?: number;
  createTime?: number;
  timezone?: string;
}

export interface RuijieSummary {
  total: number;
  online: number;
  offline: number;
  totalNetworks: number;
  lastChecked: string;
}

const RUIJIE_BASE_URL = 'https://cloud-as.ruijienetworks.com';
const RSA_PUBLIC_KEY_BASE64 =
  'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKjeUvf/EGSrhYUApZlJRYYsYIkWQu5tcPc8bkWVqnlAFrJlVWmvgD5zd9Sevi7qNIl9+1NvNlFcqiUGgsevCNMCAwEAAQ==';
const RSA_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\n${RSA_PUBLIC_KEY_BASE64}\n-----END PUBLIC KEY-----`;

class SessionJar {
  private cookies: Record<string, string> = {};

  setCookies(rawList: string[] | null | undefined) {
    if (!rawList) return;
    for (const c of rawList) {
      if (!c) continue;
      const part = c.split(';')[0];
      const idx = part.indexOf('=');
      if (idx !== -1) {
        const k = part.slice(0, idx).trim();
        const v = part.slice(idx + 1).trim();
        this.cookies[k] = v;
      }
    }
  }

  getCookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  clear() {
    this.cookies = {};
  }
}

// In-memory session & data cache
let cachedJar: SessionJar | null = null;
let cachedTenantId: number = 441225;
let sessionExpiresAt = 0;

let cachedDevices: RuijieDevice[] = [];
let cachedSummary: RuijieSummary | null = null;
let cachedNetworks: string[] = [];
let devicesFetchedAt = 0;
const DEVICE_CACHE_TTL = 60 * 1000; // 60 seconds

function getCacheFilePath(): string {
  return path.join(process.cwd(), 'src', 'data', 'ruijie_cache.json');
}

function loadFallbackCache(): { summary: RuijieSummary; devices: RuijieDevice[]; networks: string[] } {
  try {
    const filePath = getCacheFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      const devices: RuijieDevice[] = data.devices || [];
      const summary: RuijieSummary = data.summary || {
        total: devices.length,
        online: devices.filter((d) => d.onlineStatus === 'ON').length,
        offline: devices.filter((d) => d.onlineStatus !== 'ON').length,
        totalNetworks: new Set(devices.map((d) => d.groupName)).size,
        lastChecked: new Date().toISOString(),
      };
      const networks = Array.from(new Set(devices.map((d) => d.groupName).filter(Boolean))).sort();
      return { summary, devices, networks };
    }
  } catch (err) {
    console.error('[Ruijie] Error reading ruijie_cache.json:', err);
  }

  return {
    summary: { total: 0, online: 0, offline: 0, totalNetworks: 0, lastChecked: new Date().toISOString() },
    devices: [],
    networks: [],
  };
}

function saveFallbackCache(summary: RuijieSummary, devices: RuijieDevice[]) {
  try {
    const filePath = getCacheFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify({ summary, devices }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Ruijie] Error saving ruijie_cache.json:', err);
  }
}

function encryptPassword(password: string): string {
  const buffer = Buffer.from(password, 'utf8');
  return crypto
    .publicEncrypt(
      {
        key: RSA_PUBLIC_KEY_PEM,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      buffer
    )
    .toString('base64');
}

async function authenticateSession(force = false): Promise<{ jar: SessionJar; tenantId: number }> {
  const now = Date.now();
  if (!force && cachedJar && sessionExpiresAt > now) {
    return { jar: cachedJar, tenantId: cachedTenantId };
  }

  const account = process.env.RUIJIE_ACCOUNT;
  const password = process.env.RUIJIE_PASSWORD;

  if (!account || !password) {
    throw new Error('Kredensial Ruijie Cloud belum dikonfigurasi di .env.local');
  }

  const jar = new SessionJar();
  const serviceUrl = `${RUIJIE_BASE_URL}/macc5/adminIntl/`;
  const loginPageUrl = `${RUIJIE_BASE_URL}/sso/login?service=${encodeURIComponent(serviceUrl)}`;

  // 1. GET login page to obtain initial cookies and tokens
  const getRes = await fetch(loginPageUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  const getHtml = await getRes.text();
  const rawSetCookie =
    typeof getRes.headers.getSetCookie === 'function'
      ? getRes.headers.getSetCookie()
      : [getRes.headers.get('set-cookie') || ''];
  jar.setCookies(rawSetCookie);

  const lt = (getHtml.match(/name=["']lt["']\s+value=["']([^"']*)["']/i) || [])[1] || '';
  const execution = (getHtml.match(/name=["']execution["']\s+value=["']([^"']*)["']/i) || [])[1] || '';
  const sign = (getHtml.match(/name=["']sign["']\s+value=["']([^"']*)["']/i) || [])[1] || '';

  const encryptedPassword = encryptPassword(password);

  // 2. Validate password via CAS endpoint
  try {
    const valRes = await fetch(`${RUIJIE_BASE_URL}/sso/validate/password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: jar.getCookieHeader(),
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ account, password: encryptedPassword }),
    });

    const valJson = await valRes.json();
    if (valJson.code === 1105) {
      throw new Error(`Ruijie Cloud Rate Limit: ${valJson.msg}`);
    }

    const valCookies =
      typeof valRes.headers.getSetCookie === 'function'
        ? valRes.headers.getSetCookie()
        : [valRes.headers.get('set-cookie') || ''];
    jar.setCookies(valCookies);
  } catch (err: any) {
    if (err.message?.includes('Rate Limit')) throw err;
  }

  // 3. POST form to CAS login endpoint
  const formParams = new URLSearchParams({
    username: account,
    password: encryptedPassword,
    lt,
    execution,
    sign,
    _eventId: 'submit',
    timeZone: 'GMT+07:00',
    selectedCloud: 'AS',
    googleTotpCode: '',
    disposableCode: '',
  });

  let postRes = await fetch(loginPageUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: jar.getCookieHeader(),
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Origin: RUIJIE_BASE_URL,
      Referer: loginPageUrl,
    },
    body: formParams.toString(),
    redirect: 'manual',
  });

  let postCookies =
    typeof postRes.headers.getSetCookie === 'function'
      ? postRes.headers.getSetCookie()
      : [postRes.headers.get('set-cookie') || ''];
  jar.setCookies(postCookies);

  let redirectLoc = postRes.headers.get('location');

  while (redirectLoc) {
    postRes = await fetch(redirectLoc, {
      headers: {
        Cookie: jar.getCookieHeader(),
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'manual',
    });

    postCookies =
      typeof postRes.headers.getSetCookie === 'function'
        ? postRes.headers.getSetCookie()
        : [postRes.headers.get('set-cookie') || ''];
    jar.setCookies(postCookies);
    redirectLoc = postRes.headers.get('location');
  }

  let tenantId = 441225;
  try {
    const accInfo = await callProxyApi(jar, '/org/account/info', 'GET', {}, tenantId);
    if (accInfo && accInfo.defaultTenant) {
      tenantId = accInfo.defaultTenant;
    }
  } catch (err) {
    console.warn('[Ruijie] Fallback tenantId:', tenantId);
  }

  cachedJar = jar;
  cachedTenantId = tenantId;
  sessionExpiresAt = Date.now() + 20 * 60 * 1000;

  return { jar, tenantId };
}

async function callProxyApi(
  jar: SessionJar,
  api: string,
  method = 'GET',
  querys: Record<string, any> = {},
  tenantId: number
): Promise<any> {
  const url = `${RUIJIE_BASE_URL}/webproxy/common/api?${api.split('?')[0]}`;
  const payload = {
    api,
    method,
    querys: { ...querys, lang: 'en', global_atid: tenantId },
    module: 'default',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.getCookieHeader(),
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: `${RUIJIE_BASE_URL}/macc5/adminIntl/`,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Mengambil semua perangkat Ruijie Cloud Tanggamus dan statusnya.
 */
export async function getRuijieDevices(options?: { refresh?: boolean }): Promise<{
  summary: RuijieSummary;
  devices: RuijieDevice[];
  networks: string[];
}> {
  const now = Date.now();
  if (!options?.refresh && cachedDevices.length > 0 && now - devicesFetchedAt < DEVICE_CACHE_TTL && cachedSummary) {
    return {
      summary: cachedSummary,
      devices: cachedDevices,
      networks: cachedNetworks,
    };
  }

  try {
    const { jar, tenantId } = await authenticateSession(options?.refresh);

    let allDevices: RuijieDevice[] = [];
    let page = 1;
    const perPage = 100;
    let totalCount = 0;

    while (true) {
      const data = await callProxyApi(
        jar,
        `/maint/network/devices?page=${page}&per_page=${perPage}`,
        'GET',
        { page, per_page: perPage },
        tenantId
      );

      if (!data || data.code !== 0) {
        break;
      }

      totalCount = data.totalCount || 0;
      const list: RuijieDevice[] = data.deviceList || [];
      allDevices.push(...list);

      if (allDevices.length >= totalCount || list.length === 0) {
        break;
      }
      page++;
    }

    if (allDevices.length > 0) {
      const onlineCount = allDevices.filter((d) => d.onlineStatus === 'ON').length;
      const offlineCount = allDevices.filter((d) => d.onlineStatus !== 'ON').length;
      const uniqueNetworks = Array.from(
        new Set(allDevices.map((d) => d.groupName || 'Tanpa Grup').filter(Boolean))
      ).sort((a, b) => a.localeCompare(b));

      const summary: RuijieSummary = {
        total: allDevices.length,
        online: onlineCount,
        offline: offlineCount,
        totalNetworks: uniqueNetworks.length,
        lastChecked: new Date().toISOString(),
      };

      cachedDevices = allDevices;
      cachedSummary = summary;
      cachedNetworks = uniqueNetworks;
      devicesFetchedAt = now;

      // Save to disk cache for persistence
      saveFallbackCache(summary, allDevices);

      return {
        summary,
        devices: allDevices,
        networks: uniqueNetworks,
      };
    }
  } catch (err: any) {
    console.warn('[Ruijie] Live fetch failed, using fallback cache:', err.message);
  }

  // Fallback to disk snapshot
  const fallback = loadFallbackCache();
  cachedDevices = fallback.devices;
  cachedSummary = fallback.summary;
  cachedNetworks = fallback.networks;
  devicesFetchedAt = now;

  return fallback;
}

/**
 * Ringkasan cepat status Ruijie Cloud
 */
export async function getRuijieSummary(): Promise<RuijieSummary> {
  const data = await getRuijieDevices();
  return data.summary;
}
