import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useCurrentUser } from '@/hooks/useCurrentUser' 

type Role = 'SUPERADMIN' | 'OWNER' | 'ADMIN' | 'ASSISTANT' | 'PSYCHOLOGIST' | 'PATIENT'

function normalizeRoles(roles: unknown): Role[] {
  if (!Array.isArray(roles)) return []
  return (roles as any[])
    .map((r) => (typeof r === 'string' ? r : r?.role))
    .filter(Boolean) as Role[]
}

export default function withPageRole<P extends Record<string, unknown>>(
  Comp: React.ComponentType<P>,
  allowed: Role[]
) {
  const Guarded: React.FC<P> = (props: P) => {
    const router = useRouter()
    const { user, loading } = useCurrentUser() 

    useEffect(() => {
      if (loading) return
      if (!user) { router.replace('/auth/login'); return }

      const roles = normalizeRoles((user as any).roles)
      const hasAccess = roles.some((r) => allowed.includes(r))
      if (!hasAccess) router.replace('/unauthorized')
    }, [user, loading, router])

    if (loading || !user) return <div className="p-6">Cargando…</div>
    return <Comp {...props} />
  }

  ;(Guarded as any).displayName = `withPageRole(${(Comp as any).displayName || Comp.name || 'Component'})`
  return Guarded
}
