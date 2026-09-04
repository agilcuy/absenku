'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminScheduleRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/settings?tab=schedule')
  }, [router])

  return (
    <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
      Mengalihkan ke Pengaturan Sistem (Tab Hari Kerja & Libur)...
    </div>
  )
}
