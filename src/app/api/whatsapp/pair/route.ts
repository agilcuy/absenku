import { NextResponse } from 'next/server';
import { writeWhatsAppConfig, readWhatsAppConfig } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Nomor WhatsApp wajib diisi.' },
        { status: 400 }
      );
    }

    let cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('08')) {
      cleanPhone = '628' + cleanPhone.slice(2);
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '628' + cleanPhone.slice(1);
    }

    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, message: 'Format nomor WhatsApp tidak valid (minimal 10 digit).' },
        { status: 400 }
      );
    }

    // Tulis permintaan pairing ke config agar daemon memproses
    writeWhatsAppConfig({
      requested_pairing_phone: cleanPhone,
      pairing_code: null,
    } as any);

    // Tunggu hingga 8 detik untuk mendapatkan pairing code yang digenerate oleh daemon
    let pairingCode: string | null = null;
    const maxAttempts = 16;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const latest = readWhatsAppConfig();
      if (latest.pairing_code) {
        pairingCode = latest.pairing_code;
        break;
      }
    }

    if (pairingCode && !pairingCode.startsWith('ERROR')) {
      return NextResponse.json({
        success: true,
        message: 'Kode pairing berhasil digenerate! Masukkan kode ini di WhatsApp pada smartphone Anda.',
        data: {
          pairing_code: pairingCode,
          phone: cleanPhone,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Permintaan kode pairing telah dikirim ke daemon. Kode akan muncul di layar dalam beberapa detik.',
      data: {
        pairing_code: pairingCode,
        phone: cleanPhone,
      },
    });
  } catch (error: any) {
    console.error('API /api/whatsapp/pair error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal meminta kode pairing WhatsApp' },
      { status: 500 }
    );
  }
}
