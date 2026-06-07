// app/login/page.tsx — Conductor
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { LogIn, UserPlus } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { setDriver } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Ingresa con tus datos de conductor.')

  const hasEmail = email.trim().includes('@')
  const hasPassword = password.trim().length >= 6

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!hasEmail) { setMessage('Escribe un correo válido para continuar.'); return }
    if (!hasPassword) { setMessage('La contraseña debe tener al menos 6 caracteres.'); return }

    setLoading(true)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (authError || !authData.user) {
      setMessage('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    // Buscar perfil en tabla drivers por auth_id
    const { data: driverRow, error: driverError } = await supabase
      .from('drivers')
      .select('id, name, email, phone, photo_url, certified, rating, trips_completed, status')
      .eq('auth_id', authData.user.id)
      .maybeSingle()

    if (driverError || !driverRow) {
      await supabase.auth.signOut()
      setMessage('Tu cuenta no está registrada como conductor. Contacta a soporte.')
      setLoading(false)
      return
    }

    if (driverRow.status === 'suspendido' || driverRow.status === 'bloqueado') {
      await supabase.auth.signOut()
      setMessage('Tu cuenta está suspendida. Contacta a soporte.')
      setLoading(false)
      return
    }

    setDriver({
      id: driverRow.id,
      authId: authData.user.id,
      name: driverRow.name,
      email: driverRow.email,
      phone: driverRow.phone,
      photoUrl: driverRow.photo_url,
      certified: driverRow.certified,
      rating: driverRow.rating,
      tripsCompleted: driverRow.trips_completed,
      status: driverRow.status,
    })

    setMessage('Acceso correcto.')
    window.location.assign('/')
  }

  async function handleSignup() {
    if (!hasEmail) { setMessage('Escribe un correo válido para continuar.'); return }
    if (!hasPassword) { setMessage('La contraseña debe tener al menos 6 caracteres.'); return }

    setLoading(true)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (authError || !authData.user) {
      setMessage(authError?.message ?? 'No pudimos crear tu cuenta.')
      setLoading(false)
      return
    }

    // Crear registro en drivers
    const { error: insertError } = await supabase
      .from('drivers')
      .insert({
        auth_id: authData.user.id,
        name: email.split('@')[0],
        email: email.trim(),
        status: 'pendiente_validacion',
        certified: false,
        trips_completed: 0,
        earnings: 0,
      })

    if (insertError) {
      setMessage('Cuenta creada. Completa tu perfil al ingresar.')
    } else {
      setMessage('Cuenta creada. Un administrador validará tu perfil antes de asignarte viajes.')
    }
    setLoading(false)
  }

  return (
    <main className="shell auth-shell">
      <section className="auth-window" aria-label="Inicio de sesión">
        <div className="auth-brand">
          <div className="ruum-logo" aria-label="Ruum Ruum by Moviliax">
            <strong>RUUM</strong>
            <strong>RUUM</strong>
            <small>BY MOVILIAX</small>
          </div>
          <span>CONDUCTOR</span>
          <h1>Acepta viajes. Carga evidencia. Cobra con claridad.</h1>
          <p>Conductores certificados. Viajes documentados. Control total.</p>
          <em>{message}</em>
        </div>
        <form className="auth-form" onSubmit={handleLogin}>
          <label>
            Correo
            <span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="conductor@correo.com"
                disabled={loading}
              />
            </span>
          </label>
          <label>
            Contraseña
            <span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
            </span>
          </label>
          <button
            className="forgot-link"
            type="button"
            onClick={async () => {
              if (!hasEmail) { setMessage('Escribe tu correo para enviarte la recuperación.'); return }
              const supabase = createClient()
              await supabase.auth.resetPasswordForEmail(email.trim())
              setMessage(`Enviamos instrucciones a ${email.trim()}.`)
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
          <button className="auth-primary" type="submit" disabled={loading}>
            <LogIn size={22} />{loading ? 'Entrando…' : 'Entrar'}
          </button>
          <button
            className="auth-secondary"
            type="button"
            onClick={handleSignup}
            disabled={loading}
          >
            <UserPlus size={22} />Crear cuenta
          </button>
        </form>
      </section>
    </main>
  )
}