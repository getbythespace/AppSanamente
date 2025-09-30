import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import RequireRole from '@/components/RequireRole'
import { getJson } from '@/services'

interface Organization {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  _count: {
    users: number
  }
  owner?: {
    firstName: string
    lastNamePaternal: string
    email: string
  }
}

export default function SuperAdminDashboard() {
  return (
    <RequireRole allowedRoles={['SUPERADMIN']}>
      <Layout>
        <SuperAdminContent />
      </Layout>
    </RequireRole>
  )
}

function SuperAdminContent() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      setLoading(true)
      const response = await getJson('/api/superadmin/organizations')
      
      if (response.ok) {
        setOrganizations(response.data)
      } else {
        setError(response.error || 'Error cargando organizaciones')
      }
    } catch (error: any) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrganizations = organizations.filter(org => {
    const matchesFilter = filter === 'ALL' || org.status === filter
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.owner?.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'INACTIVE': return 'bg-gray-100 text-gray-800'
      case 'SUSPENDED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '✅'
      case 'INACTIVE': return '⏸️'
      case 'SUSPENDED': return '❌'
      default: return '❓'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              🔧 Super Admin Dashboard
            </h1>
            <p className="text-red-100 mt-2">
              Control total del sistema - Gestión de organizaciones y auditoría
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{organizations.length}</div>
            <div className="text-red-100 text-sm">Organizaciones</div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Búsqueda */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar organizaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            {(['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'ALL' ? 'Todas' : status}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={loadOrganizations}
            disabled={loading}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Lista de Organizaciones */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrganizations.map((org) => (
            <div
              key={org.id}
              onClick={() => router.push(`/app/superadmin/organizations/${org.id}`)}
              className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md hover:border-red-200 transition-all cursor-pointer group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                    {org.name}
                  </h3>
                  <p className="text-sm text-gray-500">@{org.slug}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(org.status)}`}>
                  {getStatusIcon(org.status)} {org.status}
                </span>
              </div>

              {/* Owner Info */}
              {org.owner && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Propietario</div>
                  <div className="font-medium text-gray-900">
                    {org.owner.firstName} {org.owner.lastNamePaternal}
                  </div>
                  <div className="text-sm text-gray-600">{org.owner.email}</div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  {org._count.users} usuarios
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(org.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">Ver detalles</span>
                <svg className="h-5 w-5 text-gray-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredOrganizations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No se encontraron organizaciones
          </h3>
          <p className="text-gray-600">
            {searchTerm || filter !== 'ALL' 
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'No hay organizaciones registradas en el sistema'
            }
          </p>
        </div>
      )}
    </div>
  )
}