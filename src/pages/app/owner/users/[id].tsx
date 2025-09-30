import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import withPageRole from '@/utils/withPageRole'
import { supabase } from '@/lib/db'
import RoleSwitcher from '@/components/roleSwitcher'
import ThemeToggle from '@/components/ui/ThemeToggle'

type Role = 'PATIENT' | 'PSYCHOLOGIST' | 'ADMIN' | 'OWNER' | 'ASSISTANT' | 'SUPERADMIN'

interface UserDetail {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  email: string
  rut: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt?: string
  lastLogin?: string
  birthDate?: string
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
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  email: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
}

function TopBar() {
  const router = useRouter()
  const handleSignOut = async () => { try { await supabase.auth.signOut() } finally { router.replace('/auth/login') } }
  return (
    <header className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800" />
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
      shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(59,130,246,0.06)]
      hover:shadow-[0_1px_0_#fff_inset,0_18px_45px_rgba(59,130,246,0.14)]
      transition-all
      dark:border-slate-700 dark:bg-slate-900/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
      ${className}`}
    >
      {children}
    </section>
  )
}

function rolePill(role: Role) {
  const map: Record<Role, string> = {
    PATIENT: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900',
    PSYCHOLOGIST: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
    ADMIN: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900',
    OWNER: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900',
    ASSISTANT: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700',
    SUPERADMIN: 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900',
  }
  const label: Record<Role, string> = {
    PATIENT: 'Paciente',
    PSYCHOLOGIST: 'Psicólogo',
    ADMIN: 'Administrador',
    OWNER: 'Propietario',
    ASSISTANT: 'Asistente',
    SUPERADMIN: 'Superadmin'
  }
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${map[role]}`}>{label[role]}</span>
}

function calcAge(birth?: string) {
  if (!birth) return null
  const d = new Date(birth)
  if (isNaN(+d)) return null
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  let months = now.getMonth() - d.getMonth()
  if (now.getDate() < d.getDate()) months -= 1
  if (months < 0) { years -= 1; months += 12 }
  return { years, months }
}

export default withPageRole(function OwnerUserDetailPage() {
  const router = useRouter()
  const { id } = router.query
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { if (id) loadUserDetail() }, [id])

  async function loadUserDetail() {
    try {
      setLoading(true); setError(null)
      const resp = await fetch(`/api/owner/users/${id}`, { credentials: 'include' })
      if (!resp.ok) throw new Error(`Error ${resp.status}: ${resp.statusText}`)
      const data = await resp.json()
      if (!data?.success) throw new Error(data?.error || 'Error cargando detalle del usuario')
      setUserDetail(data.user as UserDetail)
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  async function handleToggleStatus() {
    if (!userDetail) return
    try {
      setUpdating(true)
      const res = await fetch('/api/owner/changeUserStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: userDetail.id, isActive: !userDetail.isActive })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || j?.success === false) throw new Error(j?.error || 'Error actualizando estado')
      setUserDetail((u) => (u ? { ...u, isActive: !u.isActive } : u))
    } catch (e: any) {
      alert(e.message ?? 'No se pudo actualizar el estado')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <TopBar />
        <div className="grid place-items-center min-h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error || !userDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <TopBar />
        <div className="grid place-items-center min-h-[calc(100vh-4rem)]">
          <Card className="p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-rose-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-rose-800 font-semibold text-lg mb-3">Error cargando usuario</h3>
              <p className="text-rose-700 text-sm mb-6">{error ?? 'Usuario no encontrado'}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={loadUserDetail} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Reintentar</button>
                <Link href="/app/owner/users" className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Volver</Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const fullName = `${userDetail.firstName} ${userDetail.lastNamePaternal} ${userDetail.lastNameMaternal}`
  const birthStr = userDetail.birthDate ? new Date(userDetail.birthDate).toLocaleDateString('es-CL') : 'No registrada'
  const age = calcAge(userDetail.birthDate)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <TopBar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-4">
          <Link
            href="/app/owner/users"
            className="inline-flex items-center gap-2 font-medium text-indigo-700 hover:text-indigo-800"
          >
            {icons.back} Volver a Usuarios
          </Link>
        </div>

        {/* Header */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white ring-2 ring-white/60">
                {(userDetail.firstName?.[0] || '')}{(userDetail.lastNamePaternal?.[0] || '')}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{fullName}</h1>
                  {rolePill(userDetail.role)}
                  <span className={`px-2.5 py-1 text-xs font-medium ring-1 rounded-full
                    ${userDetail.isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900'
                      : 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900'}`}>
                    {userDetail.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">{icons.email}<span>{userDetail.email}</span></div>
                  <div>RUT: {userDetail.rut}</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleStatus}
              disabled={updating}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm shadow-sm transition
                ${userDetail.isActive
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/50'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50'}
                ${updating ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {userDetail.isActive ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </Card>

        {/* ÚNICO panel: Información del sistema (incluye fecha + edad) */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Información del sistema</h2>
          <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
            <div>
              <div className="text-slate-500 dark:text-slate-400 mb-1">Rol</div>
              <div className="font-medium text-slate-900 dark:text-slate-100">{rolePill(userDetail.role)}</div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 mb-1">Estado</div>
              <div className="font-medium text-slate-900 dark:text-slate-100">{userDetail.isActive ? 'Activo' : 'Inactivo'}</div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 mb-1">Fecha de nacimiento</div>
              <div className="font-medium text-slate-900 dark:text-slate-100">{birthStr}</div>
              {age && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Edad: {age.years} años{age.months ? ` ${age.months} meses` : ''}
                </div>
              )}
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 mb-1">Registrado</div>
              <div className="font-medium text-slate-900 dark:text-slate-100">{new Date(userDetail.createdAt).toLocaleString('es-CL')}</div>
            </div>
            {userDetail.updatedAt && (
              <div>
                <div className="text-slate-500 dark:text-slate-400 mb-1">Actualizado</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{new Date(userDetail.updatedAt).toLocaleString('es-CL')}</div>
              </div>
            )}
            {userDetail.lastLogin && (
              <div>
                <div className="text-slate-500 dark:text-slate-400 mb-1">Último acceso</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{new Date(userDetail.lastLogin).toLocaleString('es-CL')}</div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}, ['OWNER'])
