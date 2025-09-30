import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useCurrentUser from '@/hooks/useCurrentUser'
import { supabase } from '@/lib/db'

const TARGET_BY_ROLE: Record<string, string> = {
  SUPERADMIN: '/app/superadmin',
  OWNER: '/app/owner',
  ADMIN: '/app/admin',
  ASSISTANT: '/app/assistant',
  PSYCHOLOGIST: '/app/psychologist',
  PATIENT: '/app/patient'
}

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useCurrentUser()

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!data.session && !isLoading && !user) {
        router.replace('/auth/login')
        return
      }
    }
    check()

    if (isLoading) return
    if (!user) {
      router.replace('/auth/login')
      return
    }

    const roles = user.roles || []
    const active = user.activeRole || roles.find(r => r !== 'PATIENT') || roles[0] || 'PATIENT'
    const target = TARGET_BY_ROLE[active] || '/app/patient'
    router.replace(target)
  }, [user, isLoading, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-xl font-medium">Redirigiendo...</h1>
    </div>
  )
}
