import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userEmail = (user.email || '').toLowerCase().trim()
  if (userEmail === 'mikrotikagil@gmail.com') {
    redirect('/admin')
  }

  const adminClient = createAdminClient()
  let { data: profile } = await adminClient
    .from('users')
    .select('role, class_name, major, phone, internship_place_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile && userEmail) {
    const { data: byEmail } = await adminClient
      .from('users')
      .select('role, class_name, major, phone, internship_place_id')
      .eq('email', userEmail)
      .maybeSingle()
    profile = byEmail
  }

  if (profile?.role === 'superadmin') {
    redirect('/admin')
  } else if (profile?.role === 'pembimbing') {
    redirect('/pembimbing')
  } else if (profile?.role === 'student') {
    if (!profile.class_name || !profile.major || !profile.phone || !profile.internship_place_id) {
      redirect('/onboarding')
    }
    redirect('/dashboard')
  } else {
    redirect('/admin')
  }
}
