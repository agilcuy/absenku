import { type ClassValue, clsx } from 'clsx'

// Simple classname utility (without clsx dependency, use manual concat)
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Format date to Indonesian locale
export function formatDate(dateStr: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return date.toLocaleDateString('id-ID', options ?? {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format time to WIB
export function formatTime(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }) + ' WIB'
}

// Get today's date in Asia/Jakarta timezone as YYYY-MM-DD string
export function getTodayJakarta(): string {
  const now = new Date()
  const jakartaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return jakartaDate // Returns YYYY-MM-DD
}

// Get current time in Jakarta as Date object
export function getNowJakarta(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
}

// Parse time string "HH:MM:SS" to { hours, minutes }
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours, minutes }
}

// Check if current time is on time or late compared to checkInTime
export function getAttendanceStatus(
  checkInTime: Date,
  configTime: string // "07:30:00"
): 'on_time' | 'late' {
  const { hours, minutes } = parseTime(configTime)
  const jakartaCheckIn = new Date(checkInTime.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  const checkInHours = jakartaCheckIn.getHours()
  const checkInMinutes = jakartaCheckIn.getMinutes()

  if (checkInHours < hours) return 'on_time'
  if (checkInHours === hours && checkInMinutes <= minutes) return 'on_time'
  return 'late'
}

// Check if checkout is allowed
export function isCheckOutAllowed(checkOutTime: string): boolean {
  const now = getNowJakarta()
  const { hours, minutes } = parseTime(checkOutTime)
  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()

  if (currentHours > hours) return true
  if (currentHours === hours && currentMinutes >= minutes) return true
  return false
}

// Check if a date is a working day
export function isWorkingDay(date: Date, workingDays: number[]): boolean {
  // getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  // DB stores: 1=Monday, ..., 7=Sunday to match ISO
  const jsDay = date.getDay() // 0-6
  const isoDay = jsDay === 0 ? 7 : jsDay // Convert Sunday from 0 to 7
  return workingDays.includes(isoDay)
}

// Status label
export function getStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Belum Absen'
  const labels: Record<string, string> = {
    on_time: 'Tepat Waktu',
    late: 'Terlambat',
    alpha: 'Alpha',
  }
  return labels[status] ?? status
}

// Status color classes
export function getStatusColor(status: string | null | undefined): string {
  if (!status) return 'text-gray-400'
  const colors: Record<string, string> = {
    on_time: 'text-green-400',
    late: 'text-yellow-400',
    alpha: 'text-red-400',
  }
  return colors[status] ?? 'text-gray-400'
}

// Status badge classes
export function getStatusBadge(status: string | null | undefined): string {
  if (!status) return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  const badges: Record<string, string> = {
    on_time: 'bg-green-500/20 text-green-400 border-green-500/30',
    late: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    alpha: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return badges[status] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

// Status emoji
export function getStatusEmoji(status: string | null | undefined): string {
  const emojis: Record<string, string> = {
    on_time: '🟢',
    late: '🟡',
    alpha: '🔴',
  }
  return emojis[status ?? ''] ?? '⚪'
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// Day names in Indonesian
export const DAY_NAMES: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
}

// Month names in Indonesian
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]
