import { useState } from 'react'
import { useRouter } from 'next/router'
import useCurrentUser from '../hooks/useCurrentUser'

export default function MobileRoleSwitcher() {
  const router = useRouter()
  const { user, loading, refetch } = useCurrentUser()
  const [switching, setSwitching] = useState(false)
  const [showModal, setShowModal] = useState(false)

  if (loading || !user || user.roles.length <= 1) {
    return null
  }

  const handleRoleSwitch = async (targetRole: string) => {
    setSwitching(true)
    setShowModal(false)
    
    try {
      const response = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole })
      })

      if (response.ok) {
        await refetch()
        const redirectPath = getRoleRedirectPath(targetRole)
        router.push(redirectPath)
      } else {
        alert('Error cambiando de rol')
      }
    } catch (error) {
      alert('Error de conexión')
    } finally {
      setSwitching(false)
    }
  }

  return (
    <>
      {/* Botón Flotante */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white 
                   rounded-full p-3 shadow-lg transition-colors z-40 lg:hidden"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 lg:hidden">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Cambiar Rol</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {user.roles.map((role: any) => {
                const roleData = getRoleData(role.role)
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSwitch(role.role)}
                    disabled={switching}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 
                             transition-colors disabled:opacity-50"
                  >
                    <span className="text-2xl">{roleData.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{roleData.name}</div>
                      <div className="text-sm text-gray-500">{roleData.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {switching && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent"></div>
                <span className="ml-2 text-gray-600">Cambiando...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function getRoleData(role: string) {
  const roleMap = {
    'OWNER': { name: 'Propietario', icon: '👑', description: 'Acceso total' },
    'ADMIN': { name: 'Administrador', icon: '⚙️', description: 'Gestión de usuarios' },
    'PSYCHOLOGIST': { name: 'Psicólogo', icon: '🧠', description: 'Atención de pacientes' },
    'ASSISTANT': { name: 'Asistente', icon: '📋', description: 'Apoyo administrativo' },
    'PATIENT': { name: 'Paciente', icon: '👤', description: 'Mi información' }
  }
  return roleMap[role as keyof typeof roleMap] || { name: role, icon: '👤', description: '' }
}

function getRoleRedirectPath(role: string): string {
  const rolePaths = {
    'OWNER': '/app/owner',
    'ADMIN': '/app/admin',
    'PSYCHOLOGIST': '/app/psychologist',
    'ASSISTANT': '/app/assistant',
    'PATIENT': '/app/patient'
  }
  return rolePaths[role as keyof typeof rolePaths] || '/dashboard'
}