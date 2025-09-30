import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import withPageRole from '@/utils/withPageRole'
import useCurrentUser from '@/hooks/useCurrentUser'
import { supabase } from '@/lib/db'
import RoleSwitcher from '@/components/roleSwitcher'

interface User {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  email: string
  rut: string
  role: 'PATIENT' | 'PSYCHOLOGIST' | 'ADMIN' | 'OWNER'
  isActive: boolean
  createdAt: string
}

const icons = {
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  filter: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.708V4z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

/** ---------- UI helpers (solo estética) ---------- */
const Bg = () => (
  <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute inset-0 bg-gradient-to-br from-[#FFF6EF] via-[#FFFBF7] to-[#F3F4F6]" />
    <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-orange-300/25 blur-3xl" />
    <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl" />
  </div>
)

function TopBar() {
  const router = useRouter()
  const { user } = useCurrentUser()
  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } finally { router.replace('/auth/login') }
  }

  return (
    <header className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-700" />
      <div className="relative max-w-7xl mx-auto h-16 px-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg backdrop-blur-sm shadow-sm">S</div>
          <div className="font-semibold text-xl">Sanamente</div>
          <div className="hidden sm:block px-3 py-1 bg-white/10 rounded-full text-sm font-medium">Gestión de Usuarios</div>
        </div>
        <div className="flex items-center gap-3">
          <RoleSwitcher />
          <Link href="/app/profile" className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all">
            {icons.user} Perfil
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 border border-red-700 transition-all"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <div className="h-[1px] w-full bg-white/25" />
    </header>
  )
}

function Card({ children, className = '', gradient = false }: { children: React.ReactNode; className?: string; gradient?: boolean }) {
  return (
    <section
      className={`rounded-2xl border ${gradient ? 'bg-gradient-to-br from-white/95 via-white/90 to-amber-50/60' : 'bg-white/95'}
      border-slate-200 backdrop-blur-sm shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(234,88,12,0.06)]
      transition-all hover:shadow-[0_1px_0_#fff_inset,0_18px_45px_rgba(234,88,12,0.14)]
      hover:ring-1 hover:ring-orange-200 hover:-translate-y-[1px] ${className}`}
    >
      {children}
    </section>
  )
}

function StatTile({ title, value, subtitle, color = 'slate' }: { title: string; value: React.ReactNode; subtitle: string; color?: 'slate'|'green'|'violet'|'orange'|'rose' }) {
  const map = {
    slate: 'from-slate-500 to-slate-600 ring-slate-200',
    green: 'from-emerald-500 to-green-600 ring-emerald-200',
    violet: 'from-violet-500 to-fuchsia-600 ring-violet-200',
    orange: 'from-orange-500 to-amber-600 ring-amber-200',
    rose: 'from-rose-500 to-red-600 ring-rose-200'
  } as const
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-600">{title}</div>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
        <span className={`inline-block h-10 w-10 rounded-xl bg-gradient-to-br ${map[color].split(' ').slice(0,2).join(' ')} text-transparent ring-2 ${map[color].split(' ').slice(2).join(' ')} ring-offset-1 ring-offset-white`} />
      </div>
    </Card>
  )
}

function getRoleColor(role: string) {
  switch (role) {
    case 'PATIENT': return 'bg-violet-100 text-violet-700 ring-1 ring-violet-200'
    case 'PSYCHOLOGIST': return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
    case 'ADMIN': return 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
    case 'OWNER': return 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
    default: return 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
  }
}

function getRoleGradient(role: string) {
  switch (role) {
    case 'PATIENT': return 'from-violet-500 to-fuchsia-600'
    case 'PSYCHOLOGIST': return 'from-orange-500 to-amber-600'
    case 'ADMIN': return 'from-rose-500 to-red-600'
    case 'OWNER': return 'from-blue-500 to-indigo-600'
    default: return 'from-slate-500 to-slate-600'
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'PATIENT': return 'Paciente'
    case 'PSYCHOLOGIST': return 'Psicólogo'
    case 'ADMIN': return 'Administrador'
    case 'OWNER': return 'Propietario'
    default: return role
  }
}

