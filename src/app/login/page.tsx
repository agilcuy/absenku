'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  not_registered: 'Akun Google kamu belum terdaftar sebagai peserta PKL. Hubungi admin untuk mendaftarkan email kamu.',
  inactive: 'Akun kamu telah dinonaktifkan. Hubungi admin untuk informasi lebih lanjut.',
  auth_failed: 'Proses autentikasi gagal. Silakan coba lagi.',
}

function LoginContent() {
  const searchParams = useSearchParams()
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Credentials state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam && ERROR_MESSAGES[errorParam]) {
      setError(ERROR_MESSAGES[errorParam])
    }
  }, [searchParams])

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Mohon masukkan username dan password Anda.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Username atau password salah.')
      }

      // Synchronize session with browser client
      if (data.session) {
        const supabase = createClient()
        await supabase.auth.setSession(data.session)
      }

      // Redirect immediately to the assigned portal
      window.location.href = data.redirect || '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa kembali username dan password Anda.')
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true)
    setError(null)
    const supabase = createClient()

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (oauthError) {
      setError('Gagal terhubung ke Google. Silakan coba lagi.')
      setLoadingGoogle(false)
    }
  }

  const anyLoading = submitting || loadingGoogle

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4 pt-safe pb-safe relative overflow-hidden">
      {/* Background Orbs */}
      <div className="orb orb-purple w-96 h-96 top-[-10%] left-[-10%]" />
      <div className="orb orb-blue w-72 h-72 bottom-[-5%] right-[-5%]" />
      <div className="orb orb-green w-64 h-64 top-[60%] left-[60%]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Login Card */}
      <div className="glass-card w-full max-w-md p-6 sm:p-8 relative z-10 animate-fade-in-up">
        {/* Logo/Brand */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 relative shadow-lg shadow-indigo-500/20"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)',
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            <span className="text-2xl">📋</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black gradient-text mb-1 tracking-tight">ABSENKU</h1>
          <p className="text-xs sm:text-sm font-medium text-gray-300">
            Sistem Absensi Peserta Didik PKL
          </p>
          <p className="text-[11px] text-indigo-300/80 mt-0.5 font-medium">
            Dinas Kominfo Tanggamus
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="rounded-xl p-3.5 mb-5 animate-fade-in text-xs"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
            }}
          >
            <div className="flex gap-2.5 items-start">
              <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-red-300 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Username & Password Login Form */}
        <form onSubmit={handleCredentialsLogin} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-gray-300 font-medium mb-1.5">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-username"
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                placeholder="Username akun (contoh: silvi)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={anyLoading}
                className="input-field w-full pl-10 pr-3 py-3 text-xs bg-white/5 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Password akun Anda"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={anyLoading}
                className="input-field w-full pl-10 pr-10 py-3 text-xs bg-white/5 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition touch-target"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="btn-submit-login"
            disabled={anyLoading}
            className="w-full min-h-[50px] mt-2 btn-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-indigo-500/25 active-press touch-target"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Memeriksa Akun...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Sistem</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#0e111d] px-3 text-[11px] text-gray-400 uppercase tracking-wider relative flex-shrink-0">
            atau masuk dengan
          </span>
        </div>

        {/* Google Login Button */}
        <button
          id="btn-google-login"
          type="button"
          onClick={handleGoogleLogin}
          disabled={anyLoading}
          className="w-full min-h-[46px] touch-target active-press flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-semibold text-xs transition-all duration-200 bg-white/5 hover:bg-white/10 border border-white/10 text-white"
        >
          {loadingGoogle ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span>Menghubungkan ke Google...</span>
            </>
          ) : (
            <>
              {/* Google SVG Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Login dengan Google</span>
            </>
          )}
        </button>

        {/* Footer note */}
        <p className="text-center text-[11px] text-gray-500 mt-5 leading-relaxed">
          Belum memiliki akun atau lupa password?
          <br />
          Hubungi admin atau instruktur pembimbing PKL.
        </p>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-4 left-0 right-0 text-center pb-safe">
        <p className="text-[11px] text-gray-500">
          © {new Date().getFullYear()} ABSENKU · Dinas Kominfo Tanggamus
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen animated-bg flex items-center justify-center text-xs text-gray-400">
          Memuat halaman login...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
