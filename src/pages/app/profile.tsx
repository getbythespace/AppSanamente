// pages/app/profile/index.tsx
import { useEffect, useState } from 'react'
import withPageRole from '@/utils/withPageRole'
import { getJson, postJson } from '@/services'
import { supabase } from '@/lib/db'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { formatRut } from '@/utils/validateRut'
import ThemeToggle from '@/components/ui/ThemeToggle'

type Role =
  | 'SUPERADMIN'
  | 'OWNER'
  | 'ADMIN'
  | 'ASSISTANT'
  | 'PSYCHOLOGIST'
  | 'PATIENT'

type Me = {
  id: string
  email: string
  firstName?: string | null
  lastNamePaternal?: string | null
  lastNameMaternal?: string | null
  rut?: string | null
  dob?: string | null
  // Compat: puede venir como string o como arreglo en roles
  role?: Role
  roles?: any
}

function validateNewPassword(p: string) {
  const hasLen = p.length >= 8
  const hasUpper = /[A-Z]/.test(p)
  const hasNumOrSym = /[0-9!@#$%^&*()_\-+=\[{\]};:'",.<>/?\\|`~]/.test(p)
  return hasLen && hasUpper && hasNumOrSym
}

/* ===== Helpers de visualización ===== */
function formatRutLoose(raw?: string | null) {
  if (!raw) return ''
  const s = String(raw).trim()
  try {
    const f = formatRut(s)
    if (f) return f
  } catch { /* ignore */ }
  const cleaned = s.replace(/[.\-]/g, '').toUpperCase()
  if (cleaned.length >= 2 && /^[0-9]+[0-9K]$/.test(cleaned)) {
    const body = cleaned.slice(0, -1)
    const dv = cleaned.slice(-1)
    const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${withDots}-${dv}`
  }
  return s
}

function formatDobForInput(dob?: string | null) {
  if (!dob) return ''
  const s = String(dob).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('-')
    return `${yyyy}-${mm}-${dd}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return ''
}

/* ===== Iconos ===== */
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
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  key: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  mail: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  id: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
    </svg>
  ),
  lock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

/* ===== Fondo con halos (respetando var(--app-bg) global) ===== */
const Bg = () => (
  <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-400/10" />
    <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-lime-200/25 blur-3xl dark:bg-lime-300/10" />
    <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-300/10" />
  </div>
)

/* ===== TopBar con ThemeToggle ===== */
function TopBar() {
  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } finally { window.location.href = '/auth/login' }
  }
  return (
    <header className="w-full text-white relative">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-800" />
      <div className="relative max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center font-bold text-lg backdrop-blur-sm shadow-sm">S</div>
          <div className="font-semibold text-xl">Sanamente</div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-white/10 border border-white/20">
            {icons.user} Perfil
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 border border-red-700 transition-all duration-200"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <div className="h-[1px] w-full bg-white/25" />
    </header>
  )
}

