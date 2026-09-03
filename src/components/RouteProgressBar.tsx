'use client'

import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function RouteProgressBar() {
  const pathname = usePathname()
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    // Whenever pathname changes, flash the progress bar briefly
    setNavigating(true)
    const t = setTimeout(() => {
      setNavigating(false)
    }, 250)
    return () => clearTimeout(t)
  }, [pathname])

  if (!navigating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none overflow-hidden">
      <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-pulse w-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
    </div>
  )
}
