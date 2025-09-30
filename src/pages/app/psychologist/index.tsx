// src/pages/app/psychologist/index.tsx
import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import withPageRole from '@/utils/withPageRole'
import useCurrentUser from '@/hooks/useCurrentUser'
import fetcher from '@/services/fetcher'
import { supabase } from '@/lib/db'
import { useRouter } from 'next/router'
import RoleSwitcher from '@/components/roleSwitcher'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface Patient {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  email: string
  rut: string
}

interface Stats {
  totalPatients: number
  activeSessions: number
  pendingNotes: number
  upcomingAppointments: number
}

// Iconos
const icons = {
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  search: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  )
}

// TopBar con ThemeToggle (como en admin)
function TopBar() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } finally { router.replace('/auth/login') }
  }
  return (
    <header className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 dark:from-purple-700 dark:to-purple-800" />
      <div className="relative max-w-7xl mx-auto h-16 px-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg shadow-sm">S</div>
          <div className="font-semibold text-xl">Sanamente</div>
          <div className="hidden sm:block px-3 py-1 bg-white/15 rounded-full text-sm font-medium">
            Panel Psicólogo
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <RoleSwitcher />
          <Link
            href="/app/profile"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
          >
            {icons.user} Perfil
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 border border-red-700 transition-all"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <div className="h-[1px] w-full bg-white/20" />
    </header>
  )
}

/** Fondo sutil: solo halos (como admin). El color base viene del tema global. */
const Bg = () => (
  <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-400/10" />
    <div className="absolute top-1/4 -right-24 h-80 w-80 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-300/10" />
    <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl dark:bg-indigo-300/10" />
  </div>
)

function Card({ children, className = '', gradient = false }: { children: React.ReactNode; className?: string; gradient?: boolean }) {
  return (
    <section
      className={`rounded-2xl border ${gradient ? 'bg-gradient-to-br from-white/95 via-white/90 to-purple-50/70 dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/40' : 'bg-white/95 dark:bg-slate-900/60'}
      border-slate-200 backdrop-blur-sm shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(112,35,255,0.05)]
      transition-all hover:shadow-[0_1px_0_#fff_inset,0_18px_45px_rgba(112,35,255,0.15)]
      hover:ring-1 hover:ring-purple-200 hover:-translate-y-[1px]
      dark:border-slate-700 ${className}`}
    >
      {children}
    </section>
  )
}

