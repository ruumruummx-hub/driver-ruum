// lib/store.ts — Conductor
'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Tipos locales ──────────────────────────────────────────────────────────────
export interface DriverProfile {
  id: string           // drivers.id (no auth_id)
  authId: string       // auth UUID de Supabase
  name: string
  email: string
  phone: string | null
  photoUrl: string | null
  certified: boolean
  rating: number | null
  tripsCompleted: number
  status: string
}

export interface ActiveTrip {
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

// ── Auth store ─────────────────────────────────────────────────────────────────
interface AuthState {
  driver: DriverProfile | null
  setDriver: (driver: DriverProfile) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      driver: null,
      setDriver: (driver) => set({ driver }),
      logout: () => set({ driver: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ driver: state.driver }),
    }
  )
)

// ── Trip store ─────────────────────────────────────────────────────────────────
interface TripState {
  activeTrip: ActiveTrip | null
  offeredTrips: ActiveTrip[]
  setActiveTrip: (trip: ActiveTrip | null) => void
  setOfferedTrips: (trips: ActiveTrip[]) => void
}

export const useTripStore = create<TripState>()((set) => ({
  activeTrip: null,
  offeredTrips: [],
  setActiveTrip: (trip) => set({ activeTrip: trip }),
  setOfferedTrips: (trips) => set({ offeredTrips: trips }),
}))

// ── Toast store ────────────────────────────────────────────────────────────────
interface ToastState {
  message: string | null
  showToast: (msg: string) => void
  clearToast: () => void
}

export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  showToast: (msg) => {
    set({ message: msg })
    setTimeout(() => set({ message: null }), 3500)
  },
  clearToast: () => set({ message: null }),
}))