import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/superadmin/Layout'
import UserEditModal from '@/components/superadmin/UserEditModal'
import UserLogsModal from '@/components/superadmin/UserLogsModal'
import UserStatusBadge from '@/components/superadmin/UserStatusBadge'
import ImpersonateButton from '@/components/superadmin/ImpersonateButton'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface User {
  id: string
  email: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED'
  roles: Array<{ role: string }>
  organization?: {
    id: string
    name: string
  }
  _count: {
    assignmentsAsPatient: number
    assignmentsAsPsychologist: number
    moodEntries: number
    sessionNotesAsPatient: number
    sessionNotesAsPsychologist: number
  }
}

export default function UserDetailPage() {
  const { user: currentUser, loading } = useCurrentUser()
  const router = useRouter()
  const { id } = router.query
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [logsModalOpen, setLogsModalOpen] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return

      try {
        const response = await fetch(`/api/superadmin/users/${id}`)
        
        if (!response.ok) {
          throw new Error('Error fetching user')
        }

        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        console.error('Error fetching user:', error)
        router.push('/app/superadmin/users')
      } finally {
        setLoadingUser(false)
      }
    }

    if (currentUser && id) {
      fetchUser()
    }
  }, [currentUser, id, router])

  const handleDeleteUser = async () => {
    if (!user || !confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      return
    }

    try {
      const response = await fetch(`/api/superadmin/users/${user.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error deleting user')
      }

      router.push('/app/superadmin/users')
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  // FIXED: onSave debe retornar Promise<void>
  const handleUserSave = async (updatedUser: User): Promise<void> => {
    setUser(updatedUser)
    setEditModalOpen(false)
  }

  if (loading || loadingUser) {
    return (
      <Layout>
        <div className="flex justify-center py-8">
          <div>Cargando...</div>
        </div>
      </Layout>
    )
  }

  if (!currentUser || !user) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p>Usuario no encontrado</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {user.firstName} {user.lastNamePaternal}
          </h1>
          <div className="flex space-x-3">
            <ImpersonateButton 
              userId={user.id}
              userName={`${user.firstName} ${user.lastNamePaternal}`}
            />
            <button
              onClick={() => setEditModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Editar
            </button>
            <button
              onClick={() => setLogsModalOpen(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Ver Logs
            </button>
            <button
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md"
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Información del Usuario</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-sm text-gray-900">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Estado</label>
                <div className="mt-1">
                  <UserStatusBadge status={user.status} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Roles</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.roles.map((role, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {role.role}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Organización</label>
                <p className="mt-1 text-sm text-gray-900">
                  {user.organization?.name || 'Sin organización'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Asignaciones como Paciente</label>
                <p className="mt-1 text-sm text-gray-900">{user._count.assignmentsAsPatient}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Asignaciones como Psicólogo</label>
                <p className="mt-1 text-sm text-gray-900">{user._count.assignmentsAsPsychologist}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Entradas de Ánimo</label>
                <p className="mt-1 text-sm text-gray-900">{user._count.moodEntries}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Notas de Sesión</label>
                <p className="mt-1 text-sm text-gray-900">
                  {user._count.sessionNotesAsPatient + user._count.sessionNotesAsPsychologist}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FIXED: onSave con Promise<void> */}
        {editModalOpen && (
          <UserEditModal
            user={user}
            open={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSave={handleUserSave}
          />
        )}

        {logsModalOpen && (
          <UserLogsModal
            userId={user.id}
            userName={`${user.firstName} ${user.lastNamePaternal}`}
            open={logsModalOpen}
            onClose={() => setLogsModalOpen(false)}
          />
        )}
      </div>
    </Layout>
  )
}