// src/pages/app/admin/index.tsx
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import withPageRole from '@/utils/withPageRole'
import { supabase } from '@/lib/db'
import RoleSwitcher from '@/components/roleSwitcher'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface AdminUserListItem {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal?: string
  email: string
  rut: string
  role: 'PATIENT' | 'PSYCHOLOGIST' | 'ADMIN' | 'OWNER' | 'ASSISTANT'
  isActive: boolean
  createdAt: string
}
interface Stats { total: number; active: number; inactive: number; pending: number }
type InviteRole = 'PSYCHOLOGIST' | 'ASSISTANT' | 'PATIENT'

const icons = {
  users: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>),
  shield: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>),
  search: (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" />
  </svg>)
}

/* ---------- Helpers puramente visuales (sin lógica) ---------- */
const Bg = () => (
  <div className="pointer-events-none absolute inset-0 -z-10">
    {/* Acentos tipo “halos” como en psychologist, pero en paleta emerald */}
    <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-emerald-400/25 blur-3xl dark:bg-emerald-400/10" />
    <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-lime-300/25 blur-3xl dark:bg-lime-300/10" />
    <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-300/10" />
  </div>
)

function getRolePill(role: string) {
  const map: Record<string, string> = {
    PATIENT: 'bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900',
    PSYCHOLOGIST: 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
    ADMIN: 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900',
    OWNER: 'bg-indigo-100 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900',
    ASSISTANT: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700'
  }
  const label: Record<string, string> = {
    PATIENT: 'Paciente',
    PSYCHOLOGIST: 'Psicólogo',
    ADMIN: 'Administrador',
    OWNER: 'Propietario',
    ASSISTANT: 'Asistente'
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${map[role] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
      {label[role] || role}
    </span>
  )
}
function roleGradient(role: string) {
  switch (role) {
    case 'PATIENT': return 'from-violet-500 to-fuchsia-600'
    case 'PSYCHOLOGIST': return 'from-amber-500 to-orange-600'
    case 'ADMIN': return 'from-emerald-500 to-green-600'
    case 'OWNER': return 'from-blue-500 to-indigo-600'
    case 'ASSISTANT': return 'from-slate-500 to-slate-700'
    default: return 'from-slate-500 to-slate-700'
  }
}

function TopBar() {
  const handleSignOut = async () => { try { await supabase.auth.signOut() } finally { location.href = '/auth/login' } }
  return (
    <header className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800" />
      <div className="relative max-w-7xl mx-auto h-16 px-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center font-bold text-lg backdrop-blur-sm shadow-sm">S</div>
          <div className="font-semibold text-xl">Sanamente</div>
          <div className="hidden sm:block px-3 py-1 bg-white/10 rounded-full text-sm font-medium">Gestión de Usuarios</div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <RoleSwitcher />
          <Link href="/app/profile" className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200">
            {icons.shield} Perfil
          </Link>
          <button onClick={handleSignOut}
            className="text-sm px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 border border-red-700 transition-all duration-200">
            Cerrar sesión
          </button>
        </div>
      </div>
      <div className="h-[1px] w-full bg-white/25" />
    </header>
  )
}

/** Card con “gradient mode” + hover-lift (como psychologist) */
function Card({ children, className = '', gradient = false }: { children: React.ReactNode; className?: string; gradient?: boolean }) {
  return (
    <section
      className={`rounded-2xl border ${gradient ? 'bg-gradient-to-br from-white/95 via-white/90 to-emerald-50/70 dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/40' : 'bg-white/95 dark:bg-slate-900/60'}
      border-slate-200 backdrop-blur-sm
      shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(16,185,129,0.06)]
      transition-all hover:shadow-[0_1px_0_#fff_inset,0_18px_45px_rgba(16,185,129,0.14)]
      hover:ring-1 hover:ring-emerald-200 hover:-translate-y-[1px]
      dark:border-slate-700 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
      ${className}`}
    >
      {children}
    </section>
  )
}

function StatTile({ title, value, subtitle, color = 'emerald' }:{
  title: string; value: React.ReactNode; subtitle: string; color?: 'emerald'|'rose'|'amber'|'slate'
}) {
  const dot = {
    emerald: 'from-emerald-500 to-green-600 ring-emerald-200',
    rose: 'from-rose-500 to-red-600 ring-rose-200',
    amber: 'from-amber-500 to-orange-600 ring-amber-200',
    slate: 'from-slate-500 to-slate-600 ring-slate-200'
  }[color]
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-white/90 to-emerald-50/40 border border-slate-200 dark:from-slate-900/60 dark:to-slate-900/30 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-600 dark:text-slate-300">{title}</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
        </div>
        <span className={`inline-block h-10 w-10 rounded-xl bg-gradient-to-br ${dot.split(' ').slice(0,2).join(' ')} ring-2 ${dot.split(' ').slice(2).join(' ')} ring-offset-1 ring-offset-white dark:ring-offset-slate-900`} />
      </div>
    </div>
  )
}