/** ---------- Página (lógica intacta) ---------- */
export default withPageRole(function UsersPage() {
  const router = useRouter()
  const { user, loading, error } = useCurrentUser()
  console.log('🔍 [UsersPage] User state:', { user: !!user, loading, error })
  console.log('🔍 [UsersPage] User details:', user ? { email: user.email, roles: user.roles } : 'null')

  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  const lastFetchRef = useRef(0)
  const isLoadingRef = useRef(false)
  const hasFetchedRef = useRef(false)

  const loadUsers = async () => {
    const now = Date.now()
    if (isLoadingRef.current) return
    if (now - lastFetchRef.current < 2000) return

    try {
      isLoadingRef.current = true
      lastFetchRef.current = now
      setUsersLoading(true)
      setUsersError(null)

      const response = await fetch('/api/owner/users', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        if (response.status === 401) { router.push('/auth/login'); return }
        if (response.status === 403) { router.push('/unauthorized'); return }
        let errorData
        try { errorData = await response.json() } catch { errorData = { error: `Error ${response.status}: ${response.statusText}` } }
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.ok) {
        setUsers(data.data)
        hasFetchedRef.current = true
      } else {
        throw new Error(data.error || 'Error cargando usuarios')
      }
    } catch (err: any) {
      console.error('💥 [CLIENT] Error:', err)
      setUsersError(err.message)
    } finally {
      isLoadingRef.current = false
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (!hasFetchedRef.current && user && !loading) {
      loadUsers()
    }
  }, [user, loading])

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch =
        searchTerm === '' ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastNamePaternal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastNameMaternal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rut.includes(searchTerm)

      const matchesRole = selectedRole === 'ALL' || user.role === selectedRole
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && user.isActive) ||
        (selectedStatus === 'INACTIVE' && !user.isActive)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchTerm, selectedRole, selectedStatus])

  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.isActive).length
    const patients = users.filter(u => u.role === 'PATIENT').length
    const psychologists = users.filter(u => u.role === 'PSYCHOLOGIST').length
    const admins = users.filter(u => u.role === 'ADMIN').length
    return { total, active, patients, psychologists, admins }
  }, [users])

  if (loading || usersLoading) {
    return (
      <div className="relative min-h-screen">
        <Bg />
        <TopBar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-600 border-t-transparent mx-auto mb-6"></div>
            <p className="text-slate-600 text-lg">Cargando usuarios...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || usersError) {
    return (
      <div className="relative min-h-screen">
        <Bg />
        <TopBar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-rose-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-slate-900 font-semibold text-lg mb-3">Error cargando usuarios</h3>
              <p className="text-slate-600 text-sm mb-6">{error || usersError}</p>
              <button
                onClick={() => { hasFetchedRef.current = false; loadUsers() }}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-colors font-medium border border-orange-200"
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
        {/* Header */}
        <div className="mb-8">
          <Card className="p-8" gradient>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <Link
                    href="/app/owner"
                    className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    {icons.back}
                    Volver al Dashboard
                  </Link>
                </div>
                <h1 className="text-4xl font-bold text-slate-900 mb-3 flex items-center gap-3">
                  {icons.users}
                  Gestión de Usuarios
                </h1>
                <p className="text-lg text-slate-600">
                  Administra todos los usuarios del sistema
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <StatTile title="Total" value={stats.total} subtitle="usuarios registrados" color="slate" />
          <StatTile title="Activos" value={<span className="text-emerald-600">{stats.active}</span>} subtitle="usuarios activos" color="green" />
          <StatTile title="Pacientes" value={<span className="text-violet-600">{stats.patients}</span>} subtitle="en tratamiento" color="violet" />
          <StatTile title="Psicólogos" value={<span className="text-amber-600">{stats.psychologists}</span>} subtitle="profesionales" color="orange" />
          <StatTile title="Admins" value={<span className="text-rose-600">{stats.admins}</span>} subtitle="administradores" color="rose" />
        </div>

        {/* Filtros */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              {icons.filter}
              <span className="font-semibold text-slate-900 text-lg">Filtros</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Búsqueda */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  {icons.search}
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o RUT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
                />
              </div>

              {/* Filtro por rol */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
              >
                <option value="ALL">Todos los roles</option>
                <option value="PATIENT">Pacientes</option>
                <option value="PSYCHOLOGIST">Psicólogos</option>
                <option value="ADMIN">Administradores</option>
                <option value="OWNER">Propietarios</option>
              </select>

              {/* Filtro por estado */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </div>

            <div className="text-sm text-slate-600">
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </div>
          </div>
        </Card>

        {/* Lista */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-white/60 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-slate-900">Lista de Usuarios</h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-slate-400 text-6xl mb-4">👥</div>
              <h3 className="text-slate-800 font-semibold text-lg mb-3">No se encontraron usuarios</h3>
              <p className="text-slate-600">
                {users.length === 0
                  ? 'No hay usuarios registrados en el sistema.'
                  : 'Intenta ajustar los filtros de búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-6 transition-all group hover:bg-white/80 hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white bg-gradient-to-br ${getRoleGradient(user.role)} ring-2 ring-white/60`}>
                        <span className="font-bold text-lg">
                          {user.firstName?.charAt(0) || ''}{user.lastNamePaternal?.charAt(0) || ''}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-950">
                          {user.firstName} {user.lastNamePaternal} {user.lastNameMaternal}
                        </h3>
                        <p className="text-sm text-slate-600">{user.email}</p>
                        <p className="text-sm text-slate-500">RUT: {user.rut}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </div>
                        <div className="text-xs mt-1">
                          {user.isActive ? (
                            <span className="text-emerald-600">● Activo</span>
                          ) : (
                            <span className="text-rose-600">● Inactivo</span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/app/owner/users/${user.id}`}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                      >
                        {icons.eye}
                        Ver detalle
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}, ['OWNER'])
