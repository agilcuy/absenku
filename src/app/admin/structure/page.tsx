'use client'

import React from 'react'
import TopologyDiagram from '@/components/TopologyDiagram'
import { ToastProvider } from '@/components/Toast'

export default function AdminStructurePage() {
  return (
    <ToastProvider>
      <div className="space-y-6">
        <TopologyDiagram />
      </div>
    </ToastProvider>
  )
}
