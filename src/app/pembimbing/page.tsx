'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserPlus,
  Clock,
  AlertTriangle,
  UserX,
  Calendar,
  CalendarDays,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Building,
  FileText,
  Smartphone,
  Laptop,
  Tablet,
  CheckCircle2,
  XCircle,
  Search,
  Menu,
  LogOut,
  Pencil,
  Trash2,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  ClipboardList,
  BookOpen,
  Star,
  Zap,
  Megaphone,
  Pin,
  Settings,
  FileSpreadsheet,
  Network,
  Download,
  Check,
  Power,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Tag,
  Info,
  MapPin,
  Filter,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  formatDate,
  formatTime,
  getStatusBadge,
  getStatusEmoji,
  getStatusLabel,
  formatLastSeen,
  formatOvertimeShort,
  MONTH_NAMES,
} from '@/lib/utils'
import { getHolidayInfo, getHolidaysForMonth } from '@/lib/nationalHolidays'
import NotificationCenter from '@/components/NotificationCenter'
import StudentDetailModal from '@/components/StudentDetailModal'
import LeafletMapModal from '@/components/LeafletMapModal'
import { useToast, ToastProvider } from '@/components/Toast'

interface SidebarItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  href?: string
  isActive?: boolean
  badge?: string
  count?: number
}

interface SidebarSection {
  title: string
  items: SidebarItem[]
}

type ViewType =
  | 'dashboard'
  | 'students'
  | 'attendances'
  | 'overtime'
  | 'permits'
  | 'journals'
  | 'announcements'
  | 'calendar'
  | 'login-activity'

