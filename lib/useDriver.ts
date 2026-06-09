// lib/useDriver.ts — Conductor
// Reemplaza todos los datos mock del page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from './supabase'
import { useAuthStore, useTripStore, type ActiveTrip } from './store'

// ── Tipos de respuesta ─────────────────────────────────────────────────────────
export interface TripOffer {
  id: string
  status: string
  originAddress: string
  destinationAddress: string
  vehicleBrand: string | null
  vehicleModel: string | null
  vehiclePlates: string | null
  vehicleVin: string | null
  vehicleYear: number | null
  vehicleColor: string | null
  distanceKm: number | null
  driverPayMxn: number | null
  scheduledAt: string | null
  originContactName: string | null
  originContactPhone: string | null
  destContactName: string | null
  destContactPhone: string | null
  specialInstructions: string | null
  userId: string
}

// ── Mapa de filas DB → TripOffer ───────────────────────────────────────────────
function rowToOffer(row: Record<string, unknown>): TripOffer {
  const s = (k: string) => (row[k] as string | null) ?? null
  const n = (k: string) => (row[k] as number | null) ?? null
  return {
    id: row.id as string,
    status: row.status as string,
    originAddress: row.origin_address as string,
    destinationAddress: row.destination_address as string,
    vehicleBrand: s('vehicle_brand'),
    vehicleModel: s('vehicle_model'),
    vehiclePlates: s('vehicle_plates'),
    vehicleVin: s('vehicle_vin'),
    vehicleYear: n('vehicle_year'),
    vehicleColor: s('vehicle_color'),
    distanceKm: n('distance_km'),
    driverPayMxn: n('driver_pay_mxn'),
    scheduledAt: s('scheduled_at'),
    originContactName: s('origin_contact_name'),
    originContactPhone: s('origin_contact_phone'),
    destContactName: s('dest_contact_name'),
    destContactPhone: s('dest_contact_phone'),
    specialInstructions: s('special_instructions'),
    userId: row.user_id as string,
  }
}

import type { Database } from './database.types'

type TripStatus = Database['public']['Enums']['trip_status']
const TRIP_SELECT = `
  id,
  status,
  origin_address,
  destination_address,
  vehicle_brand,
  vehicle_model,
  vehicle_plates,
  vehicle_vin,
  vehicle_year,
  vehicle_color,
  distance_km,
  driver_pay_mxn,
  scheduled_at,
  origin_contact_name,
  origin_contact_phone,
  dest_contact_name,
  dest_contact_phone,
  special_instructions,
  user_id,
  created_at,
  updated_at,
  driver_id
`

