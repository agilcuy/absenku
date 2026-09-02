'use client'

import React, { useEffect, useState } from 'react'
import { MapPin, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'

interface GpsLocationBadgeProps {
  onLocationFound: (coords: { lat: number; lng: number }) => void
}

export default function GpsLocationBadge({ onLocationFound }: GpsLocationBadgeProps) {
  const [loading, setLoading] = useState(true)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Browser Anda tidak mendukung fitur Geolocation/GPS.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const found = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setCoords(found)
        setLoading(false)
        onLocationFound(found)
      },
      (err) => {
        let msg = 'Gagal mendapatkan lokasi GPS.'
        if (err.code === 1) {
          msg = 'Izin lokasi ditolak. Silakan izinkan akses lokasi pada browser/HP Anda.'
        } else if (err.code === 2) {
          msg = 'Sinyal lokasi tidak terdeteksi. Pastikan GPS HP aktif.'
        } else if (err.code === 3) {
          msg = 'Waktu permintaan lokasi habis. Coba lagi.'
        }
        setError(msg)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    )
  }

  useEffect(() => {
    requestLocation()
  }, [])

  return (
    <div className="w-full rounded-xl p-3 bg-white/5 border border-white/10 flex items-center justify-between text-xs">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <MapPin className={`w-4 h-4 flex-shrink-0 ${coords ? 'text-emerald-400' : error ? 'text-rose-400' : 'text-indigo-400 animate-pulse'}`} />
        <div className="min-w-0">
          {loading ? (
            <span className="text-gray-400">Mendeteksi koordinat GPS...</span>
          ) : coords ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium truncate">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>GPS Aktif ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-rose-400 font-medium truncate">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={requestLocation}
        disabled={loading}
        title="Muat Ulang GPS"
        className="ml-2 text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
      </button>
    </div>
  )
}
