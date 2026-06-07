// lib/SessionProvider.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from './supabase'
import { useAuthStore } from './store'

export function SessionProvider() {
  const { driver, setDriver, logout } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const supabase = createClient()
        
        // Obtener la sesión actual de Supabase
        const { data: sessionData } = await supabase.auth.getSession()
        
        // Si no hay sesión de auth, limpiar el store
        if (!sessionData.session) {
          logout()
          setInitialized(true)
          return
        }

        // Si ya hay un driver en el store, solo validar que la sesión sea correcta
        if (driver) {
          // Validar que el auth_id coincida
          if (driver.authId === sessionData.session.user.id) {
            setInitialized(true)
            return
          } else {
            // La sesión cambió, limpiar
            logout()
            setInitialized(true)
            return
          }
        }

        // Si no hay driver en el store pero hay sesión, restaurar desde BD
        const { data: driverRow, error: driverError } = await supabase
          .from('drivers')
          .select('id, name, email, phone, photo_url, certified, rating, trips_completed, status')
          .eq('auth_id', sessionData.session.user.id)
          .maybeSingle()

        if (driverError || !driverRow) {
          // La sesión existe pero no hay perfil de conductor asociado
          await supabase.auth.signOut()
          logout()
          setInitialized(true)
          return
        }

        // Restaurar el conductor en el store
        setDriver({
          id: driverRow.id,
          authId: sessionData.session.user.id,
          name: driverRow.name,
          email: driverRow.email,
          phone: driverRow.phone,
          photoUrl: driverRow.photo_url,
          certified: driverRow.certified,
          rating: driverRow.rating,
          tripsCompleted: driverRow.trips_completed,
          status: driverRow.status,
        })

        setInitialized(true)
      } catch (error) {
        console.error('Error initializing session:', error)
        logout()
        setInitialized(true)
      }
    }

    initializeSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // No renderizar nada - solo inicializa la sesión
  return null
}
