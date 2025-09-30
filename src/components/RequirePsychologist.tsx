import React, { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/router'
import useCurrentUser from '@/hooks/useCurrentUser'

type Props = {
  children: ReactNode
}

export default function RequirePsychologist({ children }: Props) {
  const router = useRouter()
  const { user, isLoading } = useCurrentUser() 
  
  useEffect(() => {
    if (isLoading) return
    
    if (!user) {
      router.replace('/auth/login')
      return
    }
    
    const roles = (user.roles || []).map(r => typeof r === 'string' ? r : r.role)
    if (!roles.includes('PSYCHOLOGIST')) {
      router.replace('/unauthorized')
    }
  }, [user, isLoading, router])
  
  if (isLoading) return <div className="p-4">Cargando...</div>
  if (!user) return null
  
  return <>{children}</>
}