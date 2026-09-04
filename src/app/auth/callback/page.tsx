'use client'

/**
 * Halaman callback OAuth untuk native APK.
 * Supabase redirect ke com.absenku.app://callback
 * yang ditangkap oleh deep link di AndroidManifest.xml
 * dan membuka halaman ini di dalam WebView.
 *
 * Halaman ini membaca token dari URL hash/query,
 * menyimpan sesi Supabase, lalu redirect ke dashboard.
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { closeInAppBrowser } from '@/lib/capacitor/platform'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('Memproses login...')

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      // Tutup in-app browser (kalau masih terbuka)
      await closeInAppBrowser()

      // Coba baca session dari hash fragment (#access_token=...) atau query params
      const hash = window.location.hash
      const search = window.location.search

      // Kalau ada hash token dari Supabase implicit flow
      if (hash && hash.includes('access_token')) {
        setStatus('Memverifikasi token...')
        // Supabase client secara otomatis membaca hash
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          setStatus('Autentikasi gagal. Mengalihkan ke login...')
          setTimeout(() => {
            window.location.href = '/login?error=auth_failed'
          }, 2000)
          return
        }

        redirectByRole()
        return
      }

      // Kalau ada code dari PKCE flow
      const params = new URLSearchParams(search)
      const code = params.get('code')

      if (code) {
        setStatus('Memverifikasi sesi...')
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          setStatus('Autentikasi gagal. Mengalihkan ke login...')
          setTimeout(() => {
            window.location.href = '/login?error=auth_failed'
          }, 2000)
          return
        }

        redirectByRole()
        return
      }

      // Coba ambil sesi yang sudah ada
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        redirectByRole()
      } else {
        setStatus('Sesi tidak ditemukan. Mengalihkan ke login...')
        setTimeout(() => {
          window.location.href = '/login?error=auth_failed'
        }, 2000)
      }
    }

    const redirectByRole = async () => {
      setStatus('Login berhasil! Mengalihkan...')
      // Redirect ke server untuk menentukan role (gunakan API callback)
      const res = await fetch('/api/auth/callback-native', { method: 'GET' })
      if (res.redirected) {
        window.location.href = res.url
      } else {
        // Fallback - redirect ke dashboard
        window.location.href = '/dashboard'
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen animated-bg flex flex-col items-center justify-center gap-6 p-8">
      {/* Logo */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)',
          border: '1px solid rgba(99,102,241,0.3)',
          boxShadow: '0 0 30px rgba(99,102,241,0.2)',
        }}
      >
        <span className="text-3xl">📋</span>
      </div>

      <h1 className="text-2xl font-bold gradient-text">ABSENKU PKL</h1>

      {/* Spinner */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          {status}
        </p>
      </div>
    </div>
  )
}
