// src/utils/withPageRole.tsx
import React, { useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import useCurrentUser from '@/hooks/useCurrentUser'

type Role = 'SUPERADMIN'|'OWNER'|'ADMIN'|'ASSISTANT'|'PSYCHOLOGIST'|'PATIENT'
type UserStatus = 'ACTIVE'|'INACTIVE'|'PENDING'|'SUSPENDED'|'DELETED'

export default function withPageRole<P extends Record<string, unknown>>(
  Comp: React.ComponentType<P>,
  allowed: Role[]
) {
  const Guarded: React.FC<P> = (props: P) => {
    const router = useRouter()
    const { user, isLoading } = useCurrentUser()

    // ⬇️ ÚNICO CAMBIO IMPORTANTE: reconocer rol desde múltiples fuentes y normalizar
    const userRoles = useMemo<Role[]>(() => {
      if (!user) return []

      const buckets: any[] = []

      // Lo que ya tenías
      if ((user as any).roles) {
        const arr = Array.isArray((user as any).roles) ? (user as any).roles : [(user as any).roles]
        buckets.push(...arr)
      } else if ((user as any).activeRole) {
        buckets.push((user as any).activeRole)
      }

      // Nuevos orígenes frecuentes
      if ((user as any).role) buckets.push((user as any).role)

      const am = (user as any).app_metadata || {}
      const um = (user as any).user_metadata || {}
      if (am.role) buckets.push(am.role)
      if (Array.isArray(am.roles)) buckets.push(...am.roles)
      if (um.role) buckets.push(um.role)

      // Normalización: string u objetos { role } / { name }
      const norm = buckets
        .map((r) => (typeof r === 'string' ? r : r?.role || r?.name))
        .filter(Boolean)
        .map((r: string) => r.toUpperCase()) as Role[]

      // Únicos
      return Array.from(new Set(norm))
    }, [user])

    const hasAccess = useMemo(() => {
      // SUPERADMIN siempre puede entrar
      if (userRoles.includes('SUPERADMIN')) return true
      return userRoles.some((r) => allowed.includes(r))
    }, [userRoles, allowed])

    useEffect(() => {
      if (isLoading) return

      if (!user) {
        router.replace('/auth/login')
        return
      }

      const status = (user.status || 'ACTIVE') as UserStatus
      if (status !== 'ACTIVE') {
        router.replace(`/auth/login?reason=${status.toLowerCase()}`)
        return
      }

      if (!hasAccess) {
        router.replace('/unauthorized')
        return
      }
    }, [user, isLoading, hasAccess, router])

    if (isLoading) return <div className="p-6">Cargando…</div>
    if (!user) return null
    if ((user.status && user.status !== 'ACTIVE') || !hasAccess) return null
    return React.createElement(Comp, props)
  }

  ;(Guarded as any).displayName = `withPageRole(${(Comp as any).displayName || Comp.name || 'Component'})`
  return Guarded
}
