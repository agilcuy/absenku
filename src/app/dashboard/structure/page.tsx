'use client'

import React, { useEffect, useState, Suspense } from 'react'
import StudentNavbar from '@/components/StudentNavbar'
import MobileBottomNav from '@/components/MobileBottomNav'
import TopologyDiagram from '@/components/TopologyDiagram'
import { ToastProvider } from '@/components/Toast'

function StructureContent() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    fetch('/api/students/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) setProfile(data.profile)
      })
      .catch((err) => console.error(err))
  }, [])

  const isSuperadmin = profile?.role === 'superadmin'
  const isProfileIncomplete =
    !isSuperadmin &&
    (!profile?.class_name || !profile?.major || !profile?.phone || !profile?.internship_place_id)

  return (
    <div className="min-h-screen bg-[#06070d] text-gray-100 flex flex-col pb-safe-nav pb-24 lg:pb-12">
      <StudentNavbar user={profile} isProfileIncomplete={isProfileIncomplete} />

      <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        <TopologyDiagram />
      </main>

      <MobileBottomNav isProfileIncomplete={isProfileIncomplete} />
    </div>
  )
}

export default function StudentStructurePage() {
  return (
    <ToastProvider>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#06070d] flex items-center justify-center text-gray-400 text-xs">
            Memuat diagram topologi...
          </div>
        }
      >
        <StructureContent />
      </Suspense>
    </ToastProvider>
  )
}
