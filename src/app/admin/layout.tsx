'use client'

import React, { useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import AdminTopNav from '@/components/AdminTopNav'
import { ToastProvider } from '@/components/Toast'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#06070d] text-slate-100 flex">
        {/* Sidebar */}
        <AdminSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
          <AdminTopNav onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
