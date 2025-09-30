export type Role = 'SUPERADMIN' | 'OWNER' | 'ADMIN' | 'ASSISTANT' | 'PSYCHOLOGIST' | 'PATIENT'

export const ROLE_GRADIENT: Record<Role, string> = {
  SUPERADMIN:   'from-indigo-900 via-slate-900 to-slate-950',
  OWNER:        'from-amber-900 via-slate-900 to-slate-950',
  ADMIN:        'from-emerald-900 via-slate-900 to-slate-950',
  ASSISTANT:    'from-slate-800 via-slate-900 to-slate-950',
  PSYCHOLOGIST: 'from-violet-900 via-slate-900 to-slate-950',
  PATIENT:      'from-blue-900 via-slate-900 to-slate-950',
}

export const ROLE_HALO_A: Record<Role, string> = {
  SUPERADMIN:   'bg-fuchsia-400/20 blur-3xl',
  OWNER:        'bg-amber-400/20 blur-3xl',
  ADMIN:        'bg-emerald-400/20 blur-3xl',
  ASSISTANT:    'bg-sky-400/10 blur-3xl',
  PSYCHOLOGIST: 'bg-violet-400/20 blur-3xl',
  PATIENT:      'bg-cyan-400/20 blur-3xl',
}

export const ROLE_HALO_B: Record<Role, string> = {
  SUPERADMIN:   'bg-indigo-400/10 blur-3xl',
  OWNER:        'bg-orange-400/10 blur-3xl',
  ADMIN:        'bg-teal-400/10 blur-3xl',
  ASSISTANT:    'bg-slate-400/10 blur-3xl',
  PSYCHOLOGIST: 'bg-purple-400/10 blur-3xl',
  PATIENT:      'bg-blue-400/10 blur-3xl',
}

export function getActiveRole(user?: any): Role {
  const roles: string[] = Array.isArray(user?.roles)
    ? user.roles.map((r: any) => (typeof r === 'string' ? r : r.role))
    : []
  const active = (roles.find(r => r !== 'PATIENT') as Role) || (roles[0] as Role) || 'PATIENT'
  return active
}
