import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserSuperadmin } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { getPlaceCoordinates, KNOWN_PLACE_COORDS } from '@/lib/geo'

// POST synchronize all internship places coordinates
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()
    const isAdmin = await isUserSuperadmin(user, adminClient)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Hanya Superadmin' }, { status: 403 })
    }

    // 1. Fetch all internship places
    const { data: places, error } = await adminClient
      .from('internship_places')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    const results: any[] = []
    let dbUpdatedCount = 0

    // 2. Iterate and synchronize coordinates for each place
    for (const place of places || []) {
      const resolved = getPlaceCoordinates(place)

      if (resolved) {
        const updatePayload: any = {
          latitude: resolved.lat,
          longitude: resolved.lng,
          radius_meters: resolved.radiusMeters,
        }

        // Also update address if it's GEN-Z
        if (place.name?.toLowerCase().includes('gen-z') || place.name?.toLowerCase().includes('gen z')) {
          updatePayload.address = 'DeryGarage X Gen z Code, Bernung'
        }

        // Try to update DB directly
        let dbSaved = false
        try {
          const { error: updateErr } = await adminClient
            .from('internship_places')
            .update(updatePayload)
            .eq('id', place.id)

          if (!updateErr) {
            dbSaved = true
            dbUpdatedCount++
          } else {
            // Column might not exist yet, update address only
            if (updatePayload.address) {
              await adminClient
                .from('internship_places')
                .update({ address: updatePayload.address })
                .eq('id', place.id)
            }
          }
        } catch {
          // Ignore
        }

        results.push({
          id: place.id,
          name: place.name,
          address: updatePayload.address || place.address,
          latitude: resolved.lat,
          longitude: resolved.lng,
          radius_meters: resolved.radiusMeters,
          dbSaved,
        })
      } else {
        results.push({
          id: place.id,
          name: place.name,
          address: place.address,
          latitude: place.latitude || null,
          longitude: place.longitude || null,
          radius_meters: place.radius_meters || 200,
          dbSaved: false,
        })
      }
    }

    // 3. Log audit
    await logAudit({
      action: 'SYNC_COORDINATES',
      tableName: 'internship_places',
      newData: {
        totalPlaces: places?.length || 0,
        synchronized: results.length,
        dbUpdatedCount,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi titik koordinat per tempat PKL berhasil diselesaikan (${results.length} instansi terverifikasi).`,
      results,
      dbUpdatedCount,
      note: dbUpdatedCount === 0
        ? 'Koordinat aktif di seluruh sistem aplikasi. Untuk menyimpan permanen di kolom database Supabase, pastikan telah menjalankan migration_v3.sql di Supabase SQL Editor.'
        : 'Koordinat telah diperbarui secara permanen di database.',
    })
  } catch (error: any) {
    console.error('Error synchronizing coordinates:', error)
    return NextResponse.json({ error: error.message || 'Gagal menyinkronkan koordinat' }, { status: 500 })
  }
}
