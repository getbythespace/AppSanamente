import { useState } from 'react'
import UserStatusBadge from './UserStatusBadge'

interface User {
  id: string
  email: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED'
  roles: Array<{ role: string }>
  organization?: {
    name: string
  }
  createdAt: string
  updatedAt: string
}

interface UserTableProps {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  onPageChange: (page: number) => void
  onUserUpdate: (user: User) => Promise<void>  // FIXED: Debe retornar Promise<void>
}

export default function UserTable({ users, pagination, onPageChange, onUserUpdate }: UserTableProps) {
  const [changingStatus, setChangingStatus] = useState<string | null>(null)

  const handleStatusChange = async (userId: string, newStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED') => {
    setChangingStatus(userId)
    try {
      const response = await fetch('/api/superadmin/changeUserStatus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          status: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Error changing status')
      }

      const data = await response.json()
      // FIXED: Await the Promise
      await onUserUpdate(data.user)
    } catch (error) {
      console.error('Error changing user status:', error)
      alert('Error al cambiar el estado del usuario')
    } finally {
      setChangingStatus(null)
    }
  }

  const renderPagination = () => {
    const pages = []
    const maxPages = Math.min(pagination.totalPages, 5)
    const startPage = Math.max(1, pagination.page - 2)
    const endPage = Math.min(pagination.totalPages, startPage + maxPages - 1)

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-2 text-sm ${
            i === pagination.page
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          } border border-gray-300`}
        >
          {i}
        </button>
      )
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-700">
          Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
          {pagination.total} resultados
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          {pages}
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-2 text-sm bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organización
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastNamePaternal}
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {user.id.slice(0, 8)}...
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {role.role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <UserStatusBadge status={user.status} />
                    <select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.id, e.target.value as any)}
                      disabled={changingStatus === user.id}
                      className="text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                      <option value="PENDING">Pendiente</option>
                      <option value="SUSPENDED">Suspendido</option>
                      <option value="DELETED">Eliminado</option>
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.organization?.name || 'Sin organización'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.location.href = `/app/superadmin/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Ver
                    </button>
                    <button
                      onClick={() => {/* TODO: Edit modal */}}
                      className="text-green-600 hover:text-green-900"
                    >
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  )
}