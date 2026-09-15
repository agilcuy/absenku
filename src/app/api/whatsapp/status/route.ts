import { NextResponse } from 'next/server';
import { readWhatsAppConfig } from '@/lib/whatsapp';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = readWhatsAppConfig();

    let summary = null;
    const cachePath = path.join(process.cwd(), 'src', 'data', 'network_monitoring_cache.json');
    if (fs.existsSync(cachePath)) {
      try {
        const cache = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        summary = cache.summary || null;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        summary,
      },
    });
  } catch (error: any) {
    console.error('API /api/whatsapp/status error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal membaca status WhatsApp' },
      { status: 500 }
    );
  }
}