/** --- StatCard con variantes dark (sin cambiar tu animación) --- */
function StatCard({
  title, value, subtitle, icon, color = 'purple', trend
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color?: 'purple' | 'blue' | 'green' | 'orange' | 'red' | 'indigo'
  trend?: 'up' | 'down' | 'neutral'
}) {
  const accents: Record<string, string> = {
    purple: 'from-purple-600 to-fuchsia-600',
    blue: 'from-blue-600 to-indigo-600',
    green: 'from-emerald-500 to-green-600',
    orange: 'from-amber-500 to-orange-600',
    red: 'from-rose-500 to-red-600',
    indigo: 'from-indigo-600 to-violet-600',
  }
  const trendIcons = {
    up: <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>,
    down: <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>,
    neutral: <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{title}</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">{value}</div>
          {subtitle && (
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              {trend && trendIcons[trend]}
              {subtitle}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accents[color]} text-white flex items-center justify-center shadow-md`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export default withPageRole(function PsychologistDashboard() {
  const { user, loading } = useCurrentUser()
  const [patients, setPatients] = useState<Patient[]>([])
  const [stats, setStats] = useState<Stats>({ totalPatients: 0, activeSessions: 0, pendingNotes: 0, upcomingAppointments: 0 })
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // búsqueda + ver más (UI)
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(20)
  const normalize = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  useEffect(() => { setVisible(20) }, [query])

  useEffect(() => { if (!loading && user) loadData() }, [user, loading])

  type PoolPatient = Patient & { isMyPatient: boolean }
  type PoolResponse = { ok: boolean; data: PoolPatient[]; stats?: any }

  const loadData = async () => {
    try {
      setLoadingData(true); setError(null)
      const resp = await fetcher('/api/psychologist/poolPatients') as PoolResponse
      const all = resp?.ok && Array.isArray(resp.data) ? resp.data : []
      const mine = all.filter(p => p.isMyPatient)
      const patientsForDashboard: Patient[] = mine.map(p => ({
        id: p.id, firstName: p.firstName, lastNamePaternal: p.lastNamePaternal,
        lastNameMaternal: p.lastNameMaternal, email: p.email, rut: p.rut
      }))
      setPatients(patientsForDashboard)
      setStats(s => ({ ...s, totalPatients: patientsForDashboard.length }))
    } catch (e: any) {
      console.error('Error loading dashboard data:', e)
      setError(e?.message || 'Error al cargar los datos')
    } finally {
      setLoadingData(false)
    }
  }

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return patients
    return patients.filter(p => normalize(`${p.firstName} ${p.lastNamePaternal} ${p.lastNameMaternal}`).includes(q))
  }, [patients, query])

  const showing = filtered.slice(0, visible)
  const hasMore = visible < filtered.length

  const todayDate = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  if (loading || loadingData) {
    return (
      <div className="relative min-h-screen">
        <Bg />
        <TopBar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-6"></div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">Cargando tu panel profesional...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <Bg />
        <TopBar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-rose-500 dark:text-rose-300 text-4xl mb-4">⚠️</div>
              <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-lg mb-3">Error cargando datos</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">{error}</p>
              <button
                onClick={loadData}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-colors font-medium border border-purple-200"
              >
                Reintentar
              </button>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header principal */}
        <div className="mb-8">
          <Card className="p-8" gradient>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">Panel Profesional</h1>
                <div className="text-lg text-slate-600 dark:text-slate-300 mb-2">
                  Bienvenido/a, <span className="font-semibold text-slate-900 dark:text-slate-100">{user?.firstName} {user?.lastNamePaternal}</span> 👩‍⚕️
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">{todayDate}</div>
                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">{icons.users}<span>{stats.totalPatients} pacientes asignados</span></div>
                  <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                  <div className="flex items-center gap-2">{icons.calendar}<span>Sesiones disponibles</span></div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard
            title="Mis Pacientes"
            value={stats.totalPatients}
            subtitle="asignados actualmente"
            icon={icons.users}
            color="blue"
            trend={stats.totalPatients > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            title="Sesiones Activas"
            value={stats.activeSessions}
            subtitle="en progreso"
            icon={icons.check}
            color="green"
            trend="neutral"
          />
        </div>

        {/* Mis Pacientes */}
        <div className="mb-8">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {icons.users} Mis Pacientes <span className="text-sm font-medium text-slate-500 dark:text-slate-400">({filtered.length})</span>
                </h2>
                <div className="relative w-full md:w-[420px]">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar paciente por nombre…"
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white/90 placeholder:text-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300 transition
                               dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:ring-purple-400"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500">{icons.search}</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              {showing.length > 0 ? (
                <div className="space-y-4">
                  {showing.map((patient) => (
                    <div key={patient.id} className="group">
                      <div
                        className="flex items-center justify-between p-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-purple-50/60
                                   transition-all hover:shadow-[0_14px_40px_rgba(112,35,255,0.15)] hover:ring-1 hover:ring-purple-200 hover:-translate-y-[1px]
                                   dark:border-slate-700 dark:from-slate-900/40 dark:to-slate-900/20 dark:hover:ring-purple-300/30"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl flex items-center justify-center shadow-md">
                            <span className="text-white font-bold text-lg">
                              {patient.firstName?.charAt(0) || ''}{patient.lastNamePaternal?.charAt(0) || ''}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                              {patient.firstName} {patient.lastNamePaternal} {patient.lastNameMaternal}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300">RUT: {patient.rut}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/app/psychologist/patient/${patient.id}`}
                            className="flex items-center gap-1 px-4 py-2 text-purple-700 hover:text-purple-800 hover:bg-purple-50 rounded-xl transition-all text-sm font-medium
                                       dark:text-purple-300 dark:hover:text-purple-200 dark:hover:bg-purple-900/30"
                          >
                            {icons.eye} Ver perfil
                          </Link>
                          <Link
                            href={`/app/psychologist/clinical-sheet/${patient.id}`}
                            className="flex items-center gap-1 px-4 py-2 text-purple-700 hover:text-purple-800 hover:bg-purple-50 rounded-xl transition-all text-sm font-medium
                                       dark:text-purple-300 dark:hover:text-purple-200 dark:hover:bg-purple-900/30"
                          >
                            {icons.clipboard} Hoja clínica
                          </Link>
                          <Link
                            href={`/app/psychologist/session/new/${patient.id}`}
                            className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 transition-all text-sm font-medium border border-purple-200 dark:border-purple-400/30 shadow-md"
                          >
                            {icons.plus} Nueva sesión
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}

                  {hasMore && (
                    <div className="pt-2">
                      <button
                        onClick={() => setVisible(v => v + 20)}
                        className="mx-auto block px-6 py-3 rounded-xl bg-white border border-slate-200 text-purple-700 hover:text-purple-800 hover:bg-purple-50 hover:ring-1 hover:ring-purple-200 transition
                                   dark:bg-slate-900/50 dark:border-slate-700 dark:text-purple-300 dark:hover:text-purple-200 dark:hover:bg-purple-900/30 dark:hover:ring-purple-300/30"
                      >
                        Ver más ({filtered.length - showing.length} restantes)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-slate-400 dark:text-slate-500 text-6xl mb-4">🔎</div>
                  <h3 className="text-slate-900 dark:text-slate-100 font-semibold text-lg mb-3">
                    {query ? 'Sin resultados para tu búsqueda' : 'No tienes pacientes asignados'}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                    {query ? 'Prueba con otro nombre o apellidos.' : 'Cuando tengas pacientes asignados, aparecerán aquí.'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Navegación principal con acentos por módulo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pool de Pacientes — azul */}
          <Link
            href="/app/psychologist/pool-patients"
            className="group relative overflow-hidden p-8 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(37,99,235,0.08)]
                       hover:shadow-[0_1px_0_#fff_inset,0_22px_55px_rgba(37,99,235,0.22)] hover:ring-1 hover:ring-blue-200 hover:-translate-y-[2px] transition-all text-center
                       dark:border-slate-700 dark:bg-slate-900/60 dark:hover:ring-blue-300/30"
          >
            <div className="absolute -inset-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(59,130,246,0.18),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(59,130,246,0.12),transparent)]" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-md">
              {icons.users}
            </div>
            <h3 className="relative text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Pool de Pacientes</h3>
            <p className="relative text-sm text-slate-600 dark:text-slate-300">Gestiona y asigna pacientes a tu cartera profesional</p>
          </Link>

          {/* Hojas Clínicas — morado */}
          <Link
            href="/app/psychologist/clinical-sheet"
            className="group relative overflow-hidden p-8 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(147,51,234,0.08)]
                       hover:shadow-[0_1px_0_#fff_inset,0_22px_55px_rgba(147,51,234,0.22)] hover:ring-1 hover:ring-purple-200 hover:-translate-y-[2px] transition-all text-center
                       dark:border-slate-700 dark:bg-slate-900/60 dark:hover:ring-purple-300/30"
          >
            <div className="absolute -inset-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(168,85,247,0.18),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(168,85,247,0.12),transparent)]" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-purple-600 to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-md">
              {icons.clipboard}
            </div>
            <h3 className="relative text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Hojas Clínicas</h3>
            <p className="relative text-sm text-slate-600 dark:text-slate-300">Revisa y completa las hojas clínicas de tus pacientes</p>
          </Link>

          {/* Historial de Sesiones — verde */}
          <Link
            href="/app/psychologist/sessions"
            className="group relative overflow-hidden p-8 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(16,185,129,0.08)]
                       hover:shadow-[0_1px_0_#fff_inset,0_22px_55px_rgba(16,185,129,0.22)] hover:ring-1 hover:ring-emerald-200 hover:-translate-y-[2px] transition-all text-center
                       dark:border-slate-700 dark:bg-slate-900/60 dark:hover:ring-emerald-300/30"
          >
            <div className="absolute -inset-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.18),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.12),transparent)]" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform shadow-md">
              {icons.calendar}
            </div>
            <h3 className="relative text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Historial de Sesiones</h3>
            <p className="relative text-sm text-slate-600 dark:text-slate-300">Consulta el historial completo de sesiones realizadas</p>
          </Link>
        </div>
      </div>
    </div>
  )
}, ['PSYCHOLOGIST'])
