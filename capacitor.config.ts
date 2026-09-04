import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.absenku.app',
  appName: 'ABSENKU PKL',
  webDir: 'public',
  server: {
    // Load langsung dari server Vercel: SSR, API, kamera, dan DB bekerja 100% realtime
    url: 'https://absenku-three.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    // Handle deep link com.absenku.app:// di dalam WebView app (bukan Chrome)
    appendUserAgent: 'AbsenkuNativeApp',
  },
  plugins: {
    // @capacitor/browser: tampilkan Google OAuth di Custom Chrome Tab (in-app)
    Browser: {
      presentationStyle: 'popover',
    },
  },
};

export default config;
