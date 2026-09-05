// Helper for reverse geocoding using OpenStreetMap Nominatim (Free)
export const DEFAULT_OFFICE_COORDS = {
  lat: -5.4988,
  lng: 104.7088,
  radiusMeters: 200,
  name: 'Lokasi PKL',
}

export interface PlaceCoords {
  lat: number
  lng: number
  radiusMeters: number
  name: string
}

// Known verified coordinates for internship places
export const KNOWN_PLACE_COORDS: Record<string, PlaceCoords> = {
  'gen-z': {
    lat: -5.3647154,
    lng: 105.1655531,
    radiusMeters: 200,
    name: 'GEN-Z TECH (DeryGarage X Gen z Code)',
  },
  'kominfo': {
    lat: -5.4988,
    lng: 104.7088,
    radiusMeters: 200,
    name: 'Kominfo Tanggamus (egov)',
  },
}

/**
 * Resolves place coordinates from database record or known verified fallback dictionary
 */
export function getPlaceCoordinates(place: any): PlaceCoords | null {
  if (!place) return null

  // 1. If coordinates configured in database columns
  if (
    place.latitude !== undefined &&
    place.latitude !== null &&
    place.longitude !== undefined &&
    place.longitude !== null &&
    Number(place.latitude) !== 0 &&
    !isNaN(Number(place.latitude))
  ) {
    return {
      lat: Number(place.latitude),
      lng: Number(place.longitude),
      radiusMeters: place.radius_meters ? Number(place.radius_meters) : 200,
      name: place.name || 'Tempat PKL',
    }
  }

  // 2. Fallback matching by name
  const lowerName = (place.name || '').toLowerCase()
  if (lowerName.includes('gen-z') || lowerName.includes('gen z')) {
    return KNOWN_PLACE_COORDS['gen-z']
  }
  if (lowerName.includes('kominfo')) {
    return KNOWN_PLACE_COORDS['kominfo']
  }

  return null
}

// Calculate distance between two coordinates in meters using Haversine formula
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

// Format distance in a human-friendly Indonesian string
export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} meter`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Absenku-PKL-Platform/1.0',
          'Accept-Language': 'id,en',
        },
        signal: controller.signal,
      }
    )
    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      if (data && data.display_name) {
        return data.display_name
      }
    }
  } catch (err) {
    console.error('Failed to reverse geocode:', err)
  }

  return `Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

// Validate image file (tolerant to case and extension)
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/pjpeg',
    'image/x-png',
  ]
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp']
  const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
  const fileType = (file.type || '').toLowerCase()

  const typeValid = allowedTypes.includes(fileType)
  const extValid = allowedExtensions.includes(fileExt)

  if (!typeValid && !extValid) {
    return {
      valid: false,
      error: 'Format berkas tidak didukung. Harap gunakan foto berformat JPG, JPEG, PNG, atau WEBP.',
    }
  }

  // Max 25MB raw file before client-side compression
  const maxRawSize = 25 * 1024 * 1024
  if (file.size > maxRawSize) {
    return {
      valid: false,
      error: 'Ukuran berkas terlalu besar (>25MB). Harap pilih foto lain yang lebih ringkas.',
    }
  }

  return { valid: true }
}

// Compress and resize image in browser via HTML5 Canvas
export async function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<File> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.FileReader) {
      return resolve(file)
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          } else {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(file)

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file)
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
