// ============================================================
// ABSENKU - TypeScript Types
// ============================================================

export type Role = 'superadmin' | 'student'
export type AttendanceStatus = 'on_time' | 'late' | 'alpha'
export type PhotoType = 'check_in' | 'check_out'

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Settings {
  id: string
  check_in_time: string   // "07:30:00"
  check_out_time: string  // "16:30:00"
  timezone: string        // "Asia/Jakarta"
  working_days: number[]  // [1,2,3,4,5]
  site_name: string
  site_description: string
  site_logo_url?: string
  updated_by?: string
  updated_at: string
}

export interface Holiday {
  id: string
  date: string
  name: string
  created_by?: string
  created_at: string
}

export interface Attendance {
  id: string
  user_id: string
  date: string
  check_in_time?: string
  check_in_status?: AttendanceStatus
  check_in_lat?: number
  check_in_lng?: number
  check_in_address?: string
  check_out_time?: string
  check_out_lat?: number
  check_out_lng?: number
  check_out_address?: string
  is_manual: boolean
  note?: string
  created_at: string
  updated_at: string
  // Joined fields
  users?: User
  attendance_photos?: AttendancePhoto[]
}

export interface AttendancePhoto {
  id: string
  attendance_id: string
  type: PhotoType
  photo_url: string
  file_name?: string
  file_size?: number
  uploaded_at: string
}

export interface AuditLog {
  id: string
  actor_id?: string
  actor_name?: string
  action: string
  table_name: string
  record_id?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  created_at: string
  users?: User
}

export interface DashboardStats {
  total_students: number
  present_today: number
  on_time_today: number
  late_today: number
  alpha_today: number
  checked_out_today: number
  not_checked_in: number
}

export interface AttendanceWithUser extends Attendance {
  users: User
}
