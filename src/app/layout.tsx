import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/Toast'
import RouteProgressBar from '@/components/RouteProgressBar'

export const metadata: Metadata = {
  title: {
    default: 'ABSENKU — Sistem Absensi PKL Kominfo Tanggamus',
    template: '%s | ABSENKU',
  },
  description: 'Sistem Absensi Online Peserta Didik PKL Kominfo Tanggamus',
  keywords: ['absensi', 'PKL', 'Kominfo', 'Tanggamus', 'peserta didik'],
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
