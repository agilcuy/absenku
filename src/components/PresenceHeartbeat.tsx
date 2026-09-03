'use client'

import { useEffect, useRef } from 'react'

export default function PresenceHeartbeat() {
  const sessionTokenRef = useRef<string>('')

  useEffect(() => {
    // Generate or retrieve session token from sessionStorage (isolated per tab/browser)
    let token = sessionStorage.getItem('absenku_session_token')
    if (!token) {
      token = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now()
      sessionStorage.setItem('absenku_session_token', token)
    }
    sessionTokenRef.current = token

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_token: sessionTokenRef.current }),
        })
      } catch {
        // silent fail on network glitch
      }
    }

    // Initial heartbeat
    sendHeartbeat()

    // Recurring heartbeat every 25 seconds
    const interval = setInterval(sendHeartbeat, 25000)

    // Visibility change listener
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Unload beacon to notify server immediately on tab close
    const handleUnload = () => {
      if (navigator.sendBeacon) {
        const payload = JSON.stringify({ session_token: sessionTokenRef.current })
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/presence/beacon', blob)
      }
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  return null // Headless background component
}
