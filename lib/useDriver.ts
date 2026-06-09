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
      .select('*')
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
      .select('*')
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
        photo_urls: (params.photoUrls ?? []) as never,
        status: 'en_revision',
      })
      .select('id')
      .single()

    if (error) return { ok: false, error: error.message }
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
    reload: loadTrips,
  }
}