// middleware.ts — App: Conductor
// Ubicación: raíz del proyecto (mismo nivel que /app)
// Protege rutas de conductor + valida que el perfil driver esté activo

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/auth/callback',
  '/onboarding', // permite acceso sin perfil completo
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ⚠️ getUser() — verifica contra Auth Server, no getSession()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (isPublicRoute) {
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Sin sesión → login
  if (!user || authError) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Verificar que el conductor tenga perfil activo en la tabla drivers
  // Solo para rutas que no sean onboarding
  if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('id, status, is_active')
      .eq('user_id', user.id)
      .single()

    if (driverError || !driver) {
      // No tiene perfil → enviar a onboarding
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    if (!driver.is_active || driver.status === 'suspendido') {
      // Perfil suspendido → página de cuenta suspendida
      return NextResponse.redirect(new URL('/cuenta-suspendida', request.url))
    }
  }

  // Proteger rutas de API del conductor: verificar header Authorization
  if (pathname.startsWith('/api/')) {
    // Las rutas API deben pasar el token en Authorization header
    // El middleware ya validó la sesión via cookie, pero agregamos
    // una respuesta de error clara si la cookie no está disponible en API routes
    if (authError) {
      return NextResponse.json(
        { error: 'No autorizado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}