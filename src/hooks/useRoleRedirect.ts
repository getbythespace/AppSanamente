import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useCurrentUser from '@/hooks/useCurrentUser'
import type { RoleType } from '@/types/roles'

const TARGET_BY_ROLE: Record<RoleType, string> = {
  SUPERADMIN: '/app/superadmin',
  OWNER: '/app/owner',
  ADMIN: '/app/admin',
  ASSISTANT: '/app/assistant',
  PSYCHOLOGIST: '/app/psychologist',
  PATIENT: '/app/patient',
}

export default function useRoleRedirect() {
  const router = useRouter()
  const { user, loading, unauthorized, didLoadOnce } = useCurrentUser()

  useEffect(() => {
    if (!loading && didLoadOnce && unauthorized) {
      router.replace('/auth/login')
    }
  }, [loading, didLoadOnce, unauthorized, router])

  useEffect(() => {
    if (loading || !user) return
    const roles = (user.roles || []) as RoleType[]
    const active = (user.activeRole as RoleType) || (roles.find(r => r !== 'PATIENT') as RoleType) || (roles[0] as RoleType) || 'PATIENT'
    const target = TARGET_BY_ROLE[active]
    if (router.pathname === '/app' || router.pathname === '/app/') {
      router.replace(target)
    }
  }, [loading, user, router])
}
