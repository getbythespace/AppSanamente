import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import useCurrentUser from '@/hooks/useCurrentUser'
import fetcher from '@/services/fetcher'
import RoleSwitcher from '@/components/roleSwitcher'
import { supabase } from '@/lib/db'

interface Patient {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  email: string
  rut: string
  createdAt: string
  isAssigned: boolean
  assignedTo?: {
    id: string
    name: string
  }
}

// Helper para POST con JSON (evitamos el error ts(2554))
async function postJSON<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let msg = `Error ${res.status}`
    try {
      const j = await res.json()
      msg = j?.error || msg
    } catch {}
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

const icons = {
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
}

// TopBar morado con switcher (misma línea visual)
function TopBar() {
  const router = useRouter()
  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } finally { router.replace('/auth/login') }
  }

  return (
    <header className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg backdrop-blur-sm">
            S
          </div>
          <div className="font-semibold text-xl">Sanamente</div>
          <div className="hidden sm:block px-3 py-1 bg-white/10 rounded-full text-sm font-medium">
            Pool de Pacientes
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RoleSwitcher />
          <Link
            href="/app/profile"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200"
          >
            {icons.user}
            Perfil
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 border border-red-700 transition-all duration-200"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}

function Card({ children, className = '', gradient = false }: { children: React.ReactNode; className?: string; gradient?: boolean }) {
  return (
    <section className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow duration-200 ${gradient ? 'bg-gradient-to-br from-white to-gray-50' : ''} ${className}`}>
      {children}
    </section>
  )
}

function StatCard({
  title,
  value,
  icon,
  color = 'blue',
}: {
  title: string
  value: number
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'orange'
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-50',
    green: 'from-green-500 to-green-600 text-green-50',
    orange: 'from-orange-500 to-orange-600 text-orange-50',
  }
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-600 mb-2">{title}</div>
          <div className="text-3xl font-bold text-gray-900">{value}</div>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export default function PoolPatients() {
  const { user, loading } = useCurrentUser()
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [stats, setStats] = useState({ total: 0, assigned: 0, unassigned: 0 })
  const [loadingData, setLoadingData] = useState(true)
  const [assigningPatient, setAssigningPatient] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!loading && user) {
      loadData()
    }
  }, [user, loading])

  type PoolPatientsResponse = {
    ok: boolean
    data: Patient[]
    stats?: { total: number; assigned: number; unassigned: number }
  }

  const loadData = async () => {
    try {
      setLoadingData(true)

      // GET con fetcher (1 solo argumento)
      const patientsResponse = await fetcher('/api/psychologist/poolPatients') as PoolPatientsResponse

      if (patientsResponse.ok && patientsResponse.data) {
        setPatients(patientsResponse.data)

        if (patientsResponse.stats) {
          setStats(patientsResponse.stats)
        } else {
          const assigned = patientsResponse.data.filter((p: Patient) => p.isAssigned).length
          const unassigned = patientsResponse.data.filter((p: Patient) => !p.isAssigned).length
          setStats({ total: patientsResponse.data.length, assigned, unassigned })
        }
      }
    } catch (error) {
      console.error('Error loading pool data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  type SimpleMsg = { ok: boolean; message: string }

  const handleAssignToMe = async (patientId: string) => {
    if (!user?.id) return

    try {
      setAssigningPatient(patientId)

      // POST usando helper para evitar ts(2554)
      const response = await postJSON<SimpleMsg>('/api/psychologist/assignPatient', {
        patientId,
        psychologistId: user.id,
      })

      if (response.ok) {
        await loadData()
        alert('Paciente asignado exitosamente')
      }
    } catch (error) {
      console.error('Error assigning patient:', error)
      alert('Error al asignar paciente')
    } finally {
      setAssigningPatient(null)
    }
  }

  const handleUnassignPatient = async (patientId: string) => {
    if (!confirm('¿Estás seguro de que quieres desasignar este paciente?')) {
      return
    }

    try {
      setAssigningPatient(patientId)

      // POST usando helper para evitar ts(2554)
      const response = await postJSON<SimpleMsg>('/api/psychologist/unassignPatient', {
        patientId,
      })

      if (response.ok) {
        await loadData()
        alert('Paciente desasignado exitosamente')
      }
    } catch (error) {
      console.error('Error unassigning patient:', error)
      alert('Error al desasignar paciente')
    } finally {
      setAssigningPatient(null)
    }
  }

  const filteredPatients = patients.filter((patient: Patient) =>
    `${patient.firstName} ${patient.lastNamePaternal} ${patient.lastNameMaternal} ${patient.email} ${patient.rut}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  )

  const isMyPatient = (patient: Patient): boolean => {
    if (!patient.assignedTo || !user?.id) return false
    return patient.assignedTo.id === user.id
  }

  const isAssistant = (): boolean => {
    return user?.roles?.some((role: any) => role.role === 'ASSISTANT') || false
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <TopBar />
        <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-6"></div>
            <p className="text-gray-600 text-lg">Cargando pool de pacientes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <TopBar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Card className="p-8" gradient>
            <div className="flex items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  Pool de Pacientes
                </h1>
                <p className="text-gray-600">
                  {isAssistant()
                    ? 'Gestiona las asignaciones de pacientes'
                    : 'Gestiona tus asignaciones de pacientes'}
                </p>
              </div>
              <Link
                href="/app/psychologist"
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                ← Volver al Panel
              </Link>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icons.search}
            </div>
            <input
              type="text"
              placeholder="Buscar paciente por nombre, RUT o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Sin asignar" value={stats.unassigned} icon={icons.users} color="orange" />
          <StatCard title="Asignados" value={stats.assigned} icon={icons.check} color="green" />
          <StatCard title="Total" value={stats.total} icon={icons.user} color="blue" />
        </div>

        {/* Tabla */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Gestión de Asignaciones</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado a</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient: Patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {patient.firstName || 'Sin nombre'} {patient.lastNamePaternal || ''} {patient.lastNameMaternal || ''}
                          </div>
                          <div className="text-xs text-gray-500">{patient.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.rut || 'Sin RUT'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {patient.isAssigned ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Asignado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Sin asignar
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.assignedTo ? patient.assignedTo.name : 'Sin asignar'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {patient.isAssigned ? (
                          (isMyPatient(patient) || isAssistant()) ? (
                            <button
                              onClick={() => handleUnassignPatient(patient.id)}
                              disabled={assigningPatient === patient.id}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {assigningPatient === patient.id ? 'Procesando...' : 'Desasignar'}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">No disponible</span>
                          )
                        ) : (
                          <button
                            onClick={() => handleAssignToMe(patient.id)}
                            disabled={assigningPatient === patient.id}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1 rounded text-sm hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                          >
                            {assigningPatient === patient.id ? 'Procesando...' : 'Asignarme'}
                          </button>
                        )}
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
                        {searchQuery ? 'No se encontraron pacientes con ese criterio.' : 'No se encontraron pacientes en esta organización.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
