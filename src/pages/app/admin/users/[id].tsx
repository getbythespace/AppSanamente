import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import withPageRole from '@/utils/withPageRole'
import { supabase } from '@/lib/db'
import RoleSwitcher from '@/components/roleSwitcher'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface User {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  email: string
  rut: string
  role: 'PATIENT' | 'PSYCHOLOGIST' | 'ADMIN' | 'OWNER' | 'ASSISTANT'
  isActive: boolean
  createdAt: string
  updatedAt: string
  phone?: string
  birthDate?: string
  address?: string
}

const icons = {
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  toggleOn: (
    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  toggleOff: (
    <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

/* ---------- helpers de UI (solo estilo) ---------- */
/* ---------- Helpers puramente visuales (sin lógica) ---------- */
const Bg = () => (
  <div className="pointer-events-none absolute inset-0 -z-10">
    {/* Usamos el fondo global (var(--app-bg)) definido en global.css.
        No pintamos capa base aquí para no cubrirlo. Dejamos solo acentos. */}
    <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-400/10" />
    <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-lime-200/25 blur-3xl dark:bg-lime-300/10" />
  </div>
)


function roleGradient(role: User['role']) {
  switch (role) {
    case 'PATIENT': return 'from-violet-500 to-fuchsia-600'
    case 'PSYCHOLOGIST': return 'from-amber-500 to-orange-600'
    case 'ADMIN': return 'from-emerald-500 to-green-600'
    case 'OWNER': return 'from-blue-500 to-indigo-600'
    case 'ASSISTANT': return 'from-slate-500 to-slate-700'
    default: return 'from-slate-500 to-slate-700'
  }
}
function rolePill(role: User['role']) {
  const map: Record<User['role'], string> = {
    PATIENT: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900',
    PSYCHOLOGIST: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
    ADMIN: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900',
    OWNER: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900',
    ASSISTANT: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700'
  }
  const label: Record<User['role'], string> = {
    PATIENT: 'Paciente',
    PSYCHOLOGIST: 'Psicólogo',
    ADMIN: 'Administrador',
    OWNER: 'Propietario',
    ASSISTANT: 'Asistente'
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${map[role]}`}>{label[role]}</span>
}
const format = (d?: string) => (d ? new Date(d).toLocaleString('es-CL', { dateStyle: 'long', timeStyle: 'short' }) : '—')

function TopBar() {
  const router = useRouter()
  const handleSignOut = async () => { try { await supabase.auth.signOut() } finally { router.replace('/auth/login') } }
  return (
    <header className="relative w-full">
      {/* Barra admin */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800" />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6 text-white">
        <div className="flex items-center gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 font-bold text-lg backdrop-blur-sm shadow-sm">S</div>
          <div className="text-xl font-semibold">Sanamente</div>
          <div className="hidden rounded-full bg-white/10 px-3 py-1 text-sm font-medium sm:block">Detalle de Usuario</div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <RoleSwitcher />
          <Link
            href="/app/profile"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm transition-all duration-200 hover:bg-white/20"
          >
            {icons.user} Perfil
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-xl border border-red-700 bg-red-600 px-4 py-2 text-sm transition-all duration-200 hover:bg-red-700"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <div className="h-[1px] w-full bg-white/25" />
    </header>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm
      shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(16,185,129,0.06)]
      hover:shadow-[0_1px_0_#fff_inset,0_18px_45px_rgba(16,185,129,0.14)]
      transition-all
      dark:border-slate-700 dark:bg-slate-900/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
      ${className}`}
    >
      {children}
    </section>
  )
}

/* ================= LÓGICA ORIGINAL (intacta) ================= */
export default withPageRole(function UserDetailPage() {
  const router = useRouter()
  const isReady = router.isReady
  const idParam = router.query.id

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadUser = async (userId: string, signal?: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/admin/getUser?id=${encodeURIComponent(userId)}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal
      })
      if (!res.ok) {
        if (res.status === 401) { setLoading(false); router.replace('/auth/login'); return }
        if (res.status === 403) { setLoading(false); router.replace('/unauthorized'); return }
        throw new Error(`Error ${res.status}`)
      }
      const data = await res.json()
      if (signal?.aborted) return
      if (data?.ok && data?.data) setUser(data.data as User)
      else throw new Error(data?.error || 'Error cargando usuario')
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setError(e.message || 'Error cargando usuario')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    if (!user) return
    try {
      setUpdating(true)
      const res = await fetch('/api/admin/changeUserStatus', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, isActive: !user.isActive })
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      if (!data?.ok) throw new Error(data?.error || 'Error actualizando estado')
      setUser(prev => prev ? { ...prev, isActive: !prev.isActive } : prev)
    } catch (e) {
      alert('Error actualizando estado del usuario')
      console.error(e)
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    if (!isReady) return
    const id = typeof idParam === 'string' ? idParam : ''
    if (!id) { setLoading(false); setError('ID de usuario inválido.'); return }
    const ctrl = new AbortController()
    loadUser(id, ctrl.signal)
    return () => ctrl.abort()
  }, [isReady, idParam])
  /* =========================================================== */

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <Bg />
        <TopBar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <p className="text-lg text-slate-600 dark:text-slate-300">Cargando usuario...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="relative min-h-screen">
        <Bg />
        <TopBar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Card className="mx-4 max-w-md p-8">
            <div className="text-center">
              <div className="mb-4 text-4xl text-rose-500">⚠️</div>
              <h3 className="mb-3 text-lg font-semibold text-rose-800 dark:text-rose-300">Error</h3>
              <p className="mb-6 text-sm text-rose-700 dark:text-rose-200">{error || 'Usuario no encontrado'}</p>
              {/* 🔁 FIX: volver al listado correcto */}
              <Link
                href="/app/admin"
                className="inline-block rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Volver a la página principal
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <Bg />
      <TopBar />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Breadcrumb + volver */}
        <div className="flex items-center gap-3">
          {/* 🔁 FIX: volver al listado correcto */}
          <Link
            href="/app/admin"
            className="flex items-center gap-2 font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            {icons.back} Volver a Usuarios
          </Link>
        </div>

        {/* Header de usuario */}
        <Card className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-2xl font-bold text-white ring-2 ring-white/60 ${roleGradient(user.role)}`}>
                {(user.firstName?.[0] || '')}{(user.lastNamePaternal?.[0] || '')}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {user.firstName} {user.lastNamePaternal} {user.lastNameMaternal}
                  </h1>
                  {rolePill(user.role)}
                  <span
                    className={`px-2.5 py-1 text-xs font-medium ring-1 rounded-full
                    ${user.isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900'
                      : 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900'}`}
                  >
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {user.email} · RUT: {user.rut}
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleStatus}
              disabled={updating}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm shadow-sm transition
                ${user.isActive
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/50'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50'}
                ${updating ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {user.isActive ? <>{icons.toggleOff}<span>Desactivar</span></> : <>{icons.toggleOn}<span>Activar</span></>}
            </button>
          </div>
        </Card>

        {/* Información personal */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Información personal</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Fecha de nacimiento</div>
                <div className="text-slate-900 dark:text-slate-100">
                  {user.birthDate ? new Date(user.birthDate).toLocaleDateString('es-CL') : '—'}
                </div>
              </div>

            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Información del sistema</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Rol</div>
                <div className="text-slate-900 dark:text-slate-100">{rolePill(user.role)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Estado</div>
                <div className="text-slate-900 dark:text-slate-100">{user.isActive ? 'Activo' : 'Inactivo'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Creado</div>
                <div className="text-slate-900 dark:text-slate-100">{format(user.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Actualizado</div>
                <div className="text-slate-900 dark:text-slate-100">{format(user.updatedAt)}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}, ['ADMIN', 'OWNER'])
