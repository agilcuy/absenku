import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, class_name, major, phone, internship_place_id')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'superadmin') {
    redirect('/admin')
  } else if (profile?.role === 'pembimbing') {
    redirect('/pembimbing')
  } else {
    // Siswa wajib isi biodata dulu jika belum lengkap
    if (!profile?.class_name || !profile?.major || !profile?.phone || !profile?.internship_place_id) {
      redirect('/onboarding')
    }
    redirect('/dashboard')
  }
}
