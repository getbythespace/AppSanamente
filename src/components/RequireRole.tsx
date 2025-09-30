import React from 'react'
import { useRouter } from 'next/router'
import useCurrentUser from '@/hooks/useCurrentUser'
import type { RoleType } from '@/types/roles'

interface RequireRoleProps {
  allowedRoles: RoleType[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RequireRole({ 
  allowedRoles, 
  children, 
  fallback = <div>No tienes permisos para ver esta página</div> 
}: RequireRoleProps) {
  const { user, loading } = useCurrentUser()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    router.push('/auth/login')
    return null
  }

  // VERIFICAR ROLES COMO ARRAY DE STRINGS
  const userRoles = user.roles as RoleType[]
  const hasPermission = userRoles.some(role => allowedRoles.includes(role))

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}