import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useCurrentUser from '@/hooks/useCurrentUser'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/db'

type Role = 'SUPERADMIN' | 'OWNER' | 'ADMIN' | 'ASSISTANT' | 'PSYCHOLOGIST' | 'PATIENT'

const TARGET_BY_ROLE: Record<Role, string> = {
  SUPERADMIN: '/app/superadmin',
  OWNER: '/app/owner', // CORREGIDO: era '/app/admin'
  ADMIN: '/app/admin',
  ASSISTANT: '/app/assistant',
  PSYCHOLOGIST: '/app/psychologist',
  PATIENT: '/app/patient',
}

function normalizeRoles(roles: unknown): Role[] {
  if (!Array.isArray(roles)) return []
  return (roles as any[])
    .map(r => (typeof r === 'string' ? r : r?.role))
    .filter(Boolean) as Role[]
}

export default function AppIndexPage() {
  const router = useRouter()
  const { user, loading, error } = useCurrentUser() // CAMBIÉ isLoading por loading

  useEffect(() => {
    // Verificar sesión directamente con Supabase
    async function checkAuth() {
      const { data } = await supabase.auth.getSession()
      if (!data.session && !loading && !user) {
        router.replace('/auth/login')
      }
    }
    
    checkAuth()

    if (loading) return

    if (!user) {
      router.replace('/auth/login')
      return
    }

    // USAR ROLES DIRECTAMENTE (ya vienen como array de strings)
    const roles = normalizeRoles(user.roles)
    if (!roles.length) {
      console.warn('Usuario sin roles:', user)
      router.replace('/unauthorized')
      return
    }

    // PRIORIZAR ROLES NO-PATIENT, O USAR activeRole
    let targetRole: Role
    
    if (user.activeRole && roles.includes(user.activeRole as Role)) {
      targetRole = user.activeRole as Role
    } else {
      // Buscar el primer rol que no sea PATIENT
      targetRole = roles.find(r => r !== 'PATIENT') || roles[0]
    }
    
    console.log('Roles disponibles:', roles, 'Rol activo:', user.activeRole, 'Redirigiendo a:', targetRole)
    
    const targetPath = TARGET_BY_ROLE[targetRole] || '/app/patient'
    router.replace(targetPath)
  }, [user, loading, router])

  if (loading) {
    return (
      <Layout title="Cargando...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">Cargando...</p>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout title="Error">
        <div className="flex justify-center items-center h-64">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Redirigiendo...">
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-600">Redirigiendo a tu dashboard...</p>
      </div>
    </Layout>
  )
}