/* ================== LÓGICA ORIGINAL (intacta) ================== */
export default withPageRole(function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, pending: 0 })
  const [users, setUsers] = useState<AdminUserListItem[]>([])

  const [q, setQ] = useState('')
  const [role, setRole] = useState<'ALL' | AdminUserListItem['role']>('ALL')
  const [state, setState] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({})
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [planInfo, setPlanInfo] = useState<{ plan: 'SOLO'|'TEAM'|'TRIAL', counts: any } | null>(null)

  // ➕ birthDate en el formulario
  const [form, setForm] = useState({
    firstName: '',
    lastNamePaternal: '',
    lastNameMaternal: '',
    rut: '',
    email: '',
    role: '' as InviteRole | '',
    birthDate: '' as string, // YYYY-MM-DD
  })

  // util: hoy local para max del <input type="date">
  const todayStr = useMemo(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])

  const isAdult = (yyyyMMdd: string) => {
    if (!yyyyMMdd) return false
    const [y, m, d] = yyyyMMdd.split('-').map(Number)
    const dob = new Date(y, (m - 1), d)
    const now = new Date()
    let age = now.getFullYear() - dob.getFullYear()
    const mDiff = (now.getMonth() - dob.getMonth()) || 0
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < dob.getDate())) age--
    return age >= 18
  }

  const adultNeeded = form.role === 'PSYCHOLOGIST' || form.role === 'ASSISTANT'
  const adultError = adultNeeded && (!form.birthDate || !isAdult(form.birthDate))
    ? 'Debe ser mayor de 18 años para este rol.'
    : ''

  const canSubmitInvite =
    !!form.email &&
    !!form.role &&
    (!adultNeeded || (form.birthDate && isAdult(form.birthDate)))

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/admin/users', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        })
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        if (!data?.ok) throw new Error(data?.error || 'Error')
        if (cancelled) return
        setUsers(data.data as AdminUserListItem[])
        setStats(data.stats as Stats)
      } catch (e: any) {
        if (cancelled) return
        setError(e.message || 'Error al cargar usuarios')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let items = users
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      items = items.filter(u =>
        `${u.firstName} ${u.lastNamePaternal} ${u.lastNameMaternal || ''}`.toLowerCase().includes(t) ||
        u.email.toLowerCase().includes(t) ||
        (u.rut || '').toLowerCase().includes(t)
      )
    }
    if (role !== 'ALL') items = items.filter(u => u.role === role)
    if (state !== 'ALL') {
      if (state === 'ACTIVE') items = items.filter(u => u.isActive)
      if (state === 'INACTIVE') items = items.filter(u => !u.isActive)
    }
    return items
  }, [users, q, role, state])

  const openInvite = async () => {
    setInviteOpen(true)
    setInviteLoading(true)
    setForm({
      firstName: '',
      lastNamePaternal: '',
      lastNameMaternal: '',
      rut: '',
      email: '',
      role: '',
      birthDate: ''
    })
    try {
      const res = await fetch('/api/admin/userInvitations/limits', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Error ${res.status}`)
      setPlanInfo({ plan: data.plan, counts: data.counts })
    } catch (e) {
      console.error(e)
      setPlanInfo(null)
    } finally {
      setInviteLoading(false)
    }
  }

  const submitInvite = async () => {
    if (!canSubmitInvite) return
    try {
      setInviteLoading(true)
      const res = await fetch('/api/admin/userInvitations/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastNamePaternal: form.lastNamePaternal,
          lastNameMaternal: form.lastNameMaternal,
          rut: form.rut,
          email: form.email,
          role: form.role,
          birthDate: form.birthDate || undefined
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Error ${res.status}`)
      }
      alert('Invitación creada correctamente')
      setInviteOpen(false)
    } catch (e: any) {
      alert(e.message || 'Error al crear invitación')
    } finally {
      setInviteLoading(false)
    }
  }

  const toggleUser = async (id: string, isActive: boolean) => {
    setUpdatingIds(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch('/api/admin/changeUserStatus', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, isActive: !isActive })
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Error ${res.status}`)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !isActive } : u))
      setStats(prev => ({
        ...prev,
        active: prev.active + (!isActive ? 1 : -1),
        inactive: prev.inactive + (!isActive ? -1 : 1)
      }))
    } catch (e: any) {
      alert(e.message || 'No se pudo actualizar el estado')
    } finally {
      setUpdatingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  const solo = planInfo?.plan === 'SOLO'
  const assistantsAtCap = solo && planInfo && (planInfo.counts.assistantsUsers + planInfo.counts.assistantsPending >= 1)
  const roleDisabled = (r: InviteRole) => {
    if (!planInfo) return false
    if (solo && r === 'PSYCHOLOGIST') return true
    if (solo && r === 'ASSISTANT' && assistantsAtCap) return true
    return false
  }

  return (
    <div className="relative min-h-screen">
      <Bg />
      <TopBar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header + stats + botón invitar (con Card "gradient") */}
        <Card className="p-6 mb-6" gradient>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {icons.users} Gestión de Usuarios
            </h1>
            <button
              onClick={openInvite}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 text-white hover:from-emerald-700 hover:to-green-800 transition-all shadow-sm hover:shadow-md"
            >
              Invitar usuario
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <StatTile title="Total" value={stats.total} subtitle="usuarios registrados" color="slate" />
            <StatTile title="Activos" value={<span className="text-emerald-600 dark:text-emerald-300">{stats.active}</span>} subtitle="usuarios activos" color="emerald" />
            <StatTile title="Inactivos" value={<span className="text-rose-600 dark:text-rose-300">{stats.inactive}</span>} subtitle="usuarios inactivos" color="rose" />
            <StatTile title="Pendientes" value={<span className="text-amber-600 dark:text-amber-300">{stats.pending}</span>} subtitle="por activar" color="amber" />
          </div>
        </Card>

        {/* Filtros (search con icono interno como psychologist) */}
        <Card className="p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500">{icons.search}</span>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por nombre, email o RUT…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white/90 placeholder:text-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition
                           dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:ring-emerald-400"
              />
            </div>
            <select className="border rounded-xl px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100" value={role} onChange={e => setRole(e.target.value as any)}>
              <option value="ALL">Todos los roles</option>
              <option value="PATIENT">Paciente</option>
              <option value="PSYCHOLOGIST">Psicólogo</option>
              <option value="ASSISTANT">Asistente</option>
              <option value="ADMIN">Administrador</option>
              <option value="OWNER">Propietario</option>
            </select>
            <select className="border rounded-xl px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-100" value={state} onChange={e => setState(e.target.value as any)}>
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-2">Mostrando {filtered.length} de {users.length} usuarios</div>
        </Card>

        {/* Lista */}
        <Card className="divide-y divide-slate-200 dark:divide-slate-700">
          {loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent mx-auto mb-4" />
              <div className="text-slate-600 dark:text-slate-300">Cargando usuarios…</div>
            </div>
          )}

          {error && !loading && (
            <div className="p-8 text-center">
              <div className="text-rose-600 dark:text-rose-300 font-medium mb-2">Error</div>
              <div className="text-sm text-rose-700 dark:text-rose-200">{error}</div>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="p-8 text-center text-slate-600 dark:text-slate-300">No se encontraron usuarios con los filtros aplicados.</div>
          )}

          {!loading && !error && filtered.map(u => (
            <div key={u.id} className="group relative p-4 flex items-center justify-between transition-all overflow-hidden">
              {/* overlay radial como en psychologist */}
              <div className="pointer-events-none absolute -inset-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.12),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(16,185,129,0.09),transparent)]" />
              <div className="relative w-full rounded-xl border border-slate-200 bg-gradient-to-r from-white to-emerald-50/60
                              dark:border-slate-700 dark:from-slate-900/40 dark:to-slate-900/20
                              px-4 py-3 flex items-center justify-between
                              hover:ring-1 hover:ring-emerald-200 dark:hover:ring-emerald-300/30 hover:-translate-y-[1px]
                              hover:shadow-[0_14px_40px_rgba(16,185,129,0.12)] transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl text-white grid place-items-center font-bold bg-gradient-to-br ${roleGradient(u.role)} ring-2 ring-white/60`}>
                    {(u.firstName?.[0] || '')}{(u.lastNamePaternal?.[0] || '')}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-950 dark:group-hover:text-slate-100">
                      {u.firstName} {u.lastNamePaternal} {u.lastNameMaternal || ''}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{u.email} · RUT: {u.rut}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getRolePill(u.role)}
                  <button
                    onClick={() => toggleUser(u.id, u.isActive)}
                    disabled={!!updatingIds[u.id]}
                    className={`text-xs px-2.5 py-1 rounded-lg border shadow-sm transition
                      ${u.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900/50'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800 dark:hover:bg-rose-900/50'}
                      ${updatingIds[u.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
                    title={u.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {updatingIds[u.id] ? '…' : (u.isActive ? 'Activo' : 'Inactivo')}
                  </button>

                  <Link href={`/app/admin/users/${u.id}`}
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition">
                    Ver detalle →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Modal Invitar Usuario */}
      {inviteOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white/95 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b bg-gradient-to-r from-emerald-50 to-white dark:from-slate-900/40 dark:to-slate-900/10 rounded-t-2xl border-slate-200 dark:border-slate-700">
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Invitar usuario</div>
              {planInfo && (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  Plan: <b>{planInfo.plan}</b>
                  {planInfo.plan === 'SOLO' && (
                    <span className="ml-2">· máx. 1 asistente, sin psicólogos adicionales</span>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">Nombre</label>
                  <input className="w-full border rounded-lg px-3 py-2 shadow-sm dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-100"
                    value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}/>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">Apellido paterno</label>
                  <input className="w-full border rounded-lg px-3 py-2 shadow-sm dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-100"
                    value={form.lastNamePaternal}
                    onChange={e => setForm(f => ({ ...f, lastNamePaternal: e.target.value }))}/>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">Apellido materno</label>
                  <input className="w-full border rounded-lg px-3 py-2 shadow-sm dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-100"
                    value={form.lastNameMaternal}
                    onChange={e => setForm(f => ({ ...f, lastNameMaternal: e.target.value }))}/>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">RUT</label>
                  <input className="w-full border rounded-lg px-3 py-2 shadow-sm dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-100"
                    value={form.rut}
                    onChange={e => setForm(f => ({ ...f, rut: e.target.value }))}/>
                </div>
              </div>

              {/* Fecha de nacimiento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">Email</label>
                  <input className="w-full border rounded-lg px-3 py-2 shadow-sm dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-100" type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
                </div>
                <div>
                  <label className="text-xs text-slate-600 dark:text-slate-400">Fecha de nacimiento</label>
                  <input
                    type="date"
                    max={todayStr}
                    className="w-full border rounded-lg px-3 py-2 shadow-sm dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-100"
                    value={form.birthDate}
                    onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400">Rol</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['PSYCHOLOGIST','ASSISTANT','PATIENT'] as InviteRole[]).map(r => {
                    const disabled = roleDisabled(r)
                    return (
                      <button
                        key={r}
                        onClick={() => !disabled && setForm(f => ({ ...f, role: r }))}
                        className={`px-3 py-2 rounded-lg border text-sm shadow-sm
                          ${form.role === r ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700'}
                          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={disabled}
                        type="button"
                      >
                        {r === 'PSYCHOLOGIST' ? 'Psicólogo' : r === 'ASSISTANT' ? 'Asistente' : 'Paciente'}
                      </button>
                    )
                  })}
                </div>
                {!!adultError && (
                  <div className="mt-2 text-xs text-rose-600 dark:text-rose-300">{adultError}</div>
                )}
                {planInfo?.plan === 'SOLO' && (
                  <div className="text-xs text-amber-600 mt-2">
                    {assistantsAtCap && 'Límite de asistentes alcanzado para plan SOLO.'}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-white dark:bg-slate-900/60 rounded-b-2xl flex items-center justify-end gap-3 border-slate-200 dark:border-slate-700">
              <button className="px-4 py-2 rounded-lg border hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900/60" onClick={() => setInviteOpen(false)} disabled={inviteLoading}>
                Cancelar
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-white ${canSubmitInvite ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'}`}
                onClick={submitInvite}
                disabled={!canSubmitInvite || inviteLoading}
              >
                {inviteLoading ? 'Enviando…' : 'Invitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}, ['ADMIN', 'OWNER'])
