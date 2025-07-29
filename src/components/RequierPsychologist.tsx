import useCurrentUser from '../hooks/useCurrentUser'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function RequirePsychologist({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (
      !isLoading &&
      user &&
      !(user.roles && user.roles.some((r: any) => r.role === 'PSYCHOLOGIST'))
    ) {
      router.replace('/unauthorized')
    }
  }, [user, isLoading, router])

  if (isLoading || !user) return <div>Cargando...</div>
  return <>{children}</>
}
