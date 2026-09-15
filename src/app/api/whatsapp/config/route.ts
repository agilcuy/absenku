import { NextResponse } from 'next/server';
import { writeWhatsAppConfig, readWhatsAppConfig } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { target_phone, target_group_jid, alert_enabled } = body;

    const updates: any = {};
    if (typeof target_phone === 'string') updates.target_phone = target_phone.trim();
    if (typeof target_group_jid !== 'undefined') updates.target_group_jid = target_group_jid ? target_group_jid.trim() : null;
    if (typeof alert_enabled === 'boolean') updates.alert_enabled = alert_enabled;

    const updated = writeWhatsAppConfig(updates);

    return NextResponse.json({
      success: true,
      message: 'Konfigurasi alert WhatsApp berhasil disimpan!',
      data: updated,
    });
  } catch (error: any) {
    console.error('API /api/whatsapp/config error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan konfigurasi WhatsApp' },
      { status: 500 }
    );
  }
}
