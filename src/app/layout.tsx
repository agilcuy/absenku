import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/Toast'
import RouteProgressBar from '@/components/RouteProgressBar'

export const metadata: Metadata = {
  title: {
    default: 'ABSENKU — Sistem Absensi & Jurnal PKL',
    template: '%s | ABSENKU',
  },
  description: 'Sistem Absensi & Jurnal Mandiri Peserta Didik PKL Multi-Instansi',
  keywords: ['absensi', 'PKL', 'jurnal pkl', 'presensi online', 'peserta didik', 'magang'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <RouteProgressBar />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
