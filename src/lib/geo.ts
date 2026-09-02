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

// Validate image file
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Harap gunakan format JPG, JPEG, PNG, atau WEBP.',
    }
  }

  // Max 5MB
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Ukuran foto terlalu besar. Maksimal ukuran foto adalah 5MB.',
    }
  }

  return { valid: true }
}
