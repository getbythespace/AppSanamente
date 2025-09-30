import { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '../../../../components/Layout'
import  useCurrentUser  from '../../../../hooks/useCurrentUser'
import fetcher from '../../../../services/fetcher'

interface Patient {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  email: string
  rut: string
}

export default function SessionsList() {
  const { user, loading } = useCurrentUser()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!loading && user) {
      loadData()
    }
  }, [user, loading])

  const loadData = async () => {
    try {
      setLoadingData(true)
      const response = await fetcher<{ ok: boolean; data: Patient[] }>('/api/psychologist/listMyPatients')
      if (response.ok) setPatients(response.data)
    } catch (error) {
      console.error('Error loading patients:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const filteredPatients = patients.filter(patient =>
    `${patient.firstName} ${patient.lastNamePaternal} ${patient.lastNameMaternal} ${patient.rut}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  )

  if (loading || loadingData) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historial de Sesiones</h1>
            <p className="text-gray-600">Selecciona un paciente para ver su historial</p>
          </div>
          <Link
            href="/app/psychologist"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Volver al Panel
          </Link>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <input
            type="text"
            placeholder="Buscar paciente por nombre o RUT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Pacientes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-medium">
                      {patient.firstName?.charAt(0)}{patient.lastNamePaternal?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {patient.firstName} {patient.lastNamePaternal}
                    </h3>
                    <p className="text-sm text-gray-500">RUT: {patient.rut}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Link
                    href={`/app/psychologist/sessions/${patient.id}`}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-center block"
                  >
                    Ver Historial
                  </Link>
                  
                  <Link
                    href={`/app/psychologist/session/new/${patient.id}`}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center block"
                  >
                    Nueva Sesión
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPatients.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pacientes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? 'No se encontraron pacientes con ese criterio.' : 'No tienes pacientes asignados.'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}