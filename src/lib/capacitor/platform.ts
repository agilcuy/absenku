import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

/**
 * Detects if the app is running as a native Capacitor app (Android/iOS)
 */
export const isNativeApp = () => Capacitor.isNativePlatform()

/**
 * Returns the correct OAuth redirect URL depending on platform.
 * - Native APK: tetap menggunakan server Vercel sebagai callback handler, 
 *   karena Supabase tidak mendukung custom scheme sebagai authorized redirect URL.
 *   Server Vercel akan redirect ke com.absenku.app:// setelah sesi dibuat.
 * - Web: uses the standard /api/auth/callback route
 */
export function getOAuthRedirectUrl(): string {
  if (isNativeApp()) {
    // Server Vercel yang handle code exchange, lalu redirect ke app
    return 'https://absenku-three.vercel.app/api/auth/callback'
  }
  // Web browser fallback
  return `${window.location.origin}/api/auth/callback`
}

/**
 * Opens a URL in an in-app browser (no Chrome redirect) on native platforms,
 * or a normal window.open on web.
 */
export async function openInAppBrowser(url: string): Promise<void> {
  if (isNativeApp()) {
    await Browser.open({
      url,
      windowName: '_self',
      presentationStyle: 'popover',
      toolbarColor: '#0f0f23',
    })
  } else {
    window.location.href = url
  }
}

/**
 * Closes the in-app browser (called after OAuth callback is captured)
 */
export async function closeInAppBrowser(): Promise<void> {
  if (isNativeApp()) {
    await Browser.close()
  }
}
