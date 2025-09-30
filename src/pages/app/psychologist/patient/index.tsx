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
  createdAt: string
}

export default function MyPatients() {
  const { user, loading } = useCurrentUser()
  const [patients, setPatients] = useState<Patient[]>([])
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!loading && user) {
      loadData()
    }
  }, [user, loading])

  useEffect(() => {
    // Filtrar pacientes basado en la búsqueda
    const filtered = patients.filter(patient =>
      `${patient.firstName} ${patient.lastNamePaternal} ${patient.lastNameMaternal} ${patient.email} ${patient.rut}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
    setFilteredPatients(filtered)
  }, [patients, searchQuery])

  const loadData = async () => {
    try {
      setLoadingData(true)
      
      // USAR LA MISMA API que ya filtra por psicólogo
      const response = (await fetcher('/api/psychologist/listMyPatients')) as { ok: boolean; data: Patient[] }
      
      console.log('🔄 Respuesta de mis pacientes:', response)
      
      if (response.ok) {
        setPatients(response.data)
        console.log('✅ Pacientes cargados:', response.data.length)
      } else {
        console.error('❌ Error en respuesta:', response)
      }
      
    } catch (error) {
      console.error('💥 Error loading patients:', error)
    } finally {
      setLoadingData(false)
    }
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Mis Pacientes</h1>
            <p className="text-gray-600">Lista completa de tus pacientes asignados</p>
          </div>
          <Link
            href="/app/psychologist"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Volver al Panel
          </Link>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.239" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pacientes</p>
              <p className="text-2xl font-bold text-gray-900">{patients.length}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <input
            type="text"
            placeholder="Buscar por nombre, RUT o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Patients List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Lista de Pacientes</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RUT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Asignación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {patient.firstName?.charAt(0) || ''}{patient.lastNamePaternal?.charAt(0) || ''}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.firstName} {patient.lastNamePaternal} {patient.lastNameMaternal}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.rut || 'Sin RUT'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(patient.createdAt).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {/* SOLO ACCIONES PARA MIS PACIENTES */}
                        <Link
                          href={`/app/psychologist/patient/${patient.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver Perfil
                        </Link>
                        <Link
                          href={`/app/psychologist/clinical-sheet/${patient.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Hoja Clínica
                        </Link>
                        <Link
                          href={`/app/psychologist/session/new/${patient.id}`}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Nueva Sesión
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-2.239" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pacientes</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchQuery ? 'No se encontraron pacientes con ese criterio.' : 'No tienes pacientes asignados.'}
                      </p>
                      {!searchQuery && (
                        <div className="mt-4">
                          <Link
                            href="/app/psychologist/pool-patients"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Ir al Pool de Pacientes
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}