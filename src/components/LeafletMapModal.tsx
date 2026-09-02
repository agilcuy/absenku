'use client'

import React, { useEffect, useState } from 'react'
import { X, MapPin, ExternalLink } from 'lucide-react'

interface LeafletMapModalProps {
  isOpen: boolean
  onClose: () => void
  lat: number
  lng: number
  title?: string
  address?: string
}

export default function LeafletMapModal({
  isOpen,
  onClose,
  lat,
  lng,
  title = 'Lokasi Absensi',
  address,
}: LeafletMapModalProps) {
  const [mapLoaded, setMapLoaded] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    // Dynamic load leaflet inside browser
    let mapInstance: any = null
    const mapContainerId = 'absenku-modal-map'

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default
        // Import leaflet styles
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link')
          link.id = 'leaflet-css'
          link.rel = 'stylesheet'
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
          document.head.appendChild(link)
        }

        const container = document.getElementById(mapContainerId)
        if (!container) return

        mapInstance = L.map(mapContainerId).setView([lat, lng], 16)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapInstance)

        // Custom marker icon
        const icon = L.divIcon({
          className: 'custom-leaflet-pin',
          html: `<div style="background-color: #6366f1; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 15px rgba(99,102,241,0.8); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })

        L.marker([lat, lng], { icon })
          .addTo(mapInstance)
          .bindPopup(`<b>${title}</b><br/>${address || `${lat}, ${lng}`}`)
          .openPopup()

        setMapLoaded(true)
      } catch (err) {
        console.error('Failed to initialize Leaflet map:', err)
      }
    }

    const timer = setTimeout(initMap, 200)

    return () => {
      clearTimeout(timer)
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, [isOpen, lat, lng, title, address])

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="glass-card w-full max-w-xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map View */}
        <div className="relative w-full h-80 bg-slate-900 flex items-center justify-center">
          <div id="absenku-modal-map" className="w-full h-full" />
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-xs text-gray-400">
              Memuat Peta OpenStreetMap...
            </div>
          )}
        </div>

        {/* Details Footer */}
        <div className="p-4 bg-black/40 border-t border-white/10 flex flex-col gap-2">
          <div className="flex items-start gap-2 text-xs text-gray-300">
            <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{address || 'Alamat tidak tersedia'}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] text-gray-400">
            <span>Koordinat: {lat.toFixed(6)}, {lng.toFixed(6)}</span>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Buka di Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
