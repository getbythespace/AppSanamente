import React, { useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { clearSession } from '@/utils/clearSession'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { from } = router.query
  
  // Si llegamos aquí desde un cambio de rol incorrecto, limpiar sesión
  useEffect(() => {
    if (from === 'role-switch') {
      console.warn('Acceso denegado después de cambio de rol, limpiando sesión...')
      clearSession()
    }
  }, [from])
  
  return (
    <Layout title="Acceso denegado" bare>
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Acceso denegado</h1>
        <p className="mb-6">No tienes permisos para ver esta página.</p>
        <div className="flex gap-4">
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Volver
          </button>
          <button 
            onClick={async () => {
              await clearSession()
              router.replace('/auth/login')
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Ir a login
          </button>
        </div>
      </div>
    </Layout>
  )
}