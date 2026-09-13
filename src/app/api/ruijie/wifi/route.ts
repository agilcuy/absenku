import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const WIFI_CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'ruijie_wifi_cache.json');

export interface RuijieWifiItem {
  groupName: string;
  groupId: number;
  templateId?: number;
  ssid: string;
  password: string;
  security: string;
  vlanId?: number;
  hidden?: string | boolean;
  qrPayload?: string;
}

function loadWifiList(): RuijieWifiItem[] {
  try {
    if (fs.existsSync(WIFI_CACHE_PATH)) {
      const raw = fs.readFileSync(WIFI_CACHE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[API Ruijie WiFi] Error reading cache:', err);
  }
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').toLowerCase().trim();
    const group = (searchParams.get('group') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const perPage = Math.min(100, Math.max(5, parseInt(searchParams.get('per_page') || '25', 10)));
    const all = searchParams.get('all') === 'true';

    let list = loadWifiList();

    // Attach qrPayload to each item
    list = list.map((item) => {
      const auth = item.password ? 'WPA' : 'nopass';
      const passPart = item.password ? `P:${item.password};` : '';
      const qrPayload = `WIFI:T:${auth};S:${item.ssid};${passPart};`;
      return {
        ...item,
        qrPayload,
      };
    });

    const uniqueGroups = Array.from(new Set(list.map((i) => i.groupName).filter(Boolean))).sort();

    // Filter by group
    if (group) {
      list = list.filter((i) => i.groupName.toLowerCase() === group.toLowerCase());
    }

    // Filter by search query (SSID name, password, group name)
    if (q) {
      list = list.filter(
        (i) =>
          i.ssid.toLowerCase().includes(q) ||
          i.groupName.toLowerCase().includes(q) ||
          (i.password && i.password.toLowerCase().includes(q))
      );
    }

    const total = list.length;
    const withPasswordCount = list.filter((i) => Boolean(i.password)).length;
    const openCount = total - withPasswordCount;

    if (all) {
      return NextResponse.json({
        success: true,
        total,
        summary: {
          total,
          withPassword: withPasswordCount,
          openWifi: openCount,
          totalGroups: uniqueGroups.length,
        },
        groups: uniqueGroups,
        ssids: list,
      });
    }

    const start = (page - 1) * perPage;
    const paginated = list.slice(start, start + perPage);

    return NextResponse.json({
      success: true,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage) || 1,
      summary: {
        total,
        withPassword: withPasswordCount,
        openWifi: openCount,
        totalGroups: uniqueGroups.length,
      },
      groups: uniqueGroups,
      ssids: paginated,
    });
  } catch (err: any) {
    console.error('[API Ruijie WiFi Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