export function useDriver() {
  const { driver } = useAuthStore()
  const { activeTrip, offeredTrips, setActiveTrip, setOfferedTrips } = useTripStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Cargar viajes al montar ────────────────────────────────────────────────
  const loadTrips = useCallback(async () => {
    if (!driver) return
    setLoading(true)
    setError(null)
    const supabase = createClient()

    // Viajes ofertados: pendiente_asignacion sin conductor
    const { data: offered, error: offeredErr } = await supabase
      .from('trips')
      .select(TRIP_SELECT)
      .eq('status', 'pendiente_asignacion')
      .is('driver_id', null)
      .order('created_at', { ascending: false })
      .limit(20)

    if (offeredErr) {
      setError(`No pudimos cargar ofertas: ${offeredErr.message}`)
    } else {
      setOfferedTrips((offered ?? []).map(rowToOffer))
    }

    // Viaje activo del conductor
    const ACTIVE = [
      'conductor_asignado', 'conductor_en_camino', 'recoleccion_proceso',
      'evidencia_inicial_pendiente', 'traslado_curso', 'entrega_proceso',
      'evidencia_final_pendiente',
    ] as const

    const { data: active, error: activeErr } = await supabase
      .from('trips')
      .select(TRIP_SELECT)
      .eq('driver_id', driver.id)
      .in('status', ACTIVE)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeErr) {
      setError(`No pudimos cargar tu viaje activo: ${activeErr.message}`)
    } else {
      setActiveTrip(active ? rowToOffer(active) : null)
    }

    setLoading(false)
  }, [driver, setActiveTrip, setOfferedTrips])

  useEffect(() => { void loadTrips() }, [loadTrips])

  // ── Realtime: escuchar cambios en trips ────────────────────────────────────
  useEffect(() => {
    if (!driver) return
    const supabase = createClient()
    const channel = supabase
      .channel(`driver-trips:${driver.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trips',
      }, () => { void loadTrips() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [driver, loadTrips])

  // ── Aceptar oferta ─────────────────────────────────────────────────────────
  const acceptTrip = useCallback(async (tripId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!driver) return { ok: false, error: 'Sin sesión' }
    const supabase = createClient()

    // Usar RPC atómica del servidor para evitar race conditions
    const { data, error } = await supabase.rpc('assign_trip_driver', {
      p_driver_id: driver.id,
      p_trip_id: tripId,
    })

    if (error) return { ok: false, error: error.message }
    const result = data as { ok: boolean; error?: string }
    if (!result?.ok) return { ok: false, error: result?.error ?? 'No se pudo aceptar el viaje' }

    await loadTrips()
    return { ok: true }
  }, [driver, loadTrips])

  // ── Avanzar estado del viaje ───────────────────────────────────────────────
  const advanceTripStatus = useCallback(async (
    tripId: string,
    newStatus: TripStatus,
    expectedStatus?: TripStatus
  ): Promise<{ ok: boolean; error?: string }> => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('update_trip_status_atomic', {
      p_trip_id: tripId,
      p_status: newStatus,
      ...(expectedStatus ? { p_expected_status: expectedStatus } : {}),
    })

    if (error) return { ok: false, error: error.message }
    const result = data as { ok: boolean; error?: string }
    if (!result?.ok) return { ok: false, error: result?.error ?? 'No se pudo actualizar el estado' }

    await loadTrips()
    return { ok: true }
  }, [loadTrips])

  // ── Subir evidencia ────────────────────────────────────────────────────────
  const submitEvidence = useCallback(async (params: {
    tripId: string
    type: 'inicial' | 'durante' | 'final'
    kmReading?: number
    fuelLevel?: number
    notes?: string
    photoUrls?: string[]
  }): Promise<{ ok: boolean; evidenceId?: string; error?: string }> => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('evidence')
      .insert({
        trip_id: params.tripId,
        type: params.type,
        km_reading: params.kmReading ?? null,
        fuel_level: params.fuelLevel ?? null,
        notes: params.notes ?? null,
        status: 'en_revision',
      })
      .select('id')
      .single()

    if (error) return { ok: false, error: error.message }

    const photos = params.photoUrls ?? []
    if (photos.length > 0) {
      const { error: photosError } = await supabase
        .from('evidence_photos')
        .insert(photos.map((url) => ({
          evidence_id: data.id,
          url,
        })))

      if (photosError) return { ok: false, error: photosError.message }
    }

    return { ok: true, evidenceId: data.id }
  }, [])

  // ── Registrar gasto ────────────────────────────────────────────────────────
  const submitExpense = useCallback(async (params: {
    tripId: string
    type: string
    concept: string
    amount: number
  }): Promise<{ ok: boolean; error?: string }> => {
    const supabase = createClient()

    const { error } = await supabase
      .from('payments')
      .insert({
        trip_id: params.tripId,
        type: 'gasto',
        concept: params.concept,
        amount: params.amount,
        status: 'pendiente',
      })

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  // ── Reportar incidencia ────────────────────────────────────────────────────
  const reportIncident = useCallback(async (params: {
    tripId: string
    type: string
    description: string
  }): Promise<{ ok: boolean; error?: string }> => {
    const supabase = createClient()

    const { error } = await supabase
      .from('incidents')
      .insert({
        trip_id: params.tripId,
        type: params.type as never,
        description: params.description,
        status: 'nueva',
      })

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [])

  // ── Actualizar perfil ────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (params: {
    name?: string
    phone?: string
    bankName?: string
    bankAccountHolder?: string
    bankClabe?: string
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!driver) return { ok: false, error: 'Sin sesión' }
    const supabase = createClient()

    type DriverUpdate = {
      updated_at: string
      name?: string
      phone?: string
      bank_name?: string
      bank_account_holder?: string
      bank_clabe?: string
    }
    const payload: DriverUpdate = { updated_at: new Date().toISOString() }
    if (params.name !== undefined) payload.name = params.name
    if (params.phone !== undefined) payload.phone = params.phone
    if (params.bankName !== undefined) payload.bank_name = params.bankName
    if (params.bankAccountHolder !== undefined) payload.bank_account_holder = params.bankAccountHolder
    if (params.bankClabe !== undefined) payload.bank_clabe = params.bankClabe

    const { error } = await supabase
      .from('drivers')
      .update(payload as never)
      .eq('id', driver.id)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [driver])

  // ── Obtener datos bancarios del driver ───────────────────────────────────────
  const fetchBankData = useCallback(async (): Promise<{
    ok: boolean
    data?: { bankName: string; bankAccountHolder: string; bankClabe: string }
    error?: string
  }> => {
    if (!driver) return { ok: false, error: 'Sin sesión' }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('drivers')
      .select('bank_name, bank_account_holder, bank_clabe')
      .eq('id', driver.id)
      .single()
    if (error) return { ok: false, error: error.message }
    const row = data as unknown as { bank_name: string; bank_account_holder: string; bank_clabe: string }
    return {
      ok: true,
      data: {
        bankName: row.bank_name ?? '',
        bankAccountHolder: row.bank_account_holder ?? '',
        bankClabe: row.bank_clabe ?? '',
      }
    }
  }, [driver])

  // ── Documentos del conductor ─────────────────────────────────────────────────
  const fetchDocuments = useCallback(async (): Promise<{
    ok: boolean
    data?: Array<{ id: string; type: string; status: string; url: string | null; expiresAt: string | null }>
    error?: string
  }> => {
    if (!driver) return { ok: false, error: 'Sin sesión' }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('documents')
      .select('id, type, status, url, expires_at')
      .eq('owner_id', driver.id)
      .eq('owner_type', 'driver')
      .order('created_at', { ascending: false })
    if (error) return { ok: false, error: error.message }
    return {
      ok: true,
      data: (data ?? []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        type: d.type as string,
        status: d.status as string,
        url: d.url as string | null,
        expiresAt: d.expires_at as string | null,
      }))
    }
  }, [driver])

  // ── Subir documento a Supabase Storage ──────────────────────────────────────
  const uploadDocument = useCallback(async (params: {
    file: File
    docType: string
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!driver) return { ok: false, error: 'Sin sesión' }
    const supabase = createClient()

    const ext = params.file.name.split('.').pop() ?? 'jpg'
    const path = `drivers/${driver.id}/${params.docType}-${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('documents')
      .upload(path, params.file, { upsert: true })
    if (upErr) return { ok: false, error: upErr.message }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)

    const payload = {
      owner_id: driver.id,
      owner_type: 'driver',
      owner_name: driver.name,
      type: params.docType,
      status: 'en_revision' as const,
      url: urlData.publicUrl,
      storage_path: path,
      mime_type: params.file.type,
      file_size_bytes: params.file.size,
      uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: existing, error: existingErr } = await supabase
      .from('documents')
      .select('id, storage_path')
      .eq('owner_id', driver.id)
      .eq('owner_type', 'driver')
      .eq('type', params.docType)
      .maybeSingle()

    if (existingErr) return { ok: false, error: existingErr.message }

    const { error: dbErr } = existing
      ? await supabase
        .from('documents')
        .update(payload)
        .eq('id', existing.id)
      : await supabase
      .from('documents')
        .insert(payload)

    if (dbErr) return { ok: false, error: dbErr.message }

    if (existing?.storage_path && existing.storage_path !== path) {
      await supabase.storage.from('documents').remove([existing.storage_path])
    }

    return { ok: true }
  }, [driver])

  // ── Ganancias reales ────────────────────────────────────────────────────────
  const fetchEarnings = useCallback(async (): Promise<{
    ok: boolean
    data?: {
      totalAprobado: number
      totalPendiente: number
      tripsCount: number
      payments: Array<{
        id: string
        tripId: string
        concept: string | null
        amount: number
        status: string
        paidAt: string | null
        createdAt: string
      }>
    }
    error?: string
  }> => {
    if (!driver) return { ok: false, error: 'Sin sesión' }
    const supabase = createClient()

    // Traemos los payments de los viajes del conductor
    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        trip_id,
        concept,
        amount,
        status,
        paid_at,
        created_at,
        trips!inner(driver_id)
      `)
      .eq('trips.driver_id', driver.id)
      .in('type', ['pago_conductor'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return { ok: false, error: error.message }

    const rows = (data ?? []) as Array<{
      id: string; trip_id: string; concept: string | null
      amount: number; status: string; paid_at: string | null; created_at: string
    }>

    const totalAprobado = rows
      .filter(r => r.status === 'aprobado' || r.status === 'pagado')
      .reduce((s, r) => s + Number(r.amount), 0)

    const totalPendiente = rows
      .filter(r => r.status === 'pendiente')
      .reduce((s, r) => s + Number(r.amount), 0)

    const tripIds = Array.from(new Set(rows.map(r => r.trip_id)))

    return {
      ok: true,
      data: {
        totalAprobado,
        totalPendiente,
        tripsCount: tripIds.length,
        payments: rows.map(r => ({
          id: r.id,
          tripId: r.trip_id,
          concept: r.concept,
          amount: Number(r.amount),
          status: r.status,
          paidAt: r.paid_at,
          createdAt: r.created_at,
        })),
      },
    }
  }, [driver])

  return {
    driver,
    loading,
    error,
    activeTrip,
    offeredTrips,
    acceptTrip,
    advanceTripStatus,
    submitEvidence,
    submitExpense,
    reportIncident,
    fetchEarnings,
    updateProfile,
    fetchBankData,
    fetchDocuments,
    uploadDocument,
    reload: loadTrips,
  }
}
