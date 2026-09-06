'use client'

import React, { useEffect, useState, useCallback } from 'react'
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
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Building,
  FileText,
  Smartphone,
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
  formatOvertimeDuration,
  formatOvertimeShort,
} from '@/lib/utils'
import NotificationCenter from '@/components/NotificationCenter'
import StudentDetailModal from '@/components/StudentDetailModal'
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

function PembimbingPortalContent() {
  const router = useRouter()
  const { showToast } = useToast()

  // Navigation & View state (Matches Superadmin layout)
  const [currentView, setCurrentView] = useState<
    'dashboard' | 'attendance' | 'overtime' | 'permits' | 'journals' | 'announcements'
  >('dashboard')
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
  const [permits, setPermits] = useState<any[]>([])
  const [journals, setJournals] = useState<any[]>([])
  const [overtimes, setOvertimes] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'offline'>('all')

  // Modals state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [studentDetailModalOpen, setStudentDetailModalOpen] = useState(false)

  // Student CRUD states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<any>(null)
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

  // Announcement states for Pembimbing
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

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null)

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
      const [resStats, resPermits, resJournals, resOvertimes, resAnnounce] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/permits'),
        fetch('/api/journals'),
        fetch('/api/overtime'),
        fetch('/api/announcements'),
      ])

      if (resStats.ok) {
        const sData = await resStats.json()
        setDataStats(sData)
        setStudents(sData.students || [])
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
      setStudentToDelete(null)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setDeletingStudent(false)
    }
  }

  // Overtime Handlers
  const handleOpenEditOvertime = (item: any) => {
    setSelectedOvertimeForEdit(item)
    const totalMinutes = item.overtime_minutes || 0
    setEditOvertimeHours(Math.floor(totalMinutes / 60))
    setEditOvertimeMinutesPart(totalMinutes % 60)
    setEditOvertimeNotes(item.overtime_notes || '')
    setEditOvertimeModalOpen(true)
  }

  const handleSaveOvertime = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOvertimeForEdit) return
    setSubmittingEditOvertime(true)
    try {
      const computedMinutes = (Number(editOvertimeHours) || 0) * 60 + (Number(editOvertimeMinutesPart) || 0)
      const res = await fetch(`/api/overtime/${selectedOvertimeForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overtime_minutes: computedMinutes,
          overtime_notes: editOvertimeNotes,
          is_overtime: computedMinutes > 0,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui data lembur')

      showToast('Data lembur berhasil diperbarui!', 'success')
      setEditOvertimeModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingEditOvertime(false)
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

      showToast('Ulasan dan nilai jurnal berhasil disimpan!', 'success')
      setJournalModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingJournalReview(false)
    }
  }

  // Permit Review Handlers
  const handleOpenReviewPermit = (permit: any, type: 'disetujui' | 'ditolak') => {
    setSelectedPermit(permit)
    setActionType(type)
    setRejectionReason('')
    setReviewModalOpen(true)
  }

  const handleReviewPermitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPermit) return
    setSubmittingReview(true)
    try {
      const res = await fetch(`/api/permits/${selectedPermit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType,
          rejection_reason: rejectionReason,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memproses pengajuan')

      showToast(json.message || 'Status pengajuan berhasil diperbarui', 'success')
      setReviewModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  // Save Schedule Handler
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mentor?.internship_place_id) {
      showToast('Akun Anda belum terhubung dengan instansi penugasan PKL.', 'error')
      return
    }
    setSubmittingSchedule(true)
    try {
      const res = await fetch(`/api/internship-places/${mentor.internship_place_id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal memperbarui pengaturan jadwal')

      showToast('Jadwal jam kerja & lembur instansi berhasil diperbarui!', 'success')
      setScheduleModalOpen(false)
      loadData()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setSubmittingSchedule(false)
    }
  }

  // Export Presensi CSV Handler
  const handleExportPresensiCSV = () => {
    if (students.length === 0) {
      showToast('Tidak ada data siswa untuk diekspor.', 'error')
      return
    }
    const today = new Date().toISOString().split('T')[0]
    const placeName = mentor?.internship_places?.name || 'Instansi_PKL'

    const headers = [
      'No',
      'Nama Siswa',
      'Username / Email',
      'Kelas',
      'Jurusan',
      'No WhatsApp',
      'Tempat PKL',
      'Status Hari Ini',
      'Jam Masuk',
      'Status Masuk',
      'Jam Pulang',
      'Durasi Lembur',
      'Status PKL',
    ]

    const rows = students.map((s, idx) => {
      const att = s.today_attendance
      const statusMasuk = att ? getStatusLabel(att.check_in_status) : 'Belum Hadir'
      const jamMasuk = att?.check_in_time ? formatTime(att.check_in_time) : '-'
      const jamPulang = att?.check_out_time ? formatTime(att.check_out_time) : '-'
      const lembur =
        att?.is_overtime && att.overtime_minutes > 0
          ? `${Math.floor(att.overtime_minutes / 60)}j ${att.overtime_minutes % 60}m`
          : '-'
      const todayStatus = att
        ? att.check_in_status === 'on_time'
          ? 'Hadir Tepat Waktu'
          : att.check_in_status === 'late'
          ? 'Hadir Terlambat'
          : att.check_in_status
        : 'Belum Absen'

      return [
        idx + 1,
        `"${(s.full_name || '').replace(/"/g, '""')}"`,
        `"${(s.username || s.email?.split('@')[0] || '').replace(/"/g, '""')}"`,
        `"${(s.class_name || '-').replace(/"/g, '""')}"`,
        `"${(s.major || '-').replace(/"/g, '""')}"`,
        `"${(s.phone || '-').replace(/"/g, '""')}"`,
        `"${(s.internship_places?.name || placeName).replace(/"/g, '""')}"`,
        `"${todayStatus}"`,
        `"${jamMasuk}"`,
        `"${statusMasuk}"`,
        `"${jamPulang}"`,
        `"${lembur}"`,
        `"${s.internship_status || 'aktif'}"`,
      ].join(',')
    })

    const csvString = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Laporan_Presensi_${placeName.replace(/[^a-zA-Z0-9]/g, '_')}_${today}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast('Laporan presensi siswa instansi berhasil diunduh (CSV)!', 'success')
  }

  // Calculated Stats
  const stats = dataStats?.stats
  const weeklyTrend = dataStats?.weeklyTrend || []
  const pieData = [
    { name: 'Tepat Waktu', value: stats?.onTimeToday || 0, color: '#10b981' },
    { name: 'Terlambat', value: stats?.lateToday || 0, color: '#f59e0b' },
    { name: 'Izin', value: stats?.izinToday || 0, color: '#3b82f6' },
    { name: 'Sakit', value: stats?.sakitToday || 0, color: '#a855f7' },
    { name: 'Alpha', value: stats?.alphaToday || 0, color: '#ef4444' },
    { name: 'Belum Absen', value: stats?.notCheckedIn || 0, color: '#475569' },
  ].filter((d) => d.value > 0)

  const pendingPermitsCount = permits.filter((p) => p.status === 'menunggu').length
  const myAnnouncements = announcements.filter(
    (a) => a.internship_place_id === mentor?.internship_place_id
  )

  // Filtered students for Table
  const filteredStudents = students.filter((s: any) => {
    if (presenceFilter === 'online' && !s.is_online) return false
    if (presenceFilter === 'offline' && s.is_online) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = s.full_name?.toLowerCase().includes(q)
      const matchClass = s.class_name?.toLowerCase().includes(q)
      if (!matchName && !matchClass) return false
    }
    return true
  })

  // Sidebar Menu Navigation Sections (Exactly matches Superadmin layout aesthetic)
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
          label: 'Topologi & SOP',
          icon: Network,
          href: '/dashboard/structure',
        },
      ],
    },
    {
      title: 'OPERASIONAL SISWA',
      items: [
        {
          label: 'Presensi & Siswa',
          icon: ClipboardList,
          onClick: () => {
            setCurrentView('attendance')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'attendance',
          count: students.length,
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
          label: 'Pengumuman Instansi',
          icon: Megaphone,
          onClick: () => {
            setCurrentView('announcements')
            setMobileSidebarOpen(false)
          },
          isActive: currentView === 'announcements',
          count: myAnnouncements.length,
        },
      ],
    },
    {
      title: 'PENGATURAN & LAPORAN',
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
          label: 'Unduh Rekap CSV',
          icon: FileSpreadsheet,
          onClick: () => {
            handleExportPresensiCSV()
            setMobileSidebarOpen(false)
          },
        },
      ],
    },
  ]

  const placeTitle = mentor?.internship_places?.name || 'Instansi Penugasan PKL'

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
        <div className="p-3 border-t border-white/5">
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
                    <span>Pusat Monitoring Siswa • {placeTitle}</span>
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-black text-white">
                    Dashboard Pembimbing PKL
                  </h1>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(new Date())} · Monitoring Presensi & Kinerja Siswa PKL di {placeTitle}
                  </p>
                </div>

                {/* Quick Action Toolbar */}
                <div className="flex items-center gap-2 flex-wrap relative z-10">
                  <button
                    onClick={handleOpenCreateStudent}
                    className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-lg shadow-purple-500/25 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl"
                  >
                    <UserPlus className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>+ Buat Akun Siswa</span>
                  </button>

                  <Link
                    href="/dashboard"
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-purple-500/40 text-purple-300 hover:bg-purple-500/15 font-semibold rounded-xl"
                  >
                    <span>📸</span>
                    <span>Absensi Saya</span>
                  </Link>

                  <button
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl"
                    title="Perbarui data monitoring"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span>{refreshing ? 'Memperbarui...' : 'Perbarui'}</span>
                  </button>

                  <button
                    onClick={handleOpenCreateAnnouncement}
                    className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl border-blue-500/40 text-blue-300 hover:bg-blue-500/15"
                  >
                    <Megaphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>+ Pengumuman</span>
                  </button>
                </div>
              </div>

              {/* Top 5 Statistics Grid (Identik dengan Admin) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Total Siswa Instansi */}
                <div className="glass-card p-4 border border-white/10 flex flex-col justify-between">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase">Total Siswa PKL</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-white">{students.length}</span>
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
                      {students.filter((s) => s.is_online).length}
                    </span>
                    <span className="text-[10px] text-gray-400">Aktif web</span>
                  </div>
                </div>

                {/* Hadir Hari Ini */}
                <div className="glass-card p-4 border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-400 font-semibold uppercase">Hadir Tepat</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-emerald-400">{stats?.onTimeToday ?? 0}</span>
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

                {/* Izin & Sakit */}
                <div className="glass-card p-4 border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-blue-400 font-semibold uppercase">Izin & Sakit</span>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-2xl font-black text-blue-400">
                      {(stats?.izinToday || 0) + (stats?.sakitToday || 0)}
                    </span>
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* 2 Charts Section (Identik dengan Admin) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weekly Trend Bar Chart */}
                <div className="lg:col-span-2 glass-card p-5 border border-white/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        Tren Kehadiran Siswa 7 Hari Terakhir
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Tepat waktu, terlambat, izin, sakit, dan alpha di {placeTitle}
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

                {/* Today Donut Status Breakdown */}
                <div className="glass-card p-5 border border-white/10 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    Komposisi Kehadiran Hari Ini
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
                      <div className="text-xs text-gray-500 text-center">
                        Belum ada aktivitas presensi hari ini.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-400">{d.name}:</span>
                        <span className="font-bold text-white ml-auto">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Realtime Student Attendance Table (Identik dengan Admin) */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/[0.02]">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      Monitoring Kehadiran Siswa PKL Real-time
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Daftar siswa di {placeTitle} beserta status kehadiran dan aktivitas web.
                    </p>
                  </div>

                  {/* Filters & Search */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
                      <button
                        onClick={() => setPresenceFilter('all')}
                        className={`px-3 py-1 rounded-lg font-semibold transition ${
                          presenceFilter === 'all' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Semua ({students.length})
                      </button>
                      <button
                        onClick={() => setPresenceFilter('online')}
                        className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                          presenceFilter === 'online' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Online ({students.filter((s) => s.is_online).length})
                      </button>
                      <button
                        onClick={() => setPresenceFilter('offline')}
                        className={`px-3 py-1 rounded-lg font-semibold transition ${
                          presenceFilter === 'offline' ? 'bg-slate-700 text-white shadow' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Offline
                      </button>
                    </div>

                    <div className="relative flex-1 sm:w-56">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari siswa, kelas..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field pl-8 text-xs w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4">Siswa</th>
                        <th className="py-3.5 px-4">Kelas & Jurusan</th>
                        <th className="py-3.5 px-4">Jam Masuk</th>
                        <th className="py-3.5 px-4">Jam Pulang</th>
                        <th className="py-3.5 px-4">Status Hari Ini</th>
                        <th className="py-3.5 px-4 text-right">Aksi Pembimbing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">
                            Tidak ada data siswa yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => {
                          const att = student.today_attendance
                          return (
                            <tr
                              key={student.id}
                              onClick={() => {
                                setSelectedStudentId(student.id)
                                setStudentDetailModalOpen(true)
                              }}
                              className="hover:bg-white/[0.02] cursor-pointer transition"
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="relative flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                                      {(student.full_name?.charAt(0) || 'S').toUpperCase()}
                                    </div>
                                    <span
                                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#0a0d17] ${
                                        student.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
                                      }`}
                                      title={student.is_online ? 'Online' : 'Offline'}
                                    />
                                  </div>
                                  <div>
                                    <div className="font-bold text-white">{student.full_name}</div>
                                    <div className="text-[11px] text-gray-400">
                                      {student.username || student.email?.split('@')[0] || '-'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-gray-300">
                                {student.class_name || '-'} {student.major ? `• ${student.major}` : ''}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {att?.check_in_time ? (
                                  <span className="font-mono text-white font-semibold">
                                    {formatTime(att.check_in_time)}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 font-mono">--:--</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {att?.check_out_time ? (
                                  <div className="flex items-center gap-1.5 font-mono">
                                    <span className="text-white font-semibold">
                                      {formatTime(att.check_out_time)}
                                    </span>
                                    {att.is_overtime && att.overtime_minutes > 0 && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        ⚡ +{formatOvertimeShort(att.overtime_minutes)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-500 font-mono">--:--</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className={`badge text-[10px] ${getStatusBadge(att?.check_in_status)}`}>
                                  <span>{getStatusEmoji(att?.check_in_status)}</span>
                                  <span>{getStatusLabel(att?.check_in_status)}</span>
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStudentId(student.id)
                                      setStudentDetailModalOpen(true)
                                    }}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                                    title="Lihat Detail Riwayat Siswa"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditStudent(student, e)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                                    title="Edit Biodata Siswa"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenDeleteStudent(student, e)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                    title="Hapus Akun Siswa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
              VIEW 2: OPERASIONAL PRESENSI & MANAJEMEN SISWA
             ======================================================== */}
          {currentView === 'attendance' && (
            <div className="space-y-6">
              <div className="glass-card p-5 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/20 flex-shrink-0">
                    <UserPlus className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Manajemen Siswa PKL {placeTitle}</h2>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Daftarkan akun siswa baru, perbarui biodata, reset password, atau unduh laporan presensi.
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
                    <span>+ Tambah Siswa</span>
                  </button>
                </div>
              </div>

              {/* Table of Students */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="font-bold text-white text-sm">Daftar Seluruh Siswa ({students.length})</h3>
                  <span className="text-xs text-gray-400">Instansi: {placeTitle}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase text-[10px]">
                        <th className="py-3 px-4">No</th>
                        <th className="py-3 px-4">Siswa</th>
                        <th className="py-3 px-4">Kelas & Jurusan</th>
                        <th className="py-3 px-4">WhatsApp</th>
                        <th className="py-3 px-4">Status PKL</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {students.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 px-4 text-gray-500 font-mono">{idx + 1}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{s.full_name}</div>
                            <div className="text-[11px] text-gray-400">{s.username || s.email}</div>
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
                                title="Edit Siswa"
                              >
                                <Pencil className="w-3.5 h-3.5" />
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 3: REKAP LEMBUR SISWA
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
                    <Clock className="w-3.5 h-3.5" />
                    <span>Atur Jadwal Lembur</span>
                  </button>
                </div>
              </div>

              {/* Overtime Table */}
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Daftar Kehadiran Lembur Siswa
                  </h3>
                  <span className="text-xs text-gray-400">{overtimes.length} Riwayat</span>
                </div>
                {overtimes.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 text-xs">
                    Belum ada riwayat lembur yang tercatat.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.03] text-gray-400 font-semibold uppercase text-[10px]">
                          <th className="py-3 px-4">Siswa</th>
                          <th className="py-3 px-4">Tanggal</th>
                          <th className="py-3 px-4">Jam Hadir</th>
                          <th className="py-3 px-4">Durasi Lembur</th>
                          <th className="py-3 px-4">Catatan</th>
                          <th className="py-3 px-4 text-right">Aksi Pembimbing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {overtimes.map((item) => (
                          <tr key={item.id} className="hover:bg-white/[0.02]">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white">{item.users?.full_name || 'Siswa'}</div>
                              <div className="text-[11px] text-gray-400">{item.users?.class_name || '-'}</div>
                            </td>
                            <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">{formatDate(item.date)}</td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="text-gray-400">
                                Masuk: <span className="text-white font-mono">{item.check_in_time ? formatTime(item.check_in_time) : '-'}</span>
                              </div>
                              <div className="text-gray-400">
                                Pulang: <span className="text-amber-300 font-bold font-mono">{item.check_out_time ? formatTime(item.check_out_time) : '-'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold font-mono">
                                <Zap className="w-3 h-3 text-amber-400" />
                                {formatOvertimeDuration(item.overtime_minutes)}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs text-gray-300 truncate">
                              {item.overtime_notes || <span className="text-gray-500 italic">Tidak ada catatan</span>}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleOpenEditOvertime(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit Lembur</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 4: PENGAJUAN IZIN & SAKIT
             ======================================================== */}
          {currentView === 'permits' && (
            <div className="space-y-6">
              <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Persetujuan Izin & Sakit Siswa
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tinjau surat dokter dan permohonan izin dari anak PKL di {placeTitle}.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                  {permits.length} Pengajuan
                </span>
              </div>

              {permits.length === 0 ? (
                <div className="glass-card p-12 text-center text-gray-500 text-xs rounded-2xl border border-white/10">
                  Belum ada pengajuan izin atau sakit dari siswa.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permits.map((p) => (
                    <div key={p.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            p.status === 'disetujui'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : p.status === 'ditolak'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {p.status}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{formatDate(p.created_at)}</span>
                        </div>

                        <h4 className="font-bold text-white text-sm">{p.users?.full_name}</h4>
                        <div className="text-xs text-purple-300 font-semibold uppercase mt-0.5">Jenis: {p.type}</div>
                        <p className="text-xs text-gray-300 mt-2 bg-white/5 p-3 rounded-xl">{p.reason}</p>
                        <div className="text-[11px] text-gray-400 mt-2">
                          Periode: <b>{formatDate(p.start_date)}</b> s/d <b>{formatDate(p.end_date)}</b>
                        </div>

                        {p.attachment_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(p.attachment_url)}
                            className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Bukti Foto / Surat Dokter</span>
                          </button>
                        )}
                      </div>

                      {p.status === 'menunggu' && (
                        <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenReviewPermit(p, 'disetujui')}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                          >
                            Setujui
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReviewPermit(p, 'ditolak')}
                            className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              VIEW 5: JURNAL KEGIATAN PKL (LOGBOOK)
             ======================================================== */}
          {currentView === 'journals' && (
            <div className="space-y-6">
              <div className="glass-card p-5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    Jurnal Kegiatan Harian (Logbook PKL)
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Evaluasi aktivitas harian siswa, lampiran foto kerja, dan berikan nilai bintang (⭐ 1-5).
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                  {journals.length} Jurnal
                </span>
              </div>

              {journals.length === 0 ? (
                <div className="glass-card p-12 text-center text-gray-500 text-xs rounded-2xl border border-white/10">
                  Belum ada jurnal harian yang dikirim oleh siswa.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {journals.map((j) => (
                    <div key={j.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-gray-400 font-mono">{formatDate(j.date)}</span>
                          {j.mentor_rating ? (
                            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              <span>{j.mentor_rating} / 5</span>
                            </div>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                              Belum Dinilai
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-white text-sm">{j.users?.full_name}</h4>
                        <div className="text-[11px] text-gray-400">
                          Jam Kerja: {j.start_time?.substring(0, 5)} - {j.end_time?.substring(0, 5)} WIB
                        </div>

                        <p className="text-xs text-gray-300 mt-2 bg-white/5 p-3 rounded-xl whitespace-pre-line leading-relaxed">
                          {j.work_summary}
                        </p>

                        {j.documentation_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(j.documentation_url)}
                            className="mt-3 text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Foto Bukti Kerja</span>
                          </button>
                        )}
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          {j.mentor_notes ? `Paraf: "${j.mentor_notes}"` : 'Belum ada paraf'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenJournalReview(j)}
                          className="btn-primary bg-gradient-to-r from-purple-600 to-indigo-600 text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span>{j.mentor_rating ? 'Edit Nilai' : 'Beri Nilai ⭐'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              VIEW 6: PENGUMUMAN INSTANSI (KHUSUS ANAK PKL PEMBIMBING)
             ======================================================== */}
          {currentView === 'announcements' && (
            <div className="space-y-6">
              <div className="glass-card p-5 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-300 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/20 flex-shrink-0">
                    <Megaphone className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Pengumuman Resmi Instansi: {placeTitle}</h2>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Pengumuman ini <b>HANYA</b> akan dilihat oleh siswa PKL di instansi Anda.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateAnnouncement}
                  className="btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-2.5 px-4 text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/25"
                >
                  <Megaphone className="w-4 h-4" />
                  <span>+ Buat Pengumuman</span>
                </button>
              </div>

              {myAnnouncements.length === 0 ? (
                <div className="glass-card p-12 text-center text-gray-500 text-xs rounded-2xl border border-white/10">
                  Belum ada pengumuman yang dibuat untuk instansi ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myAnnouncements.map((a) => (
                    <div key={a.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {a.type}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{formatDate(a.created_at)}</span>
                        </div>
                        <h4 className="font-bold text-white text-sm">{a.title}</h4>
                        <p className="text-xs text-gray-300 mt-1 whitespace-pre-line leading-relaxed bg-white/5 p-3 rounded-xl">
                          {a.content}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditAnnouncement(a)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                          title="Edit Pengumuman"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={deletingAnnouncementId === a.id}
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                          title="Hapus Pengumuman"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ========================================================
          ALL MODALS (Same functionality, accessible from layout)
         ======================================================== */}
      {/* Student Detail Modal */}
      <StudentDetailModal
        isOpen={studentDetailModalOpen}
        onClose={() => setStudentDetailModalOpen(false)}
        studentId={selectedStudentId}
      />

      {/* Create Student Modal */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-purple-500/30 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white text-sm">Tambah Akun Siswa Baru</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Contoh: Muhammad Rizki"
                  className="input-field text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="Contoh: rizki123"
                    className="input-field text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Password Awal</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field text-xs font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Kelas</label>
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    placeholder="Contoh: XII TKJ 1"
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Jurusan</label>
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    placeholder="Contoh: TKJ / RPL"
                    className="input-field text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contoh: 08123456789"
                  className="input-field text-xs font-mono"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px]">
                Siswa otomatis terhubung ke instansi: <b>{placeTitle}</b>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="btn-outline py-2 px-4 text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submittingStudent} className="btn-primary py-2 px-5 text-xs font-bold">
                  {submittingStudent ? 'Mendaftarkan...' : 'Daftarkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editModalOpen && selectedStudentForEdit && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white text-sm">Edit Data Siswa</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Nama Siswa</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input-field text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Kelas</label>
                  <input
                    type="text"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Jurusan</label>
                  <input
                    type="text"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Reset Password (Kosongkan jika tidak ubah)</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Ketik password baru (misal: 123)"
                  className="input-field text-xs font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn-outline py-2 px-4 text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submittingStudent} className="btn-primary py-2 px-5 text-xs font-bold">
                  {submittingStudent ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Modal */}
      {deleteModalOpen && studentToDelete && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-sm p-6 border border-rose-500/30 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <h3 className="font-bold text-white text-sm mb-2">Hapus Akun Siswa?</h3>
            <p className="text-xs text-gray-300 mb-4">
              Yakin ingin menghapus siswa <b>{studentToDelete.full_name}</b>? Seluruh riwayat presensi akan terhapus.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="btn-outline py-2 px-4 text-xs">
                Batal
              </button>
              <button
                type="button"
                disabled={deletingStudent}
                onClick={handleDeleteSubmit}
                className="btn-danger py-2 px-4 text-xs font-bold"
              >
                {deletingStudent ? 'Menghapus...' : 'Hapus Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overtime Edit Modal */}
      {editOvertimeModalOpen && selectedOvertimeForEdit && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-amber-500/30 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white text-sm">Edit Lembur Siswa</h3>
              <button onClick={() => setEditOvertimeModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOvertime} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-white/5 space-y-1">
                <div className="font-bold text-white">{selectedOvertimeForEdit.users?.full_name}</div>
                <div className="text-gray-400">Tanggal: {formatDate(selectedOvertimeForEdit.date)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Jam</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={editOvertimeHours}
                    onChange={(e) => setEditOvertimeHours(parseInt(e.target.value) || 0)}
                    className="input-field text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Menit (0-59)</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={editOvertimeMinutesPart}
                    onChange={(e) => setEditOvertimeMinutesPart(parseInt(e.target.value) || 0)}
                    className="input-field text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Catatan Verifikasi</label>
                <textarea
                  rows={3}
                  value={editOvertimeNotes}
                  onChange={(e) => setEditOvertimeNotes(e.target.value)}
                  placeholder="Keterangan lembur..."
                  className="input-field text-xs resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setEditOvertimeModalOpen(false)} className="btn-outline py-2 px-4 text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submittingEditOvertime} className="btn-primary py-2 px-5 text-xs font-bold">
                  {submittingEditOvertime ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule / Jam Kerja Modal */}
      {scheduleModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-amber-500/30 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white text-sm">Atur Jam Kerja & Lembur Instansi</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Jam Masuk</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.work_start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, work_start_time: e.target.value })}
                    className="input-field text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Jam Pulang</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.work_end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, work_end_time: e.target.value })}
                    className="input-field text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Mulai Hitung Lembur Pukul</label>
                <input
                  type="time"
                  required
                  value={scheduleForm.overtime_start_time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, overtime_start_time: e.target.value })}
                  className="input-field text-xs font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setScheduleModalOpen(false)} className="btn-outline py-2 px-4 text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submittingSchedule} className="btn-primary py-2 px-5 text-xs font-bold">
                  {submittingSchedule ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {announcementModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-blue-500/30 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white text-sm">
                {selectedAnnouncementForEdit ? 'Edit Pengumuman Instansi' : 'Buat Pengumuman Instansi'}
              </h3>
              <button onClick={() => setAnnouncementModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Contoh: Briefing Penugasan Jaringan Besok"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Kategori</label>
                <select
                  value={announcementType}
                  onChange={(e: any) => setAnnouncementType(e.target.value)}
                  className="input-field text-xs"
                >
                  <option value="info">ℹ️ Informasi Umum</option>
                  <option value="warning">⚠️ Peringatan Penting</option>
                  <option value="urgent">🚨 Mendesak (Urgent)</option>
                  <option value="success">🎉 Pemberitahuan Positif</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Isi Pesan</label>
                <textarea
                  rows={4}
                  required
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  className="input-field text-xs resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setAnnouncementModalOpen(false)} className="btn-outline py-2 px-4 text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submittingAnnouncement} className="btn-primary py-2 px-5 text-xs font-bold">
                  {submittingAnnouncement ? 'Menyimpan...' : 'Siarkan Pengumuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Journal Review Modal */}
      {journalModalOpen && selectedJournalForReview && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-purple-500/30 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white text-sm">Beri Nilai & Paraf Logbook</h3>
              <button onClick={() => setJournalModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveJournalReview} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-white/5">
                <div className="font-bold text-white">{selectedJournalForReview.users?.full_name}</div>
                <div className="text-gray-400">Tanggal: {formatDate(selectedJournalForReview.date)}</div>
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-2">Rating Evaluasi Kinerja (1 - 5 Bintang)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1.5 transition hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="font-bold text-amber-400 text-sm ml-2">{reviewRating} Bintang</span>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Catatan / Umpan Balik Paraf</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Tuliskan evaluasi untuk siswa..."
                  className="input-field text-xs resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setJournalModalOpen(false)} className="btn-outline py-2 px-4 text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submittingJournalReview} className="btn-primary py-2 px-5 text-xs font-bold">
                  {submittingJournalReview ? 'Menyimpan...' : 'Simpan Nilai & Paraf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Permit Modal */}
      {reviewModalOpen && selectedPermit && (
        <div className="modal-overlay">
          <div className="glass-card w-full max-w-md p-6 border border-white/10 shadow-2xl animate-fade-in-up bg-[#0e1220]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="font-bold text-white text-sm">
                {actionType === 'disetujui' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
              </h3>
              <button onClick={() => setReviewModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReviewPermitSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-white/5 space-y-1">
                <div className="font-bold text-white">{selectedPermit.users?.full_name}</div>
                <div className="text-gray-400">Jenis: {selectedPermit.type?.toUpperCase()}</div>
              </div>
              {actionType === 'ditolak' && (
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Alasan Penolakan</label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Tuliskan alasan penolakan..."
                    className="input-field text-xs resize-none"
                  />
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" onClick={() => setReviewModalOpen(false)} className="btn-outline py-2 px-4 text-xs">
                  Batal
                </button>
                <button type="submit" disabled={submittingReview} className="btn-primary py-2 px-5 text-xs font-bold">
                  {submittingReview ? 'Memproses...' : 'Konfirmasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="glass-card p-4 max-w-lg w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-black/60 text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Bukti" className="w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  )
}

export default function PembimbingPortalPage() {
  return (
    <ToastProvider>
      <PembimbingPortalContent />
    </ToastProvider>
  )
}
