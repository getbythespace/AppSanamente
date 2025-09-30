import { useState, useEffect } from 'react'
import Layout from '@/components/superadmin/Layout'
import StatsCards from '@/components/superadmin/StatsCards'  // Changed from StatsCard to StatsCards
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface DashboardStats {
  totalUsers: number
  totalOrganizations: number
  activeUsers: number
  inactiveUsers: number
}

export default function SuperAdminDashboard() {
  const { user, loading } = useCurrentUser()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrganizations: 0,
    activeUsers: 0,
    inactiveUsers: 0
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/superadmin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (user) {
      fetchStats()
    }
  }, [user])

  if (loading) {
    return <div className="flex justify-center py-8">Cargando...</div>
  }

  if (!user) {
    return <div className="flex justify-center py-8">No autorizado</div>
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard SuperAdmin</h1>
        
        {loadingStats ? (
          <div className="flex justify-center py-8">Cargando estadísticas...</div>
        ) : (
          <StatsCards stats={stats} />
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Usuarios Recientes</h2>
            <p className="text-gray-500">Funcionalidad próximamente...</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Organizaciones Activas</h2>
            <p className="text-gray-500">Funcionalidad próximamente...</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}