/* ===== Card: sólida en light, “glass” en dark ===== */
function Card({
  children,
  className = '',
  gradient = false
}: {
  children: React.ReactNode
  className?: string
  gradient?: boolean
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm
                  dark:border-slate-700 dark:bg-slate-900/60
                  ${gradient ? 'bg-gradient-to-br from-white/95 via-white/90 to-emerald-50/70 dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/40' : ''}
                  shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(16,185,129,0.06)]
                  hover:shadow-[0_1px_0_#fff_inset,0_18px_45px_rgba(16,185,129,0.14)]
                  transition-all hover:ring-1 hover:ring-emerald-200 hover:-translate-y-[1px]
                  dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
                  ${className}`}
    >
      {children}
    </section>
  )
}

/* ===== Normalización de roles y home ===== */
const ROLE_PRIORITY: Role[] = ['SUPERADMIN','OWNER','ADMIN','PSYCHOLOGIST','ASSISTANT','PATIENT']
const HOME_BY_ROLE: Record<Role, string> = {
  SUPERADMIN: '/app/superadmin',
  OWNER: '/app/owner',
  ADMIN: '/app/admin',
  PSYCHOLOGIST: '/app/psychologist',
  ASSISTANT: '/app/assistant',
  PATIENT: '/app/patient',
}
function normalizeRoles(input: any): Role[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return input
      .map((r) => (typeof r === 'string' ? r : r?.role || r?.name))
      .filter((x): x is Role => typeof x === 'string') as Role[]
  }
  if (Array.isArray(input?.roles)) return normalizeRoles(input.roles)
  if (typeof input?.activeRole === 'string') return [input.activeRole as Role]
  return []
}
function pickBestRole(roles: Role[]): Role | null {
  if (!roles?.length) return null
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r
  return roles[0] || null
}

function Profile() {
  const router = useRouter()

  const [me, setMe] = useState<Me | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [err, setErr] = useState<string | null>(null)

  // password
  const [pwdCurrent, setPwdCurrent] = useState('')
  const [pwdNew, setPwdNew] = useState('')
  const [pwdNew2, setPwdNew2] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<string | null>(null)
  const [pwdErr, setPwdErr] = useState<string | null>(null)

  // email
  const [email1, setEmail1] = useState('')
  const [email2, setEmail2] = useState('')
  const [emailPwd, setEmailPwd] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg, setEmailMsg] = useState<string | null>(null)
  const [emailErr, setEmailErr] = useState<string | null>(null)

  // cargar datos
  useEffect(() => {
    (async () => {
      try {
        const j = (await getJson('/api/users/me')) as Me
        setMe(j)

        let detected: Role[] = normalizeRoles((j as any)?.roles)
        if (!detected.length && j.role) detected = [j.role]

        if (!detected.length) {
          const { data: { user } } = await supabase.auth.getUser()
          const metaAny = (user?.app_metadata as any) || {}
          const userAny = (user?.user_metadata as any) || {}
          detected = [
            ...normalizeRoles(metaAny.roles),
            ...normalizeRoles(userAny.roles),
          ]
          if (!detected.length && (metaAny.role || userAny.role)) {
            detected = normalizeRoles([metaAny.role || userAny.role])
          }
        }
        setRoles(detected)
      } catch (e: any) {
        setErr(e.message || 'Error cargando perfil')
      }
    })()
  }, [])

  const bestRole = pickBestRole(roles) || 'PATIENT'
  const homeHref = HOME_BY_ROLE[bestRole]

  /* ===== Password ===== */
  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdErr(null); setPwdMsg(null)

    if (!me?.email) { setPwdErr('No hay email de la cuenta.'); return }
    if (!pwdCurrent || !pwdNew || !pwdNew2) { setPwdErr('Completa todos los campos.'); return }
    if (pwdNew !== pwdNew2) { setPwdErr('Las nuevas contraseñas no coinciden.'); return }
    if (pwdNew === pwdCurrent) { setPwdErr('La nueva contraseña no puede ser igual a la actual.'); return }
    if (!validateNewPassword(pwdNew)) {
      setPwdErr('La nueva contraseña debe tener al menos 8 caracteres, 1 mayúscula y 1 número o símbolo.')
      return
    }

    setPwdSaving(true)
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: me.email,
        password: pwdCurrent,
      })
      if (signErr) { setPwdErr('La contraseña actual es incorrecta.'); return }

      const { error: updErr } = await supabase.auth.updateUser({ password: pwdNew })
      if (updErr) { setPwdErr(updErr.message || 'No se pudo actualizar la contraseña.'); return }

      await supabase.auth.signOut()
      setPwdMsg('Contraseña actualizada. Te redirigiremos al login…')
      setPwdCurrent(''); setPwdNew(''); setPwdNew2('')
      router.replace('/auth/login')
    } catch (e: any) {
      setPwdErr(e.message || 'Error al cambiar la contraseña.')
    } finally {
      setPwdSaving(false)
    }
  }

  /* ===== Email ===== */
  async function onChangeEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailErr(null); setEmailMsg(null)

    if (!me?.email) { setEmailErr('Cuenta sin email.'); return }
    if (!email1 || !email2 || !emailPwd) { setEmailErr('Completa todos los campos.'); return }
    if (email1 !== email2) { setEmailErr('Los correos no coinciden.'); return }

    setEmailSaving(true)
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: me.email, password: emailPwd,
      })
      if (signErr) throw new Error('Contraseña actual incorrecta.')

      await postJson('/api/users/change-email', { newEmail: email1 })

      setEmailMsg('Email actualizado correctamente.')
      setEmail1(''); setEmail2(''); setEmailPwd('')
      const j = await getJson('/api/users/me')
      setMe(j as Me)
    } catch (e: any) {
      setEmailErr(e.message)
    } finally {
      setEmailSaving(false)
    }
  }

  /* ===== UI ===== */
  if (!me) {
    return (
      <div className="relative min-h-screen">
        <Bg />
        <TopBar />
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-slate-100">
                {icons.edit}
                Editar Perfil
              </h1>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                {icons.back}
                Volver
              </button>
            </div>
            {err ? (
              <div className="rounded-lg border border-rose-300/40 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 px-4 py-3 text-rose-700 dark:text-rose-200">
                Error: {err}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 text-slate-600 dark:text-slate-300">
                <div className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                <span className="ml-4 text-lg">Cargando perfil...</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    )
  }

  const rutDisplay = formatRutLoose(me.rut)
  const dobDisplay = formatDobForInput(me.dob)

  return (
    <div className="relative min-h-screen">
      <Bg />
      <TopBar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Card className="p-8" gradient>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <Link
                    href={homeHref}
                    className="flex items-center gap-2 text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200 font-medium transition-colors"
                  >
                    {icons.back}
                    Volver al Panel
                  </Link>
                </div>
                <h1 className="text-4xl font-bold mb-3 flex items-center gap-3 text-slate-900 dark:text-slate-100">
                  {icons.edit}
                  Editar Perfil
                </h1>
                <p className="text-slate-600 dark:text-slate-300">
                  Gestiona tu información personal y configuración de cuenta
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {(me.firstName?.charAt(0) || '').toUpperCase()}
                  {(me.lastNamePaternal?.charAt(0) || '').toUpperCase()}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Mis datos */}
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 grid place-items-center">
                {icons.user}
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Mis Datos</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  {icons.mail}
                  Email
                </label>
                <input
                  value={me.email}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-700 cursor-not-allowed
                             dark:bg-white/5 dark:border-white/10 dark:text-white/80"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Para cambiar tu email, usa la sección correspondiente
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    {icons.user}
                    Nombre
                  </label>
                  <input
                    value={me.firstName || ''}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-700 cursor-not-allowed
                               dark:bg-white/5 dark:border-white/10 dark:text-white/80"
                  />
                </div>
                <div>
                  <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    {icons.user}
                    Apellido paterno
                  </label>
                  <input
                    value={me.lastNamePaternal || ''}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-700 cursor-not-allowed
                               dark:bg-white/5 dark:border-white/10 dark:text-white/80"
                  />
                </div>
                <div>
                  <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    {icons.user}
                    Apellido materno
                  </label>
                  <input
                    value={me.lastNameMaternal || ''}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-700 cursor-not-allowed
                               dark:bg-white/5 dark:border-white/10 dark:text-white/80"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {icons.id}
                      RUT
                    </label>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-white/70 bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-full">
                      {icons.lock}
                      No editable
                    </span>
                  </div>
                  <input
                    value={rutDisplay}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-700 cursor-not-allowed
                               dark:bg-white/5 dark:border-white/10 dark:text-white/80"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Contacta soporte para cambios.</p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    {icons.calendar}
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={dobDisplay}
                    disabled
                    className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-700 cursor-not-allowed
                               dark:bg-white/5 dark:border-white/10 dark:text-white/80"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Definida al registrar; no editable.</p>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Cambiar contraseña */}
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:bg-yellow-500/20 dark:text-yellow-300 grid place-items-center">
                  {icons.shield}
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cambiar Contraseña</h2>
              </div>

              <form onSubmit={onChangePassword} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {icons.key}
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      value={pwdCurrent}
                      onChange={e=>setPwdCurrent(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-900 placeholder-slate-400
                                 focus:ring-2 focus:ring-amber-400/40 focus:border-transparent transition
                                 dark:bg-white/5 dark:border-white/10 dark:text-white"
                      autoComplete="current-password"
                      placeholder="Tu contraseña actual"
                    />
                  </div>

                  <div>
                    <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {icons.key}
                      Nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={pwdNew}
                      onChange={e=>setPwdNew(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-900 placeholder-slate-400
                                 focus:ring-2 focus:ring-amber-400/40 focus:border-transparent transition
                                 dark:bg-white/5 dark:border-white/10 dark:text-white"
                      autoComplete="new-password"
                      placeholder="Nueva contraseña"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mínimo 8 caracteres, 1 mayúscula y 1 número o símbolo.</p>
                  </div>

                  <div>
                    <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {icons.key}
                      Repetir nueva contraseña
                    </label>
                    <input
                      type="password"
                      value={pwdNew2}
                      onChange={e=>setPwdNew2(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-900 placeholder-slate-400
                                 focus:ring-2 focus:ring-amber-400/40 focus:border-transparent transition
                                 dark:bg-white/5 dark:border-white/10 dark:text-white"
                      autoComplete="new-password"
                      placeholder="Confirma tu nueva contraseña"
                    />
                  </div>
                </div>

                {pwdErr && (
                  <div className="rounded-lg border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700
                                  dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200">
                    {pwdErr}
                  </div>
                )}

                {pwdMsg && (
                  <div className="rounded-lg border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-700
                                  dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200">
                    {pwdMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pwdSaving}
                  className="w-full px-6 py-3 rounded-xl bg-amber-500 text-slate-900 font-medium hover:bg-amber-400
                             disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {pwdSaving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      Actualizando...
                    </div>
                  ) : (
                    'Actualizar contraseña'
                  )}
                </button>
              </form>
            </Card>

            {/* Cambiar email */}
            <Card className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 grid place-items-center">
                  {icons.mail}
                </div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Cambiar Email</h2>
              </div>

              <form onSubmit={onChangeEmail} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {icons.mail}
                      Nuevo email
                    </label>
                    <input
                      type="email"
                      value={email1}
                      onChange={e=>setEmail1(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-900 placeholder-slate-400
                                 focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent transition
                                 dark:bg-white/5 dark:border-white/10 dark:text-white"
                      placeholder="nuevo@email.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {icons.mail}
                      Repetir nuevo email
                    </label>
                    <input
                      type="email"
                      value={email2}
                      onChange={e=>setEmail2(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-900 placeholder-slate-400
                                 focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent transition
                                 dark:bg-white/5 dark:border-white/10 dark:text-white"
                      placeholder="Confirma tu nuevo email"
                    />
                  </div>

                  <div>
                    <label className="text-sm mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {icons.key}
                      Contraseña actual
                    </label>
                    <input
                      type="password"
                      value={emailPwd}
                      onChange={e=>setEmailPwd(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/90 border border-slate-200 text-slate-900 placeholder-slate-400
                                 focus:ring-2 focus:ring-emerald-400/40 focus:border-transparent transition
                                 dark:bg-white/5 dark:border-white/10 dark:text-white"
                      placeholder="Tu contraseña actual"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Confirma tu identidad para cambiar el email</p>
                  </div>
                </div>

                {emailErr && (
                  <div className="rounded-lg border border-rose-300/40 bg-rose-50 px-4 py-3 text-sm text-rose-700
                                  dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-200">
                    {emailErr}
                  </div>
                )}

                {emailMsg && (
                  <div className="rounded-lg border border-emerald-300/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-700
                                  dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-200">
                    {emailMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={emailSaving}
                  className="w-full px-6 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700
                             disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {emailSaving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </div>
                  ) : (
                    'Solicitar cambio de email'
                  )}
                </button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withPageRole(Profile as any, ['PATIENT','PSYCHOLOGIST','ADMIN','ASSISTANT','OWNER','SUPERADMIN'])
