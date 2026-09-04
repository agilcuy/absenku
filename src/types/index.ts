// ============================================================
// ABSENKU - TypeScript Types
// ============================================================

export type Role = 'superadmin' | 'pembimbing' | 'student'
export type AttendanceStatus = 'on_time' | 'late' | 'alpha' | 'izin' | 'sakit'
export type PhotoType = 'check_in' | 'check_out'
export type InternshipStatus = 'belum_mulai' | 'aktif' | 'selesai'
export type PermitType = 'izin' | 'sakit'
export type PermitStatus = 'menunggu' | 'disetujui' | 'ditolak'
export type NotificationType = 'permit' | 'attendance' | 'reminder' | 'warning' | 'info'

export interface InternshipPlace {
  id: string
  name: string
  address?: string
  phone?: string
  pic_name?: string
  pic_phone?: string
  latitude?: number
  longitude?: number
  radius_meters?: number
  created_at: string
  updated_at?: string
  // Computed / joined fields
  students_count?: number
}

export interface User {
  id: string
  email: string
  full_name: string
  username?: string
  phone?: string
  avatar_url?: string
  role: Role
  class_name?: string
  major?: string
  internship_place_id?: string
  mentor_id?: string
  start_date?: string
  end_date?: string
  internship_status?: InternshipStatus
  is_active: boolean
  last_seen?: string
  is_online?: boolean
  created_at: string
  updated_at: string
  // Joined fields
  internship_places?: InternshipPlace
  mentor?: User
  assigned_students?: User[]
  assigned_students_count?: number
  today_attendance?: Attendance
  active_sessions_count?: number
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

export interface Permit {
  id: string
  user_id: string
  type: PermitType
  start_date: string
  end_date: string
  reason: string
  proof_url?: string
  status: PermitStatus
  reviewed_by?: string
  rejection_reason?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
  // Joined fields
  users?: User
  reviewer?: User
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
  permit_id?: string
  created_at: string
  updated_at: string
  // Joined fields
  users?: User
  attendance_photos?: AttendancePhoto[]
  permits?: Permit
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

export interface DailyJournal {
  id: string
  user_id: string
  date: string
  title: string
  description: string
  photo_url?: string
  mentor_rating?: number
  mentor_notes?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  updated_at: string
  // Joined fields
  users?: User
  reviewer?: User
}

export interface UserSession {
  id: string
  user_id: string
  device_type?: string
  os?: string
  browser?: string
  ip_address?: string
  user_agent?: string
  session_token?: string
  is_active: boolean
  login_at: string
  last_active_at: string
  logout_at?: string
  // Joined fields
  users?: User
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  link?: string
  is_read: boolean
  created_at: string
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
  online_students: number
  offline_students: number
  present_today: number
  on_time_today: number
  late_today: number
  izin_today: number
  sakit_today: number
  alpha_today: number
  checked_out_today: number
  not_checked_in: number
  multi_device_count?: number
}

export interface AttendanceWithUser extends Attendance {
  users: User
}
