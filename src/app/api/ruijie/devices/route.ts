import { NextRequest, NextResponse } from 'next/server';
import { getRuijieDevices } from '@/lib/ruijie';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === 'true';
    const status = searchParams.get('status') || 'all'; // 'all' | 'OFF' | 'ON'
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const group = searchParams.get('group') || '';
    const type = searchParams.get('type') || '';

    const { summary, devices, networks, fromCache } = await getRuijieDevices({ refresh });

    // Collect unique types
    const deviceTypes = Array.from(new Set(devices.map((d) => d.commonType || 'Other').filter(Boolean))).sort();

    // Apply filtering — summary stays unfiltered (shows real totals for summary cards)
    let filtered = devices;

    if (status === 'OFF') {
      filtered = filtered.filter((d) => d.onlineStatus !== 'ON');
    } else if (status === 'ON') {
      filtered = filtered.filter((d) => d.onlineStatus === 'ON');
    }

    if (group) {
      filtered = filtered.filter((d) => d.groupName === group);
    }

    if (type) {
      filtered = filtered.filter((d) => d.commonType === type);
    }

    if (search) {
      filtered = filtered.filter((d) => {
        const name = (d.name || d.aliasName || '').toLowerCase();
        const ip = (d.localIp || '').toLowerCase();
        const cpeIp = (d.cpeIp || '').toLowerCase();
        const mac = (d.mac || '').toLowerCase();
        const sn = (d.serialNumber || '').toLowerCase();
        const grp = (d.groupName || '').toLowerCase();
        const pClass = (d.productClass || '').toLowerCase();

        return (
          name.includes(search) ||
          ip.includes(search) ||
          cpeIp.includes(search) ||
          mac.includes(search) ||
          sn.includes(search) ||
          grp.includes(search) ||
          pClass.includes(search)
        );
      });
    }

    const response = NextResponse.json({
      success: true,
      fromCache: !!fromCache,
      summary,          // Always unfiltered — for summary cards
      networks,
      deviceTypes,
      totalFiltered: filtered.length,
      devices: filtered,
    });

    // Prevent browser/CDN caching so data is always fresh
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;
  } catch (error: any) {
    console.error('[API /api/ruijie/devices] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengambil data perangkat Ruijie Cloud',
      },
      { status: 500 }
    );
  }
}
