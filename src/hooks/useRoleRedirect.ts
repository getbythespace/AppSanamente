// src/hooks/useRoleRedirect.ts
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useCurrentUser } from '@/hooks/useCurrentUser' // export nombrado

type Role = 'SUPERADMIN' | 'OWNER' | 'ADMIN' | 'ASSISTANT' | 'PSYCHOLOGIST' | 'PATIENT'

function normalizeRoles(roles: unknown): Role[] {
  if (!Array.isArray(roles)) return []
  return (roles as any[])
    .map((r) => (typeof r === 'string' ? r : r?.role))
    .filter(Boolean) as Role[]
}

// Ajusta estas rutas si en tu app usas otras (p. ej. '/admin/dashboard')
const TARGET_BY_ROLE: Record<Role, string> = {
  SUPERADMIN: '/app/superadmin',
  OWNER: '/app/admin',         // dueños suelen ver el panel admin de su org
  ADMIN: '/app/admin',
  ASSISTANT: '/app/assistant',
  PSYCHOLOGIST: '/app/psychologist',
  PATIENT: '/app/patient',
}

export default function useRoleRedirect() {
  const { user, loading } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (loading || !user) return

    const roles = normalizeRoles((user as any).roles)
    // Prioridad de redirección si el usuario tiene múltiples roles
    const ordered: Role[] = ['SUPERADMIN','OWNER','ADMIN','PSYCHOLOGIST','ASSISTANT','PATIENT']
    const primary = ordered.find((r) => roles.includes(r))
    if (!primary) return

    const target = TARGET_BY_ROLE[primary]
    // Evita loops si ya estás en la sección correcta
    if (router.asPath.startsWith(target)) return

    router.replace(target)
  }, [user, loading, router])
}
