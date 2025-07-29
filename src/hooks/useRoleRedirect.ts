import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useCurrentUser from './useCurrentUser' 

export default function useRoleRedirect() {
  const { user, isLoading } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !user) return
const roles = user.roles.map((r: any) => r.role)
    if (roles.includes('ADMIN')) {
      router.replace('/admin/dashboard')
    } else if (roles.includes('PSYCHOLOGIST')) {
      router.replace('/psychologist/dashboard')
    } else if (roles.includes('ASSISTANT')) {
      router.replace('/admin/dashboard') // donde corresponda
    } else if (roles.includes('PATIENT')) {
      router.replace('/patient/dashboard')
    }
  }, [user, isLoading, router])
}
