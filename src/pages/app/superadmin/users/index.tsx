import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/superadmin/Layout'
import UserTable from '@/components/superadmin/UserTable'
import UserFilters from '@/components/superadmin/UserFilters'
import { useCurrentUser } from '@/hooks/useCurrentUser'

// FIXED: Tipo que coincida exactamente con UserTable
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

interface UsersResponse {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function UsersPage() {
  const { user, loading } = useCurrentUser()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    page: 1
  })
  const [loadingUsers, setLoadingUsers] = useState(true)

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page: Number(page)
    }))
  }

  // FIXED: onUserUpdate debe retornar Promise<void>
  const handleUserUpdate = async (updatedUser: User): Promise<void> => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        const queryParams = new URLSearchParams()
        
        if (filters.search) queryParams.append('search', filters.search)
        if (filters.role) queryParams.append('role', filters.role)
        if (filters.status) queryParams.append('status', filters.status)
        queryParams.append('page', filters.page.toString())
        queryParams.append('limit', '10')

        const response = await fetch(`/api/superadmin/superadmin?${queryParams.toString()}`)
        
        if (!response.ok) {
          throw new Error('Error fetching users')
        }

        const data: UsersResponse = await response.json()
        
        // FIXED: Mapear users para incluir campos requeridos y tipos correctos
        const mappedUsers: User[] = data.users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastNamePaternal: user.lastNamePaternal,
          lastNameMaternal: user.lastNameMaternal,
          status: user.status as 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED',
          roles: user.roles,
          organization: user.organization,
          createdAt: (user as any).createdAt || new Date().toISOString(),
          updatedAt: (user as any).updatedAt || new Date().toISOString()
        }))
        
        setUsers(mappedUsers)
        setPagination(data.pagination)
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoadingUsers(false)
      }
    }

    if (user) {
      fetchUsers()
    }
  }, [user, filters])

  const handlePaginationChange = (page: number) => {
    handlePageChange(page)
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-8">Cargando...</div>
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex justify-center py-8">No autorizado</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <button
            onClick={() => router.push('/app/superadmin/users/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Crear Usuario
          </button>
        </div>

        <UserFilters
          filters={filters}
          onFilterChange={setFilters}
        />

        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <div>Cargando usuarios...</div>
          </div>
        ) : (
          <UserTable
            users={users}
            pagination={pagination}
            onPageChange={handlePaginationChange}
            onUserUpdate={handleUserUpdate}
          />
        )}
      </div>
    </Layout>
  )
}