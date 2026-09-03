import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'

// GET permits (role-filtered)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = adminClient
      .from('permits')
      .select(
        '*, users(id, full_name, email, class_name, major, avatar_url, mentor_id, internship_places(name)), reviewer:reviewed_by(full_name, email)'
      )
      .order('created_at', { ascending: false })

    if (profile?.role === 'student') {
      // Siswa hanya melihat miliknya
      query = query.eq('user_id', user.id)
    } else if (profile?.role === 'pembimbing') {
      // Pembimbing melihat siswa yang dibimbingnya
      const { data: assignedStudents } = await adminClient
        .from('users')
        .select('id')
        .eq('mentor_id', user.id)

      const studentIds = (assignedStudents || []).map((s: any) => s.id)
      if (studentIds.length === 0) {
        return NextResponse.json({ permits: [] })
      }
      query = query.in('user_id', studentIds)
    }
    // Superadmin melihat semua pengajuan

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)

    const { data: permits, error } = await query
    if (error) throw error

    return NextResponse.json({ permits: permits || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST submit new permit (Izin / Sakit)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    const formData = await req.formData()
    const type = formData.get('type') as string // 'izin' | 'sakit'
    const startDate = formData.get('start_date') as string
    const endDate = formData.get('end_date') as string
    const reason = formData.get('reason') as string
    const proofFile = formData.get('proof') as File | null

    if (!type || !startDate || !endDate || !reason?.trim()) {
      return NextResponse.json(
        { error: 'Tipe pengajuan, tanggal mulai, tanggal selesai, dan alasan wajib diisi.' },
        { status: 400 }
      )
    }

    if (!['izin', 'sakit'].includes(type)) {
      return NextResponse.json({ error: 'Tipe pengajuan harus izin atau sakit.' }, { status: 400 })
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'Tanggal mulai tidak boleh melebihi tanggal selesai.' },
        { status: 400 }
      )
    }

    // Upload proof file if provided
    let proofUrl: string | null = null
    if (proofFile && proofFile.size > 0) {
      try {
        const arrayBuffer = await proofFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const fileExt = proofFile.name ? proofFile.name.split('.').pop() || 'jpg' : 'jpg'
        const filePath = `permits/${user.id}/${Date.now()}-${type}.${fileExt}`

        const { error: uploadError } = await adminClient.storage
          .from('attendance-photos')
          .upload(filePath, buffer, {
            contentType: proofFile.type || 'image/jpeg',
            upsert: true,
          })

        if (!uploadError) {
          const { data: pubData } = adminClient.storage
            .from('attendance-photos')
            .getPublicUrl(filePath)
          proofUrl = pubData.publicUrl
        }
      } catch (uploadErr) {
        console.warn('Permit proof upload failed:', uploadErr)
      }
    }

    // Insert permit record
    const { data: newPermit, error: insertErr } = await adminClient
      .from('permits')
      .insert({
        user_id: user.id,
        type,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        proof_url: proofUrl,
        status: 'menunggu',
      })
      .select('*, users(full_name, mentor_id)')
      .single()

    if (insertErr) throw insertErr

    // Send notification to Mentor and Superadmin
    const studentName = newPermit.users?.full_name || 'Siswa'
    const mentorId = newPermit.users?.mentor_id

    const notifPayloads = []
    if (mentorId) {
      notifPayloads.push({
        user_id: mentorId,
        title: `Pengajuan ${type === 'sakit' ? 'Sakit' : 'Izin'} Baru`,
        message: `${studentName} mengajukan ${type} untuk tanggal ${startDate} s/d ${endDate}.`,
        type: 'permit',
        link: '/pembimbing',
      })
    }

    // Also notify superadmin(s)
    const { data: superadmins } = await adminClient
      .from('users')
      .select('id')
      .eq('role', 'superadmin')

    ;(superadmins || []).forEach((sa: any) => {
      notifPayloads.push({
        user_id: sa.id,
        title: `Pengajuan ${type === 'sakit' ? 'Sakit' : 'Izin'} Baru`,
        message: `${studentName} mengajukan ${type} (${startDate} s/d ${endDate}).`,
        type: 'permit',
        link: '/admin/permits',
      })
    })

    if (notifPayloads.length > 0) {
      await adminClient.from('notifications').insert(notifPayloads)
    }

    return NextResponse.json({
      success: true,
      message: `Pengajuan ${type} berhasil dikirim dan menunggu persetujuan.`,
      permit: newPermit,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
