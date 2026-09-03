// Helper for reverse geocoding using OpenStreetMap Nominatim (Free)
export async function getAddressFromCoords(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Absenku-PKL-Kominfo/1.0',
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
