'use client'

import React, { useEffect, useState, Suspense } from 'react'
import StudentNavbar from '@/components/StudentNavbar'
import MobileBottomNav from '@/components/MobileBottomNav'
import TopologyDiagram from '@/components/TopologyDiagram'
import { ToastProvider } from '@/components/Toast'

import Link from 'next/link'
import { Network, ArrowLeft } from 'lucide-react'

function StructureContent() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/students/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) setProfile(data.profile)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const isSuperadmin = profile?.role === 'superadmin'
  const isProfileIncomplete =
    !isSuperadmin &&
    (!profile?.class_name || !profile?.major || !profile?.phone || !profile?.internship_place_id)

  const placeNameLower = (profile?.internship_places?.name || '').toLowerCase()
  const isAllowedToViewTopology =
    isSuperadmin || placeNameLower.includes('kominfo') || placeNameLower.includes('egov')

  return (
    <div className="min-h-screen bg-[#06070d] text-gray-100 flex flex-col pb-safe-nav pb-24 lg:pb-12">
      <StudentNavbar user={profile} isProfileIncomplete={isProfileIncomplete} />

      <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400">Memeriksa penugasan instansi PKL...</div>
        ) : isAllowedToViewTopology ? (
          <TopologyDiagram />
        ) : (
          <div className="glass-card p-8 sm:p-10 border border-white/10 text-center max-w-lg mx-auto mt-10 rounded-2xl space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
              <Network className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Topologi Jabatan Tidak Tersedia</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                Bagan topologi jabatan dan alur eskalasi penanganan gangguan jaringan ini merupakan struktur internal penugasan teknis terkait.
              </p>
              <div className="p-3 my-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300">
                Instansi PKL Anda: <strong className="text-white">{profile?.internship_places?.name || 'Belum Terdaftar'}</strong>
              </div>
              <p className="text-[11px] text-gray-500">
                Instansi penugasan Anda belum menerapkan bagan hierarki digital pada sistem ini.
              </p>
            </div>
            <div className="pt-3">
              <Link
                href="/dashboard"
                className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-5 font-bold rounded-xl shadow-lg shadow-indigo-500/20"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Halaman Absensi</span>
              </Link>
            </div>
          </div>
        )}
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
