// SessionProvider.tsx — App: Conductor
// Remediación: reemplazar getSession() → getUser()
// getSession() lee solo del storage local y puede ser manipulado.
// getUser() siempre verifica contra el servidor de Supabase Auth.

'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

interface DriverProfile {
  id: string
  user_id: string
  nombre: string
  apellido: string
  status: 'activo' | 'inactivo' | 'suspendido' | 'en_viaje'
  is_active: boolean
  calificacion_promedio: number | null
}

interface SessionContextType {
  user: User | null
  session: Session | null
  driver: DriverProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [driver, setDriver] = useState<DriverProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // ✅ CORRECCIÓN CRÍTICA: getUser() en lugar de getSession()
  // getUser() hace una petición al servidor para validar el JWT.
  // Detecta tokens revocados, expirados o manipulados que getSession() ignoraría.
  const loadUser = useCallback(async () => {
    try {
      setIsLoading(true)

      const {
        data: { user: verifiedUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !verifiedUser) {
        setUser(null)
        setSession(null)
        setDriver(null)
        return
      }

      // Solo después de verificar el user, obtenemos la sesión para el token
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()

      setUser(verifiedUser)
      setSession(currentSession)

      // Cargar perfil del conductor vinculado al user verificado
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('id, user_id, nombre, apellido, status, is_active, calificacion_promedio')
        .eq('user_id', verifiedUser.id)
        .single()

      if (!driverError && driverData) {
        setDriver(driverData)
      }
    } catch (err) {
      console.error('[SessionProvider] Error al cargar usuario:', err)
      setUser(null)
      setSession(null)
      setDriver(null)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const refreshUser = useCallback(async () => {
    await loadUser()
  }, [loadUser])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setDriver(null)
  }, [supabase])

  useEffect(() => {
    // Carga inicial con getUser() verificado
    loadUser()

    // Escuchar cambios de estado de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT' || !newSession) {
        setUser(null)
        setSession(null)
        setDriver(null)
        setIsLoading(false)
        return
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        // ✅ Verificar también en el evento — no confiar solo en el newSession
        await loadUser()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadUser, supabase])

  return (
    <SessionContext.Provider
      value={{
        user,
        session,
        driver,
        isLoading,
        isAuthenticated: !!user,
        refreshUser,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>')
  }
  return context
}

// Hook de conveniencia para componentes que requieren autenticación
export function useRequiredSession() {
  const session = useSession()
  if (!session.isAuthenticated && !session.isLoading) {
    throw new Error('Este componente requiere una sesión activa')
  }
  return session
}