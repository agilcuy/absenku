import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.absenku.app',
  appName: 'ABSENKU PKL',
  webDir: 'public',
  server: {
    // Load langsung dari server Vercel: SSR, API, kamera, dan DB bekerja 100% realtime
    url: 'https://absenku-three.vercel.app',
    cleartext: false,
    // Izinkan semua domain Google & Supabase dibuka langsung di WebView internal APK (mencegah lempar ke Chrome eksternal)
    allowNavigation: [
      'absenku-three.vercel.app',
      '*.supabase.co',
      'accounts.google.com',
      '*.google.com',
      '*.google.co.id',
      '*.gstatic.com',
      '*.googleapis.com',
      'content.googleapis.com',
      'apis.google.com',
    ],
  },
  android: {
    allowMixedContent: true,
    // Menggunakan Mobile Chrome User-Agent agar Google OAuth mengizinkan login langsung di dalam WebView (mencegah error 403 disallowed_useragent)
    overrideUserAgent:
      'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  },
};

export default config;

