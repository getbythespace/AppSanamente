// src/pages/app/index.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useCurrentUser } from '@/hooks/useCurrentUser' // ← export nombrado

type Role = 'SUPERADMIN' | 'OWNER' | 'ADMIN' | 'ASSISTANT' | 'PSYCHOLOGIST' | 'PATIENT'

function normalizeRoles(roles: unknown): Role[] {
  if (!Array.isArray(roles)) return []
  return (roles as any[])
    .map((r) => (typeof r === 'string' ? r : r?.role))
    .filter(Boolean) as Role[]
}

const TARGET_BY_ROLE: Record<Role, string> = {
  SUPERADMIN: '/app/superadmin',
  OWNER: '/app/admin',
  ADMIN: '/app/admin',
  ASSISTANT: '/app/assistant',
  PSYCHOLOGIST: '/app/psychologist',
  PATIENT: '/app/patient',
}

export default function AppHome() {
  const router = useRouter()
  const { user, loading } = useCurrentUser()

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/auth/login'); return }

    const roles = normalizeRoles((user as any).roles)
    const ordered: Role[] = ['SUPERADMIN', 'OWNER', 'ADMIN', 'PSYCHOLOGIST', 'ASSISTANT', 'PATIENT']
    const primary = ordered.find((r) => roles.includes(r))
    const target = primary ? TARGET_BY_ROLE[primary] : '/unauthorized'

    if (!router.asPath.startsWith(target)) router.replace(target)
  }, [user, loading, router])

  return <div className="p-6">Redirigiendo…</div>
}
