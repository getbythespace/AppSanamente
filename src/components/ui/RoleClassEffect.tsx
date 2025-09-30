import { useEffect } from 'react'
import useCurrentUser from '@/hooks/useCurrentUser'

export default function RoleClassEffect() {
  const { user } = useCurrentUser()
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    // atributo informativo
    const roles = Array.isArray(user?.roles)
      ? user!.roles.map((r: any) => (typeof r === 'string' ? r : r.role))
      : []
    const active = roles.find(r => r !== 'PATIENT') || roles[0] || 'PATIENT'
    root.setAttribute('data-role', active)
  }, [user?.roles])
  return null
}
