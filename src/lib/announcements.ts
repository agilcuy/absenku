import fs from 'fs'
import path from 'path'

export interface AnnouncementRecord {
  id: string
  author_id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'urgent' | 'success'
  internship_place_id: string | null
  is_pinned: boolean
  is_active: boolean
  expires_at?: string | null
  created_at: string
  updated_at: string
  author?: {
    id: string
    full_name: string
    role: string
    avatar_url?: string | null
  }
  place?: {
    id: string
    name: string
  } | null
}

function getCachePath(): string {
  return path.join(process.cwd(), 'src', 'data', 'announcements_cache.json')
}

export function getFallbackAnnouncements(): AnnouncementRecord[] {
  try {
    const filePath = getCachePath()
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw)
      return Array.isArray(data) ? data : []
    }
  } catch (err) {
    console.error('[Announcements Cache] Error reading cache:', err)
  }
  return []
}

export function saveFallbackAnnouncements(list: AnnouncementRecord[]): void {
  try {
    const filePath = getCachePath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8')
  } catch (err) {
    console.error('[Announcements Cache] Error writing cache:', err)
  }
}