function PembimbingPortalContent() {
  const router = useRouter()
  const { showToast } = useToast()

  // Navigation & View state
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Live WIB clock
  const [currentTime, setCurrentTime] = useState<string>('')
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Core Data states
  const [mentor, setMentor] = useState<any>(null)
  const [dataStats, setDataStats] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [attendances, setAttendances] = useState<any[]>([])
  const [permits, setPermits] = useState<any[]>([])
  const [journals, setJournals] = useState<any[]>([])
  const [overtimes, setOvertimes] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [multiDeviceAlerts, setMultiDeviceAlerts] = useState<any[]>([])
  const [customHolidays, setCustomHolidays] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter states
  const [search, setSearch] = useState('')
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('')
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('')

  // Modals state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentDetailModalOpen, setStudentDetailModalOpen] = useState(false)

  // Student CRUD states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<any>(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [studentToReset, setStudentToReset] = useState<any>(null)
  const [newResetPassword, setNewResetPassword] = useState('123')
  const [submittingReset, setSubmittingReset] = useState(false)

  const [submittingStudent, setSubmittingStudent] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    password: '123',
    phone: '',
    email: '',
    class_name: '',
    major: '',
    start_date: '',
    end_date: '',
    internship_status: 'aktif',
    is_active: true,
  })

  // Overtime Edit Modal states
  const [editOvertimeModalOpen, setEditOvertimeModalOpen] = useState(false)
  const [selectedOvertimeForEdit, setSelectedOvertimeForEdit] = useState<any>(null)
  const [editOvertimeHours, setEditOvertimeHours] = useState<number>(0)
  const [editOvertimeMinutesPart, setEditOvertimeMinutesPart] = useState<number>(0)
  const [editOvertimeNotes, setEditOvertimeNotes] = useState<string>('')
  const [submittingEditOvertime, setSubmittingEditOvertime] = useState(false)

  // Announcement states
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false)
  const [selectedAnnouncementForEdit, setSelectedAnnouncementForEdit] = useState<any>(null)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'urgent' | 'success'>('info')
  const [announcementPinned, setAnnouncementPinned] = useState(false)
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false)
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null)

  // Journal Review Modal states
  const [journalModalOpen, setJournalModalOpen] = useState(false)
  const [selectedJournalForReview, setSelectedJournalForReview] = useState<any>(null)
  const [reviewRating, setReviewRating] = useState<number>(5)
  const [reviewNotes, setReviewNotes] = useState<string>('')
  const [submittingJournalReview, setSubmittingJournalReview] = useState(false)

  // Permit Review Modal states
  const [selectedPermit, setSelectedPermit] = useState<any>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [actionType, setActionType] = useState<'disetujui' | 'ditolak'>('disetujui')
  const [rejectionReason, setRejectionReason] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Schedule & Work Hours Modal states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    work_start_time: '08:30',
    work_end_time: '16:30',
    overtime_start_time: '17:30',
    allow_overtime: true,
  })
  const [submittingSchedule, setSubmittingSchedule] = useState(false)

  // Image & Map Preview Modals
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [mapModal, setMapModal] = useState<{
    isOpen: boolean
    lat: number
    lng: number
    title: string
    address?: string
  }>({
    isOpen: false,
    lat: 0,
    lng: 0,
    title: '',
  })

  // Calendar states
  const today = new Date()
  const todayDateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayDateStr)

  // Load all mentor data
  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Fetch mentor profile
      let profile: any = null
      try {
        const resProf = await fetch('/api/students/profile')
        if (resProf.ok) {
          const profJson = await resProf.json()
          profile = profJson.profile
        }
      } catch (e) {
        console.warn('Could not load profile from server API:', e)
      }

      if (!profile) {
        const { data: clientProfile } = await supabase
          .from('users')
          .select('*, internship_places(id, name, address, work_start_time, work_end_time, overtime_start_time, allow_overtime)')
          .eq('id', user.id)
          .maybeSingle()
        profile = clientProfile
      }

      if (!profile || (profile.role !== 'pembimbing' && profile.role !== 'superadmin')) {
        router.push('/dashboard')
        return
      }

      setMentor(profile)

      if (profile?.internship_places) {
        const pl = profile.internship_places
        setScheduleForm({
          work_start_time: pl.work_start_time ? String(pl.work_start_time).substring(0, 5) : '08:30',
          work_end_time: pl.work_end_time ? String(pl.work_end_time).substring(0, 5) : '16:30',
          overtime_start_time: pl.overtime_start_time ? String(pl.overtime_start_time).substring(0, 5) : '17:30',
          allow_overtime: pl.allow_overtime !== false,
        })
      }

      // Fetch all scoped data concurrently
      const [
        resStats,
        resPermits,
        resJournals,
        resOvertimes,
        resAnnounce,
        resSessions,
        resAttendances,
        resHolidays,
      ] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/permits'),
        fetch('/api/journals'),
        fetch('/api/overtime'),
        fetch('/api/announcements'),
        fetch('/api/sessions'),
        fetch('/api/admin/attendances'),
        fetch('/api/holidays'),
      ])

      if (resStats.ok) {
        const sData = await resStats.json()
        setDataStats(sData)
        setStudents(sData.students || [])
        if (sData.multiDeviceAlerts) {
          setMultiDeviceAlerts(sData.multiDeviceAlerts)
        }
      }

      if (resPermits.ok) {
        const pData = await resPermits.json()
        setPermits(pData.permits || [])
      }

      if (resJournals.ok) {
        const jData = await resJournals.json()
        setJournals(jData.journals || [])
      }

      if (resOvertimes.ok) {
        const oData = await resOvertimes.json()
        setOvertimes(oData.overtimes || [])
      }

      if (resAnnounce.ok) {
        const aData = await resAnnounce.json()
        setAnnouncements(aData.announcements || [])
      }

      if (resSessions.ok) {
        const sessData = await resSessions.json()
        setSessions(sessData.sessions || [])
        if (sessData.multiDeviceAlerts?.length > 0) {
          setMultiDeviceAlerts(sessData.multiDeviceAlerts)
        }
      }

      if (resAttendances.ok) {
        const attData = await resAttendances.json()
        setAttendances(attData.attendances || [])
      }

      if (resHolidays.ok) {
        const hData = await resHolidays.json()
        setCustomHolidays(hData.holidays || [])
      }
    } catch (err) {
      console.error('Error loading mentor data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 25000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await loadData()
    showToast('Data monitoring pembimbing berhasil diperbarui!', 'success')
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Student CRUD Handlers
  const handleOpenCreateStudent = () => {
    setFormData({
      full_name: '',
      username: '',
      password: '123',
      phone: '',
      email: '',
      class_name: '',
      major: '',
      start_date: '',
      end_date: '',
      internship_status: 'aktif',
      is_active: true,
    })
    setShowPassword(false)
    setCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentor?.internship_place_id) {
      showToast('Akun Anda belum terhubung dengan instansi penugasan PKL.', 'error')
      return
    }
    setSubmittingStudent(true)
    try {
      const payload: any = {
        full_name: formData.full_name.trim(),
        username: formData.username.trim() || undefined,
        password: formData.password.trim() || '123',
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        class_name: formData.class_name.trim() || undefined,
        major: formData.major.trim() || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        internship_status: formData.internship_status,
        internship_place_id: mentor.internship_place_id,
        mentor_id: mentor.id,
      }

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal mendaftarkan siswa baru.')

      showToast(`Akun siswa "${formData.full_name}" berhasil didaftarkan!`, 'success')
      setCreateModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingStudent(false)
    }
  }

  const handleOpenEditStudent = (student: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedStudentForEdit(student)
    setFormData({
      full_name: student.full_name || '',
      username: student.username || '',
      password: '',
      phone: student.phone || '',
      email: student.email || '',
      class_name: student.class_name || '',
      major: student.major || '',
      start_date: student.start_date || '',
      end_date: student.end_date || '',
      internship_status: student.internship_status || 'aktif',
      is_active: student.is_active !== false,
    })
    setShowPassword(false)
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentForEdit) return
    setSubmittingStudent(true)
    try {
      const payload: any = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        class_name: formData.class_name.trim() || undefined,
        major: formData.major.trim() || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        internship_status: formData.internship_status,
        is_active: formData.is_active,
      }

      if (formData.username && formData.username.trim()) {
        payload.username = formData.username.trim()
      }

      if (formData.password && formData.password.trim()) {
        payload.password = formData.password.trim()
      }

      const res = await fetch(`/api/students/${selectedStudentForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui data siswa.')

      showToast(`Data siswa "${formData.full_name}" berhasil diperbarui!`, 'success')
      setEditModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingStudent(false)
    }
  }

  const handleOpenDeleteStudent = (student: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setStudentToDelete(student)
    setDeleteModalOpen(true)
  }

  const handleDeleteSubmit = async () => {
    if (!studentToDelete) return
    setDeletingStudent(true)
    try {
      const res = await fetch(`/api/students/${studentToDelete.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus siswa.')

      showToast(`Siswa "${studentToDelete.full_name}" berhasil dihapus.`, 'success')
      setDeleteModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setDeletingStudent(false)
    }
  }

  const handleOpenResetPassword = (student: any, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setStudentToReset(student)
    setNewResetPassword('123')
    setResetModalOpen(true)
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentToReset) return
    setSubmittingReset(true)
    try {
      const res = await fetch(`/api/students/${studentToReset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newResetPassword.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal mereset password siswa.')

      showToast(`Password/PIN "${studentToReset.full_name}" berhasil direset!`, 'success')
      setResetModalOpen(false)
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingReset(false)
    }
  }

  // Session Termination Handler
  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm('Akhiri sesi login perangkat ini? Siswa akan otomatis logout di perangkat tersebut.')) {
      return
    }
    try {
      const res = await fetch(`/api/sessions?sessionId=${sessionId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Sesi perangkat berhasil diakhiri!', 'success')
        loadData()
      } else {
        throw new Error('Gagal mengakhiri sesi')
      }
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Overtime Handlers
  const handleOpenEditOvertime = (item: any) => {
    setSelectedOvertimeForEdit(item)
    const totalMinutes = item.overtime_minutes || 0
    setEditOvertimeHours(Math.floor(totalMinutes / 60))
    setEditOvertimeMinutesPart(totalMinutes % 60)
    setEditOvertimeNotes(item.notes || '')
    setEditOvertimeModalOpen(true)
  }

  const handleSaveOvertimeEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOvertimeForEdit) return
    setSubmittingEditOvertime(true)
    try {
      const calculatedMinutes = editOvertimeHours * 60 + editOvertimeMinutesPart
      const res = await fetch(`/api/overtime/${selectedOvertimeForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overtime_minutes: calculatedMinutes,
          notes: editOvertimeNotes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui durasi lembur.')

      showToast('Durasi lembur berhasil dikoreksi!', 'success')
      setEditOvertimeModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingEditOvertime(false)
    }
  }

  const handleUpdateOvertimeStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/overtime/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui status lembur')

      showToast(
        status === 'approved' ? 'Lembur siswa disetujui!' : 'Pengajuan lembur ditolak.',
        'success'
      )
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    }
  }

  // Permit Handlers
  const handleOpenReviewPermit = (permit: any, type: 'disetujui' | 'ditolak') => {
    setSelectedPermit(permit)
    setActionType(type)
    setRejectionReason('')
    setReviewModalOpen(true)
  }

  const handleSavePermitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPermit) return
    setSubmittingReview(true)
    try {
      const res = await fetch(`/api/permits/${selectedPermit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType,
          rejection_reason: actionType === 'ditolak' ? rejectionReason.trim() : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memproses permohonan izin')

      showToast(
        actionType === 'disetujui'
          ? 'Permohonan izin/sakit disetujui!'
          : 'Permohonan izin/sakit ditolak.',
        'success'
      )
      setReviewModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Announcement Handlers
  const handleOpenCreateAnnouncement = () => {
    setSelectedAnnouncementForEdit(null)
    setAnnouncementTitle('')
    setAnnouncementContent('')
    setAnnouncementType('info')
    setAnnouncementPinned(false)
    setAnnouncementModalOpen(true)
  }

  const handleOpenEditAnnouncement = (item: any) => {
    setSelectedAnnouncementForEdit(item)
    setAnnouncementTitle(item.title || '')
    setAnnouncementContent(item.content || '')
    setAnnouncementType(item.type || 'info')
    setAnnouncementPinned(Boolean(item.is_pinned))
    setAnnouncementModalOpen(true)
  }

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentor?.internship_place_id) {
      showToast('Akun Anda belum terhubung dengan instansi penugasan PKL.', 'error')
      return
    }
    setSubmittingAnnouncement(true)
    try {
      const isEdit = !!selectedAnnouncementForEdit
      const endpoint = isEdit
        ? `/api/announcements/${selectedAnnouncementForEdit.id}`
        : '/api/announcements'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementTitle.trim(),
          content: announcementContent.trim(),
          type: announcementType,
          is_pinned: announcementPinned,
          internship_place_id: mentor.internship_place_id,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan pengumuman')

      showToast(
        isEdit
          ? 'Pengumuman instansi berhasil diperbarui!'
          : 'Pengumuman berhasil disiarkan ke anak PKL di instansi Anda!',
        'success'
      )
      setAnnouncementModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingAnnouncement(false)
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengumuman ini?')) return
    setDeletingAnnouncementId(id)
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menghapus pengumuman')
      showToast('Pengumuman berhasil dihapus.', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setDeletingAnnouncementId(null)
    }
  }

  // Journal Review Handlers
  const handleOpenJournalReview = (journal: any) => {
    setSelectedJournalForReview(journal)
    setReviewRating(journal.mentor_rating || 5)
    setReviewNotes(journal.mentor_notes || '')
    setJournalModalOpen(true)
  }

  const handleSaveJournalReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJournalForReview) return
    setSubmittingJournalReview(true)
    try {
      const res = await fetch(`/api/journals/${selectedJournalForReview.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: reviewRating,
          notes: reviewNotes,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan ulasan jurnal')

      showToast('Ulasan dan rating jurnal berhasil disimpan!', 'success')
      setJournalModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingJournalReview(false)
    }
  }

  // Schedule & Work Hours Handler
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentor?.internship_place_id) {
      showToast('Instansi penugasan tidak ditemukan.', 'error')
      return
    }
    setSubmittingSchedule(true)
    try {
      const res = await fetch(`/api/internship-places/${mentor.internship_place_id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_start_time: scheduleForm.work_start_time,
          work_end_time: scheduleForm.work_end_time,
          overtime_start_time: scheduleForm.overtime_start_time,
          allow_overtime: scheduleForm.allow_overtime,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal menyimpan jam kerja & lembur')

      showToast('Aturan jam kerja & lembur instansi berhasil diperbarui!', 'success')
      setScheduleModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingSchedule(false)
    }
  }

  // Export CSV
  const handleExportPresensiCSV = () => {
    if (students.length === 0) {
      showToast('Tidak ada data siswa untuk diekspor.', 'error')
      return
    }

    const headers = ['Nama Siswa', 'Kelas', 'Jurusan', 'Email/Username', 'Status PKL', 'Status Absensi Hari Ini', 'Jam Masuk', 'Jam Pulang', 'Lembur']
    const rows = students.map((s) => {
      const att = s.today_attendance
      return [
        `"${s.full_name || ''}"`,
        `"${s.class_name || ''}"`,
        `"${s.major || ''}"`,
        `"${s.username || s.email || ''}"`,
        `"${s.internship_status || 'aktif'}"`,
        `"${att ? getStatusLabel(att.check_in_status) : 'Belum Absen'}"`,
        `"${att?.check_in_time ? formatTime(att.check_in_time) : '--:--'}"`,
        `"${att?.check_out_time ? formatTime(att.check_out_time) : '--:--'}"`,
        `"${att?.is_overtime ? `${att.overtime_minutes} Menit` : '0'}"`,
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `rekap-presensi-${mentor?.internship_places?.name || 'instansi'}-${todayDateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Rekap presensi berhasil diunduh (CSV)!', 'success')
  }

  // Derived Analytics & Counts
  const stats = dataStats?.stats
  const weeklyTrend = dataStats?.weeklyTrend || []
  const pendingPermitsCount = permits.filter((p) => p.status === 'menunggu').length
  const myAnnouncements = announcements.filter(
    (a) => !a.internship_place_id || a.internship_place_id === mentor?.internship_place_id
  )

  // Pie chart breakdown (Identical to Superadmin)
  const pieData = [
    { name: 'Tepat Waktu', value: stats?.onTimeToday || 0, color: '#10b981' },
    { name: 'Terlambat', value: stats?.lateToday || 0, color: '#f59e0b' },
    { name: 'Izin', value: stats?.izinToday || 0, color: '#3b82f6' },
    { name: 'Sakit', value: stats?.sakitToday || 0, color: '#a855f7' },
    { name: 'Alpha', value: stats?.alphaToday || 0, color: '#ef4444' },
    { name: 'Belum Absen', value: stats?.notCheckedIn || 0, color: '#475569' },
  ].filter((d) => d.value > 0)

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    if (presenceFilter === 'online' && !s.is_online) return false
    if (presenceFilter === 'offline' && s.is_online) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = s.full_name?.toLowerCase().includes(q)
      const matchClass = s.class_name?.toLowerCase().includes(q)
      const matchUser = s.username?.toLowerCase().includes(q)
      if (!matchName && !matchClass && !matchUser) return false
    }
    return true
  })

  // Filtered Attendances
  const filteredAttendances = attendances.filter((att) => {
    if (attendanceDateFilter && att.date !== attendanceDateFilter) return false
    if (attendanceStatusFilter && att.check_in_status !== attendanceStatusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = att.users?.full_name?.toLowerCase().includes(q)
      const matchClass = att.users?.class_name?.toLowerCase().includes(q)
      if (!matchName && !matchClass) return false
    }
    return true
  })

  // Grouped attendances by date for calendar
  const attendancesByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    attendances.forEach((att) => {
      if (!map[att.date]) map[att.date] = []
      map[att.date].push(att)
    })
    return map
  }, [attendances])

  const placeTitle = mentor?.internship_places?.name || 'Instansi Penugasan PKL'

  // ========================================================
  // SIDEBAR SECTIONS (Sama Persis dengan Superadmin)
  // ========================================================
  const SIDEBAR_SECTIONS: SidebarSection[] = [
    {
      title: 'MONITORING',
      items: [
        {
          label: 'Dashboard Utama',
          icon: LayoutDashboard,
          onClick: () => {
            setCurrentView('dashboard')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'dashboard',
        },
        {
          label: 'Topologi & Tupoksi',
          icon: Network,
          href: '/dashboard/structure',
        },
      ],
    },
    {
      title: 'MASTER DATA PKL',
      items: [
        {
          label: 'Peserta Didik PKL',
          icon: UserCheck,
          onClick: () => {
            setCurrentView('students')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'students',
          count: students.length,
        },
        {
          label: 'Profil Instansi PKL',
          icon: Building,
          onClick: () => {
            setScheduleModalOpen(true)
            setMobileSidebarOpen(false)
          },
        },
      ],
    },
    {
      title: 'OPERASIONAL & ABSENSI',
      items: [
        {
          label: 'Riwayat Absensi',
          icon: ClipboardList,
          onClick: () => {
            setCurrentView('attendances')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'attendances',
          count: attendances.length,
        },
        {
          label: 'Rekap Lembur',
          icon: Zap,
          onClick: () => {
            setCurrentView('overtime')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'overtime',
          count: overtimes.length,
        },
        {
          label: 'Pengajuan Izin & Sakit',
          icon: FileText,
          onClick: () => {
            setCurrentView('permits')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'permits',
          badge: pendingPermitsCount > 0 ? `${pendingPermitsCount} Baru` : undefined,
        },
        {
          label: 'Jurnal Kegiatan PKL',
          icon: BookOpen,
          onClick: () => {
            setCurrentView('journals')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'journals',
          count: journals.length,
        },
        {
          label: 'Pengumuman Siswa',
          icon: Megaphone,
          onClick: () => {
            setCurrentView('announcements')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'announcements',
          count: myAnnouncements.length,
        },
        {
          label: 'Kalender Presensi',
          icon: CalendarDays,
          onClick: () => {
            setCurrentView('calendar')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'calendar',
        },
      ],
    },
    {
      title: 'SISTEM & LAPORAN',
      items: [
        {
          label: 'Atur Jam & Lembur',
          icon: Settings,
          onClick: () => {
            setScheduleModalOpen(true)
            setMobileSidebarOpen(false)
          },
        },
        {
          label: 'Aktivitas Login',
          icon: Smartphone,
          onClick: () => {
            setCurrentView('login-activity')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'login-activity',
          badge: multiDeviceAlerts.length > 0 ? `${multiDeviceAlerts.length} Perangkat` : undefined,
        },
        {
          label: 'Rekap & Export Data',
          icon: FileSpreadsheet,
          onClick: () => {
            handleExportPresensiCSV()
            setMobileSidebarOpen(false)
          },
        },
      ],
    },
  ]

  // Helper Calendar grid generation
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay()
  const startDayOffset = (firstDayOfMonth + 6) % 7
  const daysInCurrentMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear((y) => y - 1)
    } else {
      setCalendarMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear((y) => y + 1)
    } else {
      setCalendarMonth((m) => m + 1)
    }
  }

  return (
    <div className="min-h-screen bg-[#06070d] text-slate-100 flex">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* ========================================================
          SIDEBAR KIRI PEMBIMBING (Identik dengan AdminSidebar)
         ======================================================== */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a0d17] border-r border-white/5 flex flex-col pt-safe pb-safe transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/25">
              🎓
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wide text-white flex items-center gap-1.5">
                ABSENKU
                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold border border-purple-500/30 uppercase">
                  Pembimbing
                </span>
              </span>
              <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{placeTitle}</p>
            </div>
          </div>

          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 pb-1 text-[9px] font-extrabold text-gray-400/80 uppercase tracking-wider">
                {section.title}
              </div>

              {section.items.map((item) => {
                const Icon = item.icon
                const active = item.isActive

                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition active:scale-[0.98]"
                    >
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span>{item.label}</span>
                    </Link>
                  )
                }

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition active:scale-[0.98] ${
                      active
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        {item.badge}
                      </span>
                    )}

                    {item.count !== undefined && item.count > 0 && !item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono">
                        {item.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer / Mentor Info */}
        <div className="p-3 border-t border-white/5 bg-black/20">
          <div className="glass-card p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {(mentor?.full_name?.charAt(0) || 'P').toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{mentor?.full_name || 'Pembimbing'}</div>
                <div className="text-[10px] text-gray-400 truncate">{placeTitle}</div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================
          MAIN CONTENT AREA (Identik dengan Admin Layout)
         ======================================================== */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* TopNav (Identik dengan AdminTopNav) */}
        <header className="sticky top-0 z-30 pt-safe bg-[#06070d]/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 flex items-center justify-between min-h-[56px] lg:h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 flex items-center justify-center"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>
                Panel Pembimbing PKL • <b className="text-white">{placeTitle}</b>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-purple-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentTime || 'WIB'}</span>
            </div>

            <NotificationCenter />

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 transition flex items-center gap-1.5 text-xs"
              title="Keluar Akun"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {/* ========================================================
              VIEW 1: DASHBOARD UTAMA (Identik dengan /admin dashboard)
             ======================================================== */}
          {currentView === 'dashboard' && (
            <div className="flex flex-col gap-6">
              {/* Header Banner */}
              <div className="glass-card p-6 border border-purple-500/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="orb orb-purple w-56 h-56 top-[-30px] right-[-30px]" />

                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>Pusat Monitoring Siswa & Real-time Presence</span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-black text-white">
                    Dashboard Pembimbing PKL
                  </h1>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(new Date())} · Sistem Monitoring PKL & Kedisiplinan Siswa di {placeTitle}
                  </p>
                </div>

                {/* Quick Action Toolbar (Identik dengan Superadmin) */}
                <div className="flex items-center gap-2 flex-wrap relative z-10">
                  <button
                    onClick={handleOpenCreateStudent}
                    className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-lg shadow-purple-500/25 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl"
                    title="Buatkan akun username & password untuk siswa baru"
                  >
                    <UserPlus className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>+ Buat Akun Siswa</span>
                  </button>

                  <Link
                    href="/dashboard"
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-500/15 font-semibold rounded-xl"
                    title="Buka kamera absensi mandiri untuk Anda"
                  >
                    <span>📸</span>
                    <span>Absensi Saya</span>
                  </Link>

                  <button
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl"
                    title="Perbarui data monitoring sekarang"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
                  </button>

                  <button
                    onClick={() => setCurrentView('permits')}
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl border-white/10 hover:border-purple-500/40"
                    title="Tinjau permohonan izin"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Review Izin</span>
                  </button>

                  <button
                    onClick={() => setScheduleModalOpen(true)}
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl border-amber-500/40 text-amber-300 hover:bg-amber-500/15"
                    title="Atur jam kerja reguler dan jam lembur instansi"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Atur Jam & Lembur</span>
                  </button>
                </div>
              </div>

              {/* Multi-Device Warning Alert (Sama Persis dengan Superadmin) */}
              {multiDeviceAlerts.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-300">
                        Peringatan: Satu Akun Aktif di Beberapa Perangkat Bersamaan
                      </h4>
                      <p className="text-xs text-amber-200/80 mt-0.5">
                        Terdeteksi {multiDeviceAlerts.length} siswa bimbingan login pada lebih dari satu perangkat secara aktif:{' '}
                        <span className="font-semibold text-white">
                          {multiDeviceAlerts.map((a: any) => a.user_name).join(', ')}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentView('login-activity')}
                    className="btn-outline text-xs py-2 px-3 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 whitespace-nowrap self-start sm:self-auto"
                  >
                    Kelola Sesi Perangkat
                  </button>
                </div>
              )}

              {/* Top 9 Statistics Grid (SAMA PERSIS DENGAN SUPERADMIN) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Total Siswa */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Total Siswa</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-white">{stats?.totalStudents ?? students.length}</span>
                    <Users className="w-4 h-4 text-purple-400" />
                  </div>
                </div>

                {/* Siswa Online */}
                <div className="glass-card p-4 border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-400 font-semibold uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-emerald-400">
                      {stats?.onlineStudents ?? students.filter((s) => s.is_online).length}
                    </span>
                    <span className="text-[10px] text-gray-400">Aktif web</span>
                  </div>
                </div>

                {/* Siswa Offline */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    Offline
                  </span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-gray-300">
                      {stats?.offlineStudents ?? students.filter((s) => !s.is_online).length}
                    </span>
                    <span className="text-[10px] text-gray-500">Tidak aktif</span>
                  </div>
                </div>

                {/* Hadir Hari Ini */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Hadir Hari Ini</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-white">{stats?.presentToday ?? 0}</span>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>

                {/* Terlambat */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Terlambat</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-amber-400">{stats?.lateToday ?? 0}</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                {/* Izin */}
                <div className="glass-card p-4 border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between">
                  <span className="text-[11px] text-blue-400 font-semibold uppercase">Izin</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-blue-400">{stats?.izinToday ?? 0}</span>
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                </div>

                {/* Sakit */}
                <div className="glass-card p-4 border border-purple-500/20 bg-purple-500/5 flex flex-col justify-between">
                  <span className="text-[11px] text-purple-400 font-semibold uppercase">Sakit</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-purple-400">{stats?.sakitToday ?? 0}</span>
                    <Activity className="w-4 h-4 text-purple-400" />
                  </div>
                </div>

                {/* Alfa */}
                <div className="glass-card p-4 border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between">
                  <span className="text-[11px] text-rose-400 font-semibold uppercase">Alfa</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-rose-400">{stats?.alphaToday ?? 0}</span>
                    <UserX className="w-4 h-4 text-rose-400" />
                  </div>
                </div>

                {/* Belum Absen */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Belum Absen</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-gray-400">{stats?.notCheckedIn ?? 0}</span>
                    <Clock className="w-4 h-4 text-gray-500" />
                  </div>
                </div>
              </div>

              {/* 2 Charts Section (SAMA PERSIS DENGAN SUPERADMIN) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Trend Bar Chart (2 cols) */}
                <div className="lg:col-span-2 glass-card p-5 border border-white/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        Tren Kehadiran 7 Hari Terakhir
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Visualisasi tepat waktu, terlambat, izin, sakit, dan alpha di {placeTitle}
                      </p>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    {weeklyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            fontSize={11}
                            tickFormatter={(v) => v.substring(5)}
                          />
                          <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#111827',
                              borderColor: 'rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="tepat" name="Tepat Waktu" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="terlambat" name="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="izin" name="Izin" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="sakit" name="Sakit" fill="#a855f7" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="alpha" name="Alpha" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-gray-500">
                        Data kehadiran 7 hari terakhir belum cukup untuk divisualisasikan.
                      </div>
                    )}
                  </div>
                </div>

                {/* Today Donut Status Breakdown (1 col) */}
                <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    Komposisi Hari Ini
                  </h3>

                  <div className="h-44 w-full flex items-center justify-center">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#111827',
                              borderColor: 'rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              fontSize: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-gray-500">Belum ada aktivitas presensi hari ini.</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>Tepat: {stats?.onTimeToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Telat: {stats?.lateToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Izin: {stats?.izinToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-purple-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>Sakit: {stats?.sakitToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Alpha: {stats?.alphaToday ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      <span>Belum: {stats?.notCheckedIn ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Student Monitoring Section (SAMA PERSIS DENGAN SUPERADMIN) */}
              <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <h3 className="text-base font-bold text-white">
                        Live Monitoring Peserta Didik
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Pantau status online/offline real-time, aktivitas terakhir, dan absensi hari ini di {placeTitle}
                    </p>
                  </div>

                  {/* Presence Filter Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Cari siswa/kelas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field text-xs pl-8 py-1.5 w-40 sm:w-48"
                      />
                    </div>

                    <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                      <button
                        onClick={() => setPresenceFilter('all')}
                        className={`px-3 py-1 rounded-lg font-medium transition ${
                          presenceFilter === 'all'
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Semua ({students.length})
                      </button>
                      <button
                        onClick={() => setPresenceFilter('online')}
                        className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition ${
                          presenceFilter === 'online'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Online ({stats?.onlineStudents ?? students.filter((s) => s.is_online).length})
                      </button>
                      <button
                        onClick={() => setPresenceFilter('offline')}
                        className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1.5 transition ${
                          presenceFilter === 'offline'
                            ? 'bg-slate-700 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Offline ({stats?.offlineStudents ?? students.filter((s) => !s.is_online).length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Student Table */}
                {filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500">
                    Tidak ada data siswa yang cocok dengan filter.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 font-semibold">
                          <th className="py-3 px-3">Siswa</th>
                          <th className="py-3 px-3">Kelas & Instansi</th>
                          <th className="py-3 px-3">Status Presence</th>
                          <th className="py-3 px-3">Terakhir Aktif</th>
                          <th className="py-3 px-3">Absensi Hari Ini</th>
                          <th className="py-3 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredStudents.map((s: any) => {
                          const todayAtt = s.today_attendance

                          return (
                            <tr
                              key={s.id}
                              onClick={() => {
                                setSelectedStudentId(s.id)
                                setStudentDetailModalOpen(true)
                              }}
                              className="hover:bg-white/5 transition cursor-pointer group"
                            >
                              {/* Siswa */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs border border-white/10 overflow-hidden flex-shrink-0">
                                      {s.avatar_url ? (
                                        <img
                                          src={s.avatar_url}
                                          alt={s.full_name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        (s.full_name?.charAt(0) || 'S').toUpperCase()
                                      )}
                                    </div>
                                    <span
                                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                                        s.is_online ? 'bg-emerald-500' : 'bg-slate-500'
                                      }`}
                                    />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white group-hover:text-purple-300 transition">
                                      {s.full_name}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                      {s.class_name || 'Kelas -'} • {s.username || s.email}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Kelas & Instansi */}
                              <td className="py-3 px-3">
                                <p className="font-medium text-gray-200 truncate max-w-[180px]">
                                  {placeTitle}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate max-w-[180px]">
                                  {s.major || s.class_name || 'Peserta PKL'}
                                </p>
                              </td>

                              {/* Status Presence */}
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                    s.is_online
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      s.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                                    }`}
                                  />
                                  {s.is_online ? 'Online' : 'Offline'}
                                </span>
                              </td>

                              {/* Terakhir Aktif */}
                              <td className="py-3 px-3 text-gray-300">
                                <span className="text-[11px]">{formatLastSeen(s.last_seen)}</span>
                              </td>

                              {/* Absensi Hari Ini */}
                              <td className="py-3 px-3">
                                {todayAtt ? (
                                  <span className={`badge text-[11px] ${getStatusBadge(todayAtt.check_in_status)}`}>
                                    <span>{getStatusEmoji(todayAtt.check_in_status)}</span>
                                    <span>{getStatusLabel(todayAtt.check_in_status)}</span>
                                    {todayAtt.check_in_time && (
                                      <span className="text-[10px] opacity-75">
                                        ({formatTime(todayAtt.check_in_time)})
                                      </span>
                                    )}
                                  </span>
                                ) : !s.is_within_period ? (
                                  <span className="text-[10px] text-gray-500 italic">
                                    Di luar periode PKL
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                    Belum Absen
                                  </span>
                                )}
                              </td>

                              {/* Aksi */}
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedStudentId(s.id)
                                    setStudentDetailModalOpen(true)
                                  }}
                                  className="btn-outline text-[11px] py-1 px-2.5 hover:border-purple-500"
                                >
                                  Detail
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 2: PESERTA DIDIK PKL (Master Data Siswa Bimbingan)
             ======================================================== */}
          {currentView === 'students' && (
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <UserCheck className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Manajemen Peserta Didik PKL</h2>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Daftar siswa bimbingan di <b className="text-white">{placeTitle}</b>. Kelola akun, perbarui data, atau reset password.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportPresensiCSV}
                    className="btn-outline py-2 px-3 text-xs flex items-center gap-1.5 rounded-xl border-white/10 text-gray-200 hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateStudent}
                    className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2 px-4 text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-500/25"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Buat Akun Siswa</span>
                  </button>
                </div>
              </div>

              {/* 4 Metrics for Students */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-card p-4 border border-white/10 rounded-2xl">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Total Siswa Bimbingan</span>
                  <div className="text-2xl font-black text-white mt-1">{students.length}</div>
                </div>
                <div className="glass-card p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
                  <span className="text-[11px] text-emerald-400 font-semibold uppercase">Siswa Aktif</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {students.filter((s) => s.is_active !== false).length}
                  </div>
                </div>
                <div className="glass-card p-4 border border-blue-500/20 bg-blue-500/5 rounded-2xl">
                  <span className="text-[11px] text-blue-400 font-semibold uppercase">Login Ready (Username)</span>
                  <div className="text-2xl font-black text-blue-400 mt-1">
                    {students.filter((s) => s.username).length}
                  </div>
                </div>
                <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5 rounded-2xl">
                  <span className="text-[11px] text-amber-400 font-semibold uppercase">Sedang Online</span>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {students.filter((s) => s.is_online).length}
                  </div>
                </div>
              </div>

              {/* Table of Students */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02]">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari siswa, username, kelas..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-field text-xs pl-8 py-1.5 w-full"
                    />
                  </div>
                  <span className="text-xs text-gray-400">Menampilkan {filteredStudents.length} siswa</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">No</th>
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Username / Email</th>
                        <th className="py-3 px-4">Kelas & Jurusan</th>
                        <th className="py-3 px-4">WhatsApp</th>
                        <th className="py-3 px-4">Status PKL</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-500">
                            Tidak ada siswa yang cocok.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4 text-gray-500 font-mono">{idx + 1}</td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{s.full_name}</span>
                                {s.is_online && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Online" />
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono text-purple-300 font-semibold">
                                {s.username || s.email}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-gray-300">
                              {s.class_name || '-'} {s.major ? `• ${s.major}` : ''}
                            </td>
                            <td className="py-3.5 px-4 text-gray-300">{s.phone || '-'}</td>
                            <td className="py-3.5 px-4">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                                {s.internship_status || 'aktif'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(s.id)
                                    setStudentDetailModalOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                                  title="Detail Siswa"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleOpenEditStudent(s, e)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                                  title="Edit Biodata Siswa"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleOpenResetPassword(s, e)}
                                  className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300"
                                  title="Ganti Password / Reset PIN Siswa"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => handleOpenDeleteStudent(s, e)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                                  title="Hapus Siswa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 3: RIWAYAT ABSENSI (Identik dengan /admin/attendances)
             ======================================================== */}
          {currentView === 'attendances' && (
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <ClipboardList className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Riwayat Absensi Siswa PKL</h2>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Catatan kehadiran, swafoto selfie, titik lokasi GPS, dan waktu check-in/out di <b className="text-white">{placeTitle}</b>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleExportPresensiCSV}
                    className="btn-outline py-2 px-3 text-xs flex items-center gap-1.5 rounded-xl border-white/10 text-gray-200 hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                  <button
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="btn-outline py-2 px-3 text-xs flex items-center gap-1.5 rounded-xl"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>Perbarui</span>
                  </button>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="glass-card p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <div className="relative w-48 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama siswa..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-field text-xs pl-8 py-1.5 w-full"
                    />
                  </div>

                  <input
                    type="date"
                    value={attendanceDateFilter}
                    onChange={(e) => setAttendanceDateFilter(e.target.value)}
                    className="input-field text-xs py-1.5 px-3 w-40"
                  />

                  <select
                    value={attendanceStatusFilter}
                    onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                    className="input-field text-xs py-1.5 px-3 w-36"
                  >
                    <option value="">Semua Status</option>
                    <option value="on_time">Tepat Waktu</option>
                    <option value="late">Terlambat</option>
                    <option value="izin">Izin</option>
                    <option value="sakit">Sakit</option>
                    <option value="alpha">Alpha</option>
                  </select>

                  {(attendanceDateFilter || attendanceStatusFilter || search) && (
                    <button
                      onClick={() => {
                        setAttendanceDateFilter('')
                        setAttendanceStatusFilter('')
                        setSearch('')
                      }}
                      className="text-xs text-rose-400 hover:underline px-2 py-1"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                <span className="text-xs text-gray-400">
                  Total {filteredAttendances.length} catatan absensi
                </span>
              </div>

              {/* Table of Attendances */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Jam Masuk</th>
                        <th className="py-3 px-4">Jam Pulang</th>
                        <th className="py-3 px-4">Lembur</th>
                        <th className="py-3 px-4">Foto Swafoto</th>
                        <th className="py-3 px-4">Lokasi GPS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredAttendances.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-500">
                            Tidak ada data absensi yang sesuai kriteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAttendances.map((att) => {
                          const checkInPhoto = att.attendance_photos?.find((p: any) => p.photo_type === 'check_in')?.photo_url
                          const checkOutPhoto = att.attendance_photos?.find((p: any) => p.photo_type === 'check_out')?.photo_url

                          return (
                            <tr key={att.id} className="hover:bg-white/[0.02]">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white">{att.users?.full_name || 'Siswa'}</div>
                                <div className="text-[10px] text-gray-400">{att.users?.class_name || '-'}</div>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-gray-300">{att.date}</td>
                              <td className="py-3.5 px-4">
                                <span className={`badge text-[10px] ${getStatusBadge(att.check_in_status)}`}>
                                  <span>{getStatusEmoji(att.check_in_status)}</span>
                                  <span>{getStatusLabel(att.check_in_status)}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-white">
                                {att.check_in_time ? formatTime(att.check_in_time) : '--:--'}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-white">
                                {att.check_out_time ? formatTime(att.check_out_time) : '--:--'}
                              </td>
                              <td className="py-3.5 px-4">
                                {att.is_overtime && att.overtime_minutes > 0 ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                    ⚡ +{formatOvertimeShort(att.overtime_minutes)}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  {checkInPhoto ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImage(checkInPhoto)}
                                      className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 hover:scale-110 transition"
                                      title="Lihat Foto Masuk"
                                    >
                                      <img src={checkInPhoto} alt="Masuk" className="w-full h-full object-cover" />
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-500">-</span>
                                  )}
                                  {checkOutPhoto && (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewImage(checkOutPhoto)}
                                      className="w-7 h-7 rounded-lg overflow-hidden border border-amber-500/30 hover:scale-110 transition"
                                      title="Lihat Foto Pulang"
                                    >
                                      <img src={checkOutPhoto} alt="Pulang" className="w-full h-full object-cover" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                {att.check_in_lat && att.check_in_lng ? (
                                  <button
                                    onClick={() =>
                                      setMapModal({
                                        isOpen: true,
                                        lat: Number(att.check_in_lat),
                                        lng: Number(att.check_in_lng),
                                        title: `Lokasi Absensi: ${att.users?.full_name}`,
                                        address: att.check_in_address,
                                      })
                                    }
                                    className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition flex items-center gap-1 text-[10px] px-2"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    <span>Peta</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-gray-500">Tidak ada</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 4: REKAP LEMBUR SISWA
             ======================================================== */}
          {currentView === 'overtime' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-orange-950/10">
                  <span className="text-xs font-semibold text-gray-400">Total Sesi Lembur</span>
                  <div className="mt-2 text-2xl font-black text-white">{overtimes.length}</div>
                  <p className="text-[11px] text-gray-400 mt-1">Sesi lembur tercatat</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-950/20 to-amber-950/10">
                  <span className="text-xs font-semibold text-gray-400">Akumulasi Lembur</span>
                  <div className="mt-2 text-2xl font-black text-amber-300">
                    {formatOvertimeShort(overtimes.reduce((acc, cur) => acc + (cur.overtime_minutes || 0), 0))}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Durasi total seluruh siswa</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-indigo-950/10">
                  <span className="text-xs font-semibold text-gray-400">Siswa Lembur</span>
                  <div className="mt-2 text-2xl font-black text-purple-300">
                    {new Set(overtimes.map((o) => o.user_id)).size}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Siswa berpartisipasi</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/10 bg-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-400">Jadwal Lembur Instansi</span>
                    <div className="text-sm font-bold text-white mt-1">
                      Mulai: <span className="text-amber-400">{scheduleForm.overtime_start_time}</span> s/d 24:00
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduleModalOpen(true)}
                    className="mt-3 w-full py-1.5 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Atur Jam Lembur</span>
                  </button>
                </div>
              </div>

              {/* Table of Overtime Sessions */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="font-bold text-white text-sm">Daftar Lembur Siswa PKL</h3>
                  <span className="text-xs text-gray-400">Instansi: {placeTitle}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Durasi Lembur</th>
                        <th className="py-3 px-4">Waktu Mulai - Selesai</th>
                        <th className="py-3 px-4">Catatan Kegiatan</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi Pembimbing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {overtimes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-500">
                            Belum ada catatan lembur siswa.
                          </td>
                        </tr>
                      ) : (
                        overtimes.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4 font-bold text-white">
                              {item.users?.full_name || 'Siswa'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-gray-300">{item.date}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                              {formatOvertimeShort(item.overtime_minutes || 0)}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-gray-400">
                              {item.start_time ? formatTime(item.start_time) : '--:--'} s/d{' '}
                              {item.end_time ? formatTime(item.end_time) : '--:--'}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs truncate text-gray-300">
                              {item.notes || '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  item.status === 'approved'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : item.status === 'rejected'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {item.status === 'approved'
                                  ? 'Disetujui'
                                  : item.status === 'rejected'
                                  ? 'Ditolak'
                                  : 'Menunggu'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditOvertime(item)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300"
                                  title="Edit / Koreksi Jam Lembur"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {item.status !== 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOvertimeStatus(item.id, 'approved')}
                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                    title="Setujui Lembur"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {item.status !== 'rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateOvertimeStatus(item.id, 'rejected')}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                                    title="Tolak Lembur"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 5: PENGAJUAN IZIN & SAKIT
             ======================================================== */}
          {currentView === 'permits' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-indigo-950/10">
                  <span className="text-xs font-semibold text-gray-400">Total Pengajuan</span>
                  <div className="mt-2 text-2xl font-black text-white">{permits.length}</div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-orange-950/10">
                  <span className="text-xs font-semibold text-gray-400">Menunggu Review</span>
                  <div className="mt-2 text-2xl font-black text-amber-400">{pendingPermitsCount}</div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-xs font-semibold text-emerald-400">Disetujui</span>
                  <div className="mt-2 text-2xl font-black text-emerald-400">
                    {permits.filter((p) => p.status === 'disetujui').length}
                  </div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
                  <span className="text-xs font-semibold text-rose-400">Ditolak</span>
                  <div className="mt-2 text-2xl font-black text-rose-400">
                    {permits.filter((p) => p.status === 'ditolak').length}
                  </div>
                </div>
              </div>

              {/* Table of Permits */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="font-bold text-white text-sm">Daftar Pengajuan Izin & Sakit</h3>
                  <span className="text-xs text-gray-400">Instansi: {placeTitle}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Tipe</th>
                        <th className="py-3 px-4">Rentang Tanggal</th>
                        <th className="py-3 px-4">Alasan</th>
                        <th className="py-3 px-4">Surat Dokter</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {permits.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-500">
                            Belum ada permohonan izin/sakit siswa.
                          </td>
                        </tr>
                      ) : (
                        permits.map((p) => (
                          <tr key={p.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4 font-bold text-white">
                              {p.users?.full_name || 'Siswa'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  p.type === 'sakit'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                {p.type === 'sakit' ? 'Sakit' : 'Izin'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-gray-300">
                              {p.start_date} s/d {p.end_date}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs truncate text-gray-300">{p.reason}</td>
                            <td className="py-3.5 px-4">
                              {p.attachment_url ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(p.attachment_url)}
                                  className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat Surat</span>
                                </button>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  p.status === 'disetujui'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : p.status === 'ditolak'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {p.status === 'menunggu' ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenReviewPermit(p, 'disetujui')}
                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                    title="Setujui"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenReviewPermit(p, 'ditolak')}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                                    title="Tolak"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-[11px]">Selesai</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 6: JURNAL KEGIATAN PKL
             ======================================================== */}
          {currentView === 'journals' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5">
                  <span className="text-xs font-semibold text-gray-400">Total Jurnal Dikirim</span>
                  <div className="mt-2 text-2xl font-black text-white">{journals.length}</div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-xs font-semibold text-emerald-400">Telah Dinilai / Paraf</span>
                  <div className="mt-2 text-2xl font-black text-emerald-400">
                    {journals.filter((j) => j.mentor_rating).length}
                  </div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                  <span className="text-xs font-semibold text-amber-400">Menunggu Ulasan</span>
                  <div className="mt-2 text-2xl font-black text-amber-400">
                    {journals.filter((j) => !j.mentor_rating).length}
                  </div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/10 bg-white/5">
                  <span className="text-xs font-semibold text-gray-400">Rata-rata Rating</span>
                  <div className="mt-2 text-2xl font-black text-amber-300 flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span>
                      {journals.filter((j) => j.mentor_rating).length > 0
                        ? (
                            journals.reduce((acc, cur) => acc + (cur.mentor_rating || 0), 0) /
                            journals.filter((j) => j.mentor_rating).length
                          ).toFixed(1)
                        : '0.0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Table of Journals */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="font-bold text-white text-sm">Laporan Kegiatan Harian PKL</h3>
                  <span className="text-xs text-gray-400">Instansi: {placeTitle}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Uraian Pekerjaan</th>
                        <th className="py-3 px-4">Kendala / Solusi</th>
                        <th className="py-3 px-4">Nilai & Paraf Mentor</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {journals.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">
                            Belum ada laporan jurnal dari siswa.
                          </td>
                        </tr>
                      ) : (
                        journals.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4 font-bold text-white">
                              {item.users?.full_name || 'Siswa'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-gray-300">{item.date}</td>
                            <td className="py-3.5 px-4 max-w-sm truncate text-gray-200">
                              {item.activity_description || '-'}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs truncate text-gray-400">
                              {item.challenges_solutions || '-'}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.mentor_rating ? (
                                <div className="flex items-center gap-1 text-amber-400 font-bold font-mono">
                                  <span>⭐ {item.mentor_rating}/5</span>
                                  {item.mentor_notes && (
                                    <span className="text-[10px] text-gray-400 font-normal">
                                      ({item.mentor_notes})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-amber-400/80 italic text-[11px]">Belum dinilai</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenJournalReview(item)}
                                className="py-1 px-2.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition text-xs font-semibold"
                              >
                                {item.mentor_rating ? 'Ubah Nilai' : 'Beri Nilai ⭐'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 7: PENGUMUMAN SISWA INSTANSI
             ======================================================== */}
          {currentView === 'announcements' && (
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <Megaphone className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Broadcast Pengumuman Instansi</h2>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Pengumuman yang dibuat di sini disiarkan langsung ke banner dashboard seluruh siswa PKL di <b className="text-white">{placeTitle}</b>.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateAnnouncement}
                  className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 px-4 text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-500/25"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>+ Buat Pengumuman Baru</span>
                </button>
              </div>

              {/* Announcements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myAnnouncements.length === 0 ? (
                  <div className="md:col-span-2 glass-card p-12 text-center text-gray-500 rounded-2xl">
                    Belum ada pengumuman yang disiarkan di instansi ini.
                  </div>
                ) : (
                  myAnnouncements.map((item) => (
                    <div
                      key={item.id}
                      className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between gap-4 hover:border-purple-500/30 transition shadow-lg"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                              item.type === 'urgent'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : item.type === 'warning'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : item.type === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {item.type}
                          </span>

                          {item.is_pinned && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-bold">
                              <Pin className="w-3 h-3" /> Disematkan
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-white text-base">{item.title}</h3>
                        <p className="text-xs text-gray-300 mt-2 whitespace-pre-line line-clamp-4">
                          {item.content}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                        <span>{formatDate(new Date(item.created_at))}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAnnouncement(item)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                            title="Edit Pengumuman"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(item.id)}
                            disabled={deletingAnnouncementId === item.id}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            title="Hapus Pengumuman"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 8: KALENDER PRESENSI (Identik dengan /admin/calendar)
             ======================================================== */}
          {currentView === 'calendar' && (
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <CalendarDays className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Kalender Presensi Siswa PKL</h2>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Visualisasi kalender bulanan, hari kerja, libur nasional, dan kehadiran di <b className="text-white">{placeTitle}</b>.
                    </p>
                  </div>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
                    title="Bulan Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="font-bold text-sm text-white px-3 font-mono">
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </div>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
                    title="Bulan Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid & Day Detail */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar (2 cols) */}
                <div className="lg:col-span-2 glass-card p-5 rounded-2xl border border-white/10">
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 pb-2 border-b border-white/10 mb-2">
                    <div className="text-rose-400">Min</div>
                    <div>Sen</div>
                    <div>Sel</div>
                    <div>Rab</div>
                    <div>Kam</div>
                    <div>Jum</div>
                    <div className="text-rose-400">Sab</div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {/* Blank padding for offset */}
                    {Array.from({ length: startDayOffset }).map((_, i) => (
                      <div key={`blank-${i}`} className="h-20 rounded-xl bg-white/[0.01]" />
                    ))}

                    {/* Days of month */}
                    {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                      const dayNum = i + 1
                      const dateStr = `${calendarYear}-${(calendarMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`
                      const isToday = dateStr === todayDateStr
                      const isSelected = dateStr === selectedCalendarDate
                      const dayAttendances = attendancesByDate[dateStr] || []
                      const holiday = getHolidayInfo(dateStr)

                      return (
                        <div
                          key={dateStr}
                          onClick={() => setSelectedCalendarDate(dateStr)}
                          className={`h-20 p-2 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 shadow-md ring-1 ring-purple-500'
                              : isToday
                              ? 'bg-white/10 border-white/20'
                              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold font-mono ${
                                isToday
                                  ? 'w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center'
                                  : holiday
                                  ? 'text-rose-400'
                                  : 'text-gray-300'
                              }`}
                            >
                              {dayNum}
                            </span>
                            {holiday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title={holiday.name || undefined} />
                            )}
                          </div>

                          {/* Dots for attendance statuses */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {dayAttendances.slice(0, 4).map((a, idx) => (
                              <span
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  a.check_in_status === 'on_time'
                                    ? 'bg-emerald-400'
                                    : a.check_in_status === 'late'
                                    ? 'bg-amber-400'
                                    : a.check_in_status === 'izin'
                                    ? 'bg-blue-400'
                                    : a.check_in_status === 'sakit'
                                    ? 'bg-purple-400'
                                    : 'bg-rose-400'
                                }`}
                              />
                            ))}
                            {dayAttendances.length > 4 && (
                              <span className="text-[9px] text-gray-400 font-mono">
                                +{dayAttendances.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Day Detail Panel (1 col) */}
                <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col gap-4">
                  <div className="border-b border-white/10 pb-3">
                    <span className="text-xs text-purple-400 uppercase font-bold tracking-wider">
                      Detail Kehadiran Harian
                    </span>
                    <h3 className="font-bold text-white text-base mt-1">{selectedCalendarDate}</h3>
                    {getHolidayInfo(selectedCalendarDate) && (
                      <p className="text-xs text-rose-400 font-semibold mt-1">
                        🎉 {getHolidayInfo(selectedCalendarDate)?.name}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[400px] custom-scrollbar">
                    {(attendancesByDate[selectedCalendarDate] || []).length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-500">
                        Tidak ada rekaman presensi pada tanggal ini.
                      </div>
                    ) : (
                      (attendancesByDate[selectedCalendarDate] || []).map((att) => (
                        <div
                          key={att.id}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-white text-xs">
                              {att.users?.full_name || 'Siswa'}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              Masuk: {att.check_in_time ? formatTime(att.check_in_time) : '--:--'} • Pulang:{' '}
                              {att.check_out_time ? formatTime(att.check_out_time) : '--:--'}
                            </div>
                          </div>
                          <span className={`badge text-[9px] ${getStatusBadge(att.check_in_status)}`}>
                            {getStatusLabel(att.check_in_status)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 9: AKTIVITAS LOGIN (Identik dengan /admin/login-activity)
             ======================================================== */}
          {currentView === 'login-activity' && (
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <Smartphone className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Monitoring Aktivitas Login & Perangkat</h2>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Pantau sesi perangkat siswa PKL, deteksi multi-device, atau akhiri sesi login yang mencurigakan di <b className="text-white">{placeTitle}</b>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                  className="btn-outline py-2 px-3 text-xs flex items-center gap-1.5 rounded-xl"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Perbarui</span>
                </button>
              </div>

              {/* Multi Device Alert */}
              {multiDeviceAlerts.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">
                      Terdeteksi Login Bersamaan di Beberapa Perangkat!
                    </h4>
                    <p className="text-xs text-amber-200/80 mt-1">
                      Siswa berikut terdeteksi login aktif di lebih dari 1 gawai/laptop dalam waktu bersamaan:{' '}
                      <b className="text-white">{multiDeviceAlerts.map((a: any) => a.user_name).join(', ')}</b>. Anda dapat mengakhiri sesi yang tidak sah di bawah ini.
                    </p>
                  </div>
                </div>
              )}

              {/* Table of Sessions */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="font-bold text-white text-sm">Daftar Sesi Perangkat Siswa ({sessions.length})</h3>
                  <span className="text-xs text-gray-400">Instansi: {placeTitle}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Gawai / Device</th>
                        <th className="py-3 px-4">Browser & OS</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Terakhir Aktif</th>
                        <th className="py-3 px-4">Status Sesi</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sessions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-500">
                            Belum ada riwayat sesi perangkat yang tercatat.
                          </td>
                        </tr>
                      ) : (
                        sessions.map((sess) => (
                          <tr key={sess.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white">{sess.users?.full_name || 'Siswa'}</div>
                              <div className="text-[10px] text-gray-400">{sess.users?.class_name || '-'}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-gray-200">
                              <div className="flex items-center gap-1.5">
                                {sess.device_type === 'mobile' ? (
                                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                                ) : (
                                  <Laptop className="w-3.5 h-3.5 text-purple-400" />
                                )}
                                <span>{sess.device_name || sess.device_type || 'Perangkat'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-gray-300">
                              {sess.browser || 'Browser'} • {sess.os || 'OS'}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-gray-400">{sess.ip_address || '-'}</td>
                            <td className="py-3.5 px-4 text-gray-300">
                              {formatLastSeen(sess.last_active_at)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  sess.is_active
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                }`}
                              >
                                {sess.is_active ? 'Aktif' : 'Berakhir'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {sess.is_active && (
                                <button
                                  type="button"
                                  onClick={() => handleTerminateSession(sess.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                  title="Akhiri Sesi Login Ini"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================
          MODAL 1: STUDENT DETAIL MODAL (Fitur 12)
         ======================================================== */}
      <StudentDetailModal
        isOpen={studentDetailModalOpen}
        onClose={() => setStudentDetailModalOpen(false)}
        studentId={selectedStudentId}
      />

      {/* ========================================================
          MODAL 2: BUAT AKUN SISWA
         ======================================================== */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-purple-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                Daftarkan Siswa PKL Baru
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-field text-xs w-full mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="budisantoso"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field text-xs w-full mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300">Password / PIN *</label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Default: 123"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="input-field text-xs w-full pr-8 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300">Kelas</label>
                  <input
                    type="text"
                    placeholder="XII RPL 1"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="input-field text-xs w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300">Jurusan</label>
                  <input
                    type="text"
                    placeholder="Rekayasa Perangkat Lunak"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="input-field text-xs w-full mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300">No. WhatsApp</label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field text-xs w-full mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300">Email (Opsional)</label>
                  <input
                    type="email"
                    placeholder="budi@sekolah.sch.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field text-xs w-full mt-1"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingStudent}
                  className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 py-2 px-5 text-xs font-bold rounded-xl shadow-lg shadow-purple-500/25"
                >
                  {submittingStudent ? 'Mendaftarkan...' : 'Simpan Akun Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: EDIT BIODATA SISWA
         ======================================================== */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-purple-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Pencil className="w-4 h-4 text-purple-400" />
                Edit Biodata Siswa: {selectedStudentForEdit?.full_name}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-field text-xs w-full mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field text-xs w-full mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300">Ubah Password / PIN</label>
                  <input
                    type="text"
                    placeholder="Kosongkan jika tidak ubah"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field text-xs w-full mt-1 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300">Kelas</label>
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="input-field text-xs w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300">Jurusan</label>
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="input-field text-xs w-full mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300">No. WhatsApp</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field text-xs w-full mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300">Status PKL</label>
                  <select
                    value={formData.internship_status}
                    onChange={(e) => setFormData({ ...formData, internship_status: e.target.value })}
                    className="input-field text-xs w-full mt-1"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="selesai">Selesai</option>
                    <option value="ditarik">Ditarik</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingStudent}
                  className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 py-2 px-5 text-xs font-bold rounded-xl shadow-lg shadow-purple-500/25"
                >
                  {submittingStudent ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: RESET PASSWORD SISWA
         ======================================================== */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl border border-amber-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Reset Password / PIN
              </h3>
              <button onClick={() => setResetModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Ubah password akun siswa <b className="text-white">{studentToReset?.full_name}</b> ({studentToReset?.username || studentToReset?.email}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300">Password Baru</label>
                <input
                  type="text"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="input-field text-xs w-full mt-1 font-mono"
                  placeholder="123"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="btn-primary bg-amber-600 hover:bg-amber-500 py-2 px-5 text-xs font-bold rounded-xl"
                >
                  {submittingReset ? 'Mereset...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: HAPUS SISWA
         ======================================================== */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl border border-rose-500/30 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Hapus Akun Siswa?</h3>
            <p className="text-xs text-gray-300">
              Apakah Anda yakin ingin menghapus siswa <b className="text-white">{studentToDelete?.full_name}</b>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="btn-outline py-2 px-4 text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={deletingStudent}
                className="btn-primary bg-rose-600 hover:bg-rose-500 py-2 px-5 text-xs font-bold rounded-xl"
              >
                {deletingStudent ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 6: EDIT DURASI LEMBUR
         ======================================================== */}
      {editOvertimeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl border border-amber-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Koreksi Jam Lembur Siswa
              </h3>
              <button onClick={() => setEditOvertimeModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOvertimeEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300">Jam</label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={editOvertimeHours}
                    onChange={(e) => setEditOvertimeHours(Number(e.target.value))}
                    className="input-field text-xs w-full mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300">Menit</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={editOvertimeMinutesPart}
                    onChange={(e) => setEditOvertimeMinutesPart(Number(e.target.value))}
                    className="input-field text-xs w-full mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Catatan Koreksi</label>
                <textarea
                  rows={2}
                  value={editOvertimeNotes}
                  onChange={(e) => setEditOvertimeNotes(e.target.value)}
                  className="input-field text-xs w-full mt-1"
                  placeholder="Alasan perubahan durasi lembur..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditOvertimeModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingEditOvertime}
                  className="btn-primary bg-amber-600 hover:bg-amber-500 py-2 px-5 text-xs font-bold rounded-xl"
                >
                  {submittingEditOvertime ? 'Menyimpan...' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 7: REVIEW PERMIT (IZIN & SAKIT)
         ======================================================== */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl border border-purple-500/30 p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">
              {actionType === 'disetujui' ? 'Setujui Permohonan Izin?' : 'Tolak Permohonan Izin?'}
            </h3>
            <p className="text-xs text-gray-300">
              Permohonan {selectedPermit?.type} dari <b className="text-white">{selectedPermit?.users?.full_name}</b> pada tanggal {selectedPermit?.start_date} s/d {selectedPermit?.end_date}.
            </p>

            <form onSubmit={handleSavePermitReview} className="space-y-4">
              {actionType === 'ditolak' && (
                <div>
                  <label className="text-xs font-semibold text-gray-300">Alasan Penolakan</label>
                  <textarea
                    required
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="input-field text-xs w-full mt-1"
                    placeholder="Contoh: Bukti surat tidak valid..."
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`btn-primary py-2 px-5 text-xs font-bold rounded-xl ${
                    actionType === 'disetujui'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {submittingReview ? 'Memproses...' : actionType === 'disetujui' ? 'Setujui' : 'Tolak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 8: REVIEW JURNAL KEGIATAN
         ======================================================== */}
      {journalModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl border border-purple-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                Ulasan & Penilaian Jurnal PKL
              </h3>
              <button onClick={() => setJournalModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl">
              <p className="font-bold text-white">{selectedJournalForReview?.users?.full_name}</p>
              <p className="mt-1">{selectedJournalForReview?.activity_description}</p>
            </div>

            <form onSubmit={handleSaveJournalReview} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Rating Hasil Kerja (1-5 Bintang)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="text-2xl transition hover:scale-125"
                    >
                      {star <= reviewRating ? '⭐' : '☆'}
                    </button>
                  ))}
                  <span className="text-xs text-amber-300 font-bold ml-2">({reviewRating} / 5)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Catatan & Paraf Mentor</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="input-field text-xs w-full mt-1"
                  placeholder="Bagus, pertahankan kedisiplinan dan kerapian laporan..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setJournalModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingJournalReview}
                  className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 py-2 px-5 text-xs font-bold rounded-xl"
                >
                  {submittingJournalReview ? 'Menyimpan...' : 'Simpan Nilai & Paraf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 9: BUAT / EDIT PENGUMUMAN
         ======================================================== */}
      {announcementModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-purple-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-purple-400" />
                {selectedAnnouncementForEdit ? 'Edit Pengumuman Instansi' : 'Buat Pengumuman Baru'}
              </h3>
              <button onClick={() => setAnnouncementModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300">Judul Pengumuman *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jadwal Briefing Proyek PKL Hari Jumat"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="input-field text-xs w-full mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300">Kategori / Tipe</label>
                  <select
                    value={announcementType}
                    onChange={(e: any) => setAnnouncementType(e.target.value)}
                    className="input-field text-xs w-full mt-1"
                  >
                    <option value="info">Informasi (Biru)</option>
                    <option value="warning">Peringatan (Kuning)</option>
                    <option value="urgent">Mendesak (Merah)</option>
                    <option value="success">Berita Baik (Hijau)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="pinCheck"
                    checked={announcementPinned}
                    onChange={(e) => setAnnouncementPinned(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="pinCheck" className="text-xs font-semibold text-gray-300 cursor-pointer flex items-center gap-1">
                    <Pin className="w-3.5 h-3.5 text-purple-400" />
                    Sematkan di Atas (Pin)
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">Isi Pesan Pengumuman *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tuliskan instruksi atau informasi penting untuk seluruh anak PKL..."
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  className="input-field text-xs w-full mt-1"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAnnouncement}
                  className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 py-2 px-5 text-xs font-bold rounded-xl"
                >
                  {submittingAnnouncement ? 'Menyimpan...' : 'Siarkan Pengumuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 10: ATUR JAM KERJA & LEMBUR INSTANSI
         ======================================================== */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl border border-amber-500/30 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                Atur Jam Kerja & Lembur Instansi
              </h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Pengaturan jam masuk, pulang, dan jam mulai lembur untuk instansi <b className="text-white">{placeTitle}</b>.
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300">Jam Masuk Reguler</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.work_start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, work_start_time: e.target.value })}
                    className="input-field text-xs w-full mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300">Jam Pulang Reguler</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.work_end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, work_end_time: e.target.value })}
                    className="input-field text-xs w-full mt-1 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300">
                  Jam Mulai Hitung Lembur (Malam s/d 24:00)
                </label>
                <input
                  type="time"
                  required
                  value={scheduleForm.overtime_start_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, overtime_start_time: e.target.value })}
                  className="input-field text-xs w-full mt-1 font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Check-out setelah jam ini akan dihitung sebagai sesi lembur siswa otomatis.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="allowOvertime"
                  checked={scheduleForm.allow_overtime}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, allow_overtime: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="allowOvertime" className="text-xs font-semibold text-gray-300 cursor-pointer">
                  Izinkan Fitur Lembur di Instansi Ini
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="btn-outline py-2 px-4 text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingSchedule}
                  className="btn-primary bg-amber-600 hover:bg-amber-500 py-2 px-5 text-xs font-bold rounded-xl"
                >
                  {submittingSchedule ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 11: PREVIEW FOTO / GAMBAR
         ======================================================== */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 12: LEAFLET MAP MODAL (Geotag Absensi)
         ======================================================== */}
      {mapModal.isOpen && (
        <LeafletMapModal
          isOpen={mapModal.isOpen}
          onClose={() => setMapModal({ ...mapModal, isOpen: false })}
          lat={mapModal.lat}
          lng={mapModal.lng}
          title={mapModal.title}
          address={mapModal.address}
        />
      )}
    </div>
  )
}

export default function PembimbingPage() {
  return (
    <ToastProvider>
      <PembimbingPortalContent />
    </ToastProvider>
  )
}
