import { NextResponse } from 'next/server';
import { readNetworkCache, getMasterHosts } from '@/lib/network-ping';

export async function GET() {
  try {
    let cache = readNetworkCache();

    // Jika cache belum memiliki data hosts, inisialisasi dari master
    if (!cache.hosts || cache.hosts.length === 0) {
      const master = getMasterHosts();
      cache.hosts = master.map((m) => ({
        no: m.no,
        name: m.name,
        ip: m.ip,
        category: m.category,
        status: 'PENDING',
        latency: null,
        consecutiveDownCount: 0,
        alertSent: false,
      }));
      cache.summary = {
        total: master.length,
        online: 0,
        down: 0,
        avgLatency: 0,
        healthScore: 100,
      };
    }

    return NextResponse.json({
      success: true,
      data: cache,
    });
  } catch (error: any) {
    console.error('[API /api/network/hosts] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memuat status host jaringan' },
      { status: 500 }
    );
  }
}
