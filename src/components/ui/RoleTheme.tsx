// src/components/ui/RoleTheme.tsx
import React, { createContext, useContext, useMemo } from 'react'
import useCurrentUser from '@/hooks/useCurrentUser'

type Role = 'SUPERADMIN' | 'OWNER' | 'ADMIN' | 'ASSISTANT' | 'PSYCHOLOGIST' | 'PATIENT'

type RoleTheme = {
  role: Role
  gradient: string           // bg-gradient-to-b <from via to>
  haloA: string              // bg-.../X blur-...
  haloB: string
  panel: string              // tarjeta/containers
  ring: string               // focus ring
  button: string             // botón primario
  buttonHover: string
  chip: string               // pill por defecto
  link: string               // links/acento
}

const THEMES: Record<Role, RoleTheme> = {
  SUPERADMIN: {
    role: 'SUPERADMIN',
    gradient: 'from-indigo-900 via-slate-900 to-slate-950',
    haloA: 'bg-fuchsia-400/20 blur-3xl',
    haloB: 'bg-indigo-400/10 blur-3xl',
    panel: 'border-white/10 bg-white/5 backdrop-blur-xl',
    ring: 'focus:ring-indigo-300',
    button: 'bg-indigo-500',
    buttonHover: 'hover:bg-indigo-400',
    chip: 'bg-indigo-100 text-indigo-700',
    link: 'text-indigo-300 hover:text-indigo-200',
  },
  OWNER: {
    role: 'OWNER',
    gradient: 'from-amber-900 via-slate-900 to-slate-950',
    haloA: 'bg-amber-400/20 blur-3xl',
    haloB: 'bg-orange-400/10 blur-3xl',
    panel: 'border-white/10 bg-white/5 backdrop-blur-xl',
    ring: 'focus:ring-amber-300',
    button: 'bg-amber-500',
    buttonHover: 'hover:bg-amber-400',
    chip: 'bg-amber-100 text-amber-700',
    link: 'text-amber-300 hover:text-amber-200',
  },
  ADMIN: {
    role: 'ADMIN',
    gradient: 'from-emerald-900 via-slate-900 to-slate-950',
    haloA: 'bg-emerald-400/20 blur-3xl',
    haloB: 'bg-teal-400/10 blur-3xl',
    panel: 'border-white/10 bg-white/5 backdrop-blur-xl',
    ring: 'focus:ring-emerald-300',
    button: 'bg-emerald-500',
    buttonHover: 'hover:bg-emerald-400',
    chip: 'bg-green-100 text-green-700',
    link: 'text-emerald-300 hover:text-emerald-200',
  },
  ASSISTANT: {
    role: 'ASSISTANT',
    gradient: 'from-slate-800 via-slate-900 to-slate-950',
    haloA: 'bg-sky-400/10 blur-3xl',
    haloB: 'bg-slate-400/10 blur-3xl',
    panel: 'border-white/10 bg-white/5 backdrop-blur-xl',
    ring: 'focus:ring-sky-300',
    button: 'bg-sky-500',
    buttonHover: 'hover:bg-sky-400',
    chip: 'bg-slate-200 text-slate-700',
    link: 'text-sky-300 hover:text-sky-200',
  },
  PSYCHOLOGIST: {
    role: 'PSYCHOLOGIST',
    gradient: 'from-violet-900 via-slate-900 to-slate-950',
    haloA: 'bg-violet-400/20 blur-3xl',
    haloB: 'bg-purple-400/10 blur-3xl',
    panel: 'border-white/10 bg-white/5 backdrop-blur-xl',
    ring: 'focus:ring-violet-300',
    button: 'bg-violet-500',
    buttonHover: 'hover:bg-violet-400',
    chip: 'bg-purple-100 text-purple-700',
    link: 'text-violet-300 hover:text-violet-200',
  },
  PATIENT: {
    role: 'PATIENT',
    gradient: 'from-blue-900 via-slate-900 to-slate-950',
    haloA: 'bg-cyan-400/20 blur-3xl',
    haloB: 'bg-blue-400/10 blur-3xl',
    panel: 'border-white/10 bg-white/5 backdrop-blur-xl',
    ring: 'focus:ring-blue-300',
    button: 'bg-blue-500',
    buttonHover: 'hover:bg-blue-400',
    chip: 'bg-blue-100 text-blue-700',
    link: 'text-cyan-300 hover:text-cyan-200',
  },
}

const RoleThemeCtx = createContext<RoleTheme>(THEMES.ADMIN)

export function RoleThemeProvider({ children }: { children: React.ReactNode }) {
  // lee el rol activo desde tu hook actual
  const { user } = useCurrentUser()
  // preferimos rol activo distinto de PATIENT si existe, si no, el primero:
  const roles: string[] = Array.isArray(user?.roles)
    ? user!.roles.map((r: any) => (typeof r === 'string' ? r : r.role))
    : []
  const active: Role =
    (roles.find(r => r !== 'PATIENT') as Role) ||
    (roles[0] as Role) ||
    'PATIENT'

  const theme = useMemo(() => THEMES[active] || THEMES.PATIENT, [active])
  return <RoleThemeCtx.Provider value={theme}>{children}</RoleThemeCtx.Provider>
}

export function useRoleTheme() {
  return useContext(RoleThemeCtx)
}
