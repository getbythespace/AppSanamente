import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useCurrentUser, { invalidateUserCache } from '@/hooks/useCurrentUser'
import { supabase } from '@/lib/db'

type Role = 'SUPERADMIN'|'OWNER'|'ADMIN'|'ASSISTANT'|'PSYCHOLOGIST'|'PATIENT'

const LABELS: Record<Role, string> = {
  SUPERADMIN: '🔧 Superadmin',
  OWNER: '👑 Owner',
  ADMIN: '⚙️ Admin',
  ASSISTANT: '📋 Asistente',
  PSYCHOLOGIST: '🧠 Psicólogo/a',
  PATIENT: '👤 Paciente',
}

const TARGET_BY_ROLE: Record<Role, string> = {
  SUPERADMIN: '/app/superadmin',
  OWNER: '/app/owner',
  ADMIN: '/app/admin',
  ASSISTANT: '/app/assistant',
  PSYCHOLOGIST: '/app/psychologist',
  PATIENT: '/app/patient',
}

// Colores por rol
const ROLE_COLORS: Record<Role, { bg: string, text: string, hover: string, dot: string }> = {
  SUPERADMIN: { bg: 'bg-red-50', text: 'text-red-700', hover: 'hover:bg-red-100', dot: 'bg-red-600' },
  OWNER: { bg: 'bg-purple-50', text: 'text-purple-700', hover: 'hover:bg-purple-100', dot: 'bg-purple-600' },
  ADMIN: { bg: 'bg-blue-50', text: 'text-blue-700', hover: 'hover:bg-blue-100', dot: 'bg-blue-600' },
  ASSISTANT: { bg: 'bg-green-50', text: 'text-green-700', hover: 'hover:bg-green-100', dot: 'bg-green-600' },
  PSYCHOLOGIST: { bg: 'bg-indigo-50', text: 'text-indigo-700', hover: 'hover:bg-indigo-100', dot: 'bg-indigo-600' },
  PATIENT: { bg: 'bg-gray-50', text: 'text-gray-700', hover: 'hover:bg-gray-100', dot: 'bg-gray-600' },
}

function normalizeRoles(input: unknown): Role[] {
  if (!Array.isArray(input)) return []
  return (input as any[]).map(r => (typeof r === 'string' ? r : r?.role)).filter(Boolean) as Role[]
}

function roleFromPath(path: string): Role | null {
  const p = path.toLowerCase()
  if (p.includes('/app/superadmin')) return 'SUPERADMIN'
  if (p.includes('/app/owner')) return 'OWNER'
  if (p.includes('/app/admin')) return 'ADMIN'
  if (p.includes('/app/assistant')) return 'ASSISTANT'
  if (p.includes('/app/psychologist')) return 'PSYCHOLOGIST'
  if (p.includes('/app/patient')) return 'PATIENT'
  return null
}

export default function RoleSwitcher() {
  const { user, isLoading, mutate } = useCurrentUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const roles = useMemo(() => normalizeRoles(user?.roles), [user])

  // ⚠️ PRIORIDAD CORRECTA:
  // 1) Rol deducido de la URL (si el usuario tiene ese rol)
  // 2) user.activeRole (si pertenece a sus roles)
  // 3) primer rol disponible
  const currentRole = useMemo(() => {
    const pathRole = roleFromPath(router.asPath || router.pathname)
    if (pathRole && roles.includes(pathRole)) return pathRole

    const active = (user as any)?.activeRole as Role | undefined
    if (active && roles.includes(active)) return active

    return roles[0] || null
  }, [router.asPath, router.pathname, roles, user])

  useEffect(() => { setError(null) }, [user, currentRole])

  const isInApp = (router.asPath || router.pathname).startsWith('/app')
  const visibleRoles = useMemo(() => roles.filter(r => r !== 'PATIENT' || roles.length === 1), [roles])

  // Cerrar menú al click fuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (isLoading || !user || !isInApp) return null

  if (roles.length === 1 && roles[0] === 'PATIENT') {
    const colors = ROLE_COLORS.PATIENT
    return (
      <div className={`text-xs px-3 py-1 rounded-full ${colors.bg} ${colors.text} border border-gray-200`}>
        {LABELS.PATIENT}
      </div>
    )
  }

  const currentLabel = currentRole ? LABELS[currentRole] : '?'
  const currentColors = currentRole ? ROLE_COLORS[currentRole] : ROLE_COLORS.ADMIN

  async function switchTo(role: Role) {
    if (busy || role === currentRole) return

    setBusy(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No hay sesión activa')

      const resp = await fetch('/api/session/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({ role }),
      })
      if (!resp.ok) {
        let message = `Error ${resp.status}`
        try {
          const j = await resp.json()
          message = j.error || message
        } catch {}
        throw new Error(message)
      }

      // Revalidar usuario y esperar a que /api/auth/me refleje el rol nuevo
      invalidateUserCache()
      await mutate()
      const start = Date.now()
      while (Date.now() - start < 1500) {
        try {
          const me = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' }).then(r => r.json())
          if (me?.ok && me?.data?.activeRole === role) break
        } catch {}
        await new Promise(r => setTimeout(r, 120))
      }

      const target = TARGET_BY_ROLE[role] || '/app/patient'
      await router.replace(target)
    } catch (err: any) {
      console.error('❌ Error switching role:', err)
      setError(err.message || 'Error al cambiar rol')
      if (err.message?.toLowerCase().includes('sesión') || err.message?.toLowerCase().includes('autentic')) {
        window.location.href = '/auth/login'
      }
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      {error && (
        <div className="absolute bottom-full mb-2 right-0 bg-red-100 border-2 border-red-300 text-red-800 text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 min-w-max">
          <div className="flex items-center gap-2">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold text-sm leading-none">×</button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        disabled={busy}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${currentColors.bg} ${currentColors.text} text-sm border-2 border-transparent hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${busy ? 'opacity-70 cursor-not-allowed' : ''}`}
        title="Cambiar rol"
      >
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${currentColors.dot}`} />
        <span className="font-semibold">{currentLabel}</span>
        {busy ? (
          <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
        ) : (
          <svg width="14" height="14" viewBox="0 0 20 20" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-52 rounded-xl border-2 border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cambiar Rol</div>
          </div>

          <div className="py-1">
            {visibleRoles.map(role => {
              const colors = ROLE_COLORS[role]
              const isCurrentRole = role === currentRole

              return (
                <button
                  key={role}
                  onClick={() => switchTo(role)}
                  disabled={busy || isCurrentRole}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors duration-150 flex items-center gap-3 ${
                    isCurrentRole
                      ? `${colors.bg} ${colors.text} font-semibold cursor-default`
                      : `hover:bg-gray-50 text-gray-700 ${busy ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-900'}`
                  }`}
                >
                  <span className={`inline-flex h-2 w-2 rounded-full ${colors.dot} ${isCurrentRole ? 'ring-2 ring-offset-1 ring-current' : ''}`} />
                  <span className="flex-1">{LABELS[role]}</span>
                  {isCurrentRole && (<span className="text-xs bg-white px-2 py-0.5 rounded-full font-medium shadow-sm">Actual</span>)}
                  {busy && !isCurrentRole && (<div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent" />)}
                </button>
              )
            })}
          </div>

          {busy && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="animate-spin rounded-full h-3 w-3 border border-blue-600 border-t-transparent" />
                <span>Cambiando rol...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
