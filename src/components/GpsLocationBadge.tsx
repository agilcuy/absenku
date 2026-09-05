'use client'

import React, { useEffect, useState } from 'react'
import { MapPin, AlertCircle, RefreshCw, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { calculateDistanceMeters, formatDistanceMeters } from '@/lib/geo'

interface TargetLocation {
  lat: number
  lng: number
  radiusMeters?: number
  name?: string
}

interface GpsLocationBadgeProps {
  onLocationFound: (coords: { lat: number; lng: number }) => void
  targetCoords?: TargetLocation | null
}

export default function GpsLocationBadge({ onLocationFound, targetCoords }: GpsLocationBadgeProps) {
  const [loading, setLoading] = useState(true)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
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
        setAccuracy(pos.coords.accuracy || null)
        setLoading(false)
        onLocationFound(found)
      },
      (err) => {
        let msg = 'Gagal mendapatkan lokasi GPS.'
        if (err.code === 1) {
          msg = 'Izin lokasi ditolak. Harap aktifkan izin lokasi di browser/HP Anda.'
        } else if (err.code === 2) {
          msg = 'Sinyal GPS tidak terdeteksi. Pastikan GPS HP aktif.'
        } else if (err.code === 3) {
          msg = 'Waktu permintaan lokasi habis. Coba muat ulang.'
        }
        setError(msg)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 15000,
      }
    )
  }

  useEffect(() => {
    requestLocation()
  }, [])

  // Geofencing distance calculation if target is available
  const radius = targetCoords?.radiusMeters || 200
  const distance =
    coords && targetCoords?.lat && targetCoords?.lng
      ? calculateDistanceMeters(coords.lat, coords.lng, targetCoords.lat, targetCoords.lng)
      : null

  const isWithinRadius = distance !== null ? distance <= radius : null

  return (
    <div className="w-full rounded-2xl p-3.5 bg-white/[0.03] border border-white/10 flex flex-col gap-2.5 text-xs shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <MapPin
              className={`w-4 h-4 ${
                coords ? 'text-emerald-400' : error ? 'text-rose-400' : 'text-indigo-400 animate-pulse'
              }`}
            />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
              Koordinat GPS Siswa
            </span>
            {loading ? (
              <span className="text-gray-400 animate-pulse text-[11px]">Mendeteksi sinyal GPS presisi...</span>
            ) : coords ? (
              <div className="flex items-center gap-1.5 text-white font-mono text-[11px] font-semibold truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
                {accuracy !== null && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-normal border ${
                      accuracy <= 50
                        ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                        : accuracy <= 150
                        ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                        : 'text-rose-300 bg-rose-500/10 border-rose-500/20'
                    }`}
                    title="Akurasi sinyal satelit GPS"
                  >
                    ±{Math.round(accuracy)}m
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-rose-400 font-medium truncate text-[11px]">
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
          className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition active:scale-95 flex items-center gap-1 text-[11px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden sm:inline">Perbarui</span>
        </button>
      </div>

      {/* Geofencing Radius Verification Indicator */}
      {coords && distance !== null && (
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all animate-fade-in ${
            isWithinRadius
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isWithinRadius ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            )}
            <div className="min-w-0 text-[11px]">
              <span className="font-bold block truncate">
                {isWithinRadius ? 'Dalam Radius Lokasi PKL' : 'Peringatan: Di Luar Radius Kantor'}
              </span>
              <span className="text-[10px] opacity-85">
                Jarak: <b>{formatDistanceMeters(distance)}</b> dari {targetCoords?.name || 'Kantor PKL'} (Maks: {radius}m)
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 border ${
              isWithinRadius
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            {isWithinRadius ? 'Aman' : 'Luar Radius'}
          </span>
        </div>
      )}

      {/* Warning for Poor Accuracy or Potential Fake GPS */}
      {accuracy !== null && accuracy > 150 && (
        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[10px] flex items-center gap-1.5 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
          <span>
            Sinyal GPS terdeteksi lemah (akurasi ±{Math.round(accuracy)}m). Harap aktifkan GPS HP Mode Akurasi Tinggi dan hindari aplikasi manipulasi lokasi.
          </span>
        </div>
      )}
    </div>
  )
}
