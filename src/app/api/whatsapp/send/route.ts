import { NextResponse } from 'next/server';
import { queueOutboundWhatsAppMessage, readWhatsAppConfig } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { target, text } = body;

    const config = readWhatsAppConfig();
    const resolvedTarget = target || config.target_group_jid || config.target_phone;

    if (!resolvedTarget) {
      return NextResponse.json(
        {
          success: false,
          message: 'Target nomor WhatsApp atau JID grup belum dikonfigurasi. Silakan simpan target terlebih dahulu.',
        },
        { status: 400 }
      );
    }

    const messageText =
      text ||
      `🔔 *TES NOTIFIKASI MONITORING JARINGAN TANGGAMUS (WHATSAPP)*
─────────────────────────
✅ Layanan WhatsApp NOC Bot beroperasi normal 24/7.
🎯 Pemantauan 69 Host ONU Tanggamus aktif.
🕒 Waktu Pengujian: ${new Date().toLocaleTimeString('id-ID')} WIB

_Pesan uji coba berhasil dikirimkan dari Web Dashboard ABSENKU!_`;

    queueOutboundWhatsAppMessage(resolvedTarget, messageText);

    return NextResponse.json({
      success: true,
      message: `Pesan uji coba telah dimasukkan ke antrean kirim WhatsApp untuk ${resolvedTarget}!`,
      data: {
        target: resolvedTarget,
        queued_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('API /api/whatsapp/send error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengirim pesan WhatsApp' },
      { status: 500 }
    );
  }
}
