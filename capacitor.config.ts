import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.absenku.app',
  appName: 'ABSENKU PKL',
  webDir: 'public',
  server: {
    // Membuka langsung server produksi Vercel agar fitur dinamis, API, kamera, dan database bekerja 100% realtime
    url: 'https://absenku-three.vercel.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
