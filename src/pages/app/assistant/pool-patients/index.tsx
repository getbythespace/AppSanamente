import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import withPageRole from '@/utils/withPageRole'
import useCurrentUser from '@/hooks/useCurrentUser'
import RoleSwitcher from '@/components/roleSwitcher'
import { supabase } from '@/lib/db'

type Patient = {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  email: string
  rut: string
  createdAt: string
  isAssigned: boolean
  assignedTo?: { id: string; name: string } | null
}

type Psychologist = { id: string; name: string; email: string }

const icons = {
  users: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>)
}

function TopBar() {
  const router = useRouter()
  const handleSignOut = async () => { try { await supabase.auth.signOut() } finally { router.replace('/auth/login') } }
  return (
    <header className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg backdrop-blur-sm">S</div>
          <div className="font-semibold text-xl">Sanamente</div>
          <div className="hidden sm:block px-3 py-1 bg-white/10 rounded-full text-sm font-medium">Pool de Pacientes (Asistente)</div>
        </div>
        <div className="flex items-center gap-3">
          <RoleSwitcher />
          <Link href="/app/assistant" className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200">Volver</Link>
          <button onClick={handleSignOut} className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 border border-red-700 transition-all duration-200">Cerrar sesión</button>
        </div>
      </div>
    </header>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>{children}</section>
}

export default withPageRole(function AssistantPoolPatients() {
  const { user, loading } = useCurrentUser()

  const [patients, setPatients] = useState<Patient[]>([])
  const [psychologists, setPsychologists] = useState<Psychologist[]>([])
  const [selectedPsychId, setSelectedPsychId] = useState<string>('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // helper seguro para parsear JSON
  const safeJson = async (r: Response) => {
    const ct = r.headers.get('content-type') || ''
    if (ct.includes('application/json')) return r.json()
    const text = await r.text()
    throw new Error(`HTTP ${r.status} — ${text.slice(0, 120)}`)
  }

  const loadAll = async () => {
    try {
      setPageLoading(true); setError(null)
      const [r1, r2] = await Promise.all([
        fetch('/api/assistant/poolPatients', { credentials: 'include' }),
        fetch('/api/assistant/psychologists', { credentials: 'include' }),
      ])
      const [j1, j2] = await Promise.all([safeJson(r1), safeJson(r2)])
      if (!r1.ok || !j1.ok) throw new Error(j1.error || `Error ${r1.status}`)
      setPatients(j1.data as Patient[])
      if (r2.ok && j2.ok) {
        setPsychologists(j2.data as Psychologist[])
        if (j2.data.length === 1) setSelectedPsychId(j2.data[0].id)
      } else {
        setPsychologists([])
      }
    } catch (e: any) {
      setError(e.message || 'Error cargando datos')
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => { if (!loading && user) loadAll() }, [loading, user])

  const stats = useMemo(() => {
    const total = patients.length
    const assigned = patients.filter(p => p.isAssigned).length
    return { total, assigned, unassigned: total - assigned }
  }, [patients])

  const filtered = useMemo(() => {
    return patients.filter(p =>
      `${p.firstName} ${p.lastNamePaternal} ${p.lastNameMaternal} ${p.email} ${p.rut}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
  }, [patients, searchTerm])

  const handleAssign = async (p: Patient) => {
    if (!selectedPsychId) return alert('Selecciona un psicólogo')
    try {
      setBusyId(p.id)
      const r = await fetch('/api/assistant/assignPatient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ patientId: p.id, psychologistId: selectedPsychId })
      })
      const j = await safeJson(r)
      if (!r.ok || !j.ok) throw new Error(j.error || `Error ${r.status}`)
      await loadAll()
    } catch (e: any) {
      alert(e.message || 'Error asignando paciente')
    } finally {
      setBusyId(null)
    }
  }

  const handleUnassign = async (p: Patient) => {
    if (!confirm('¿Desasignar este paciente?')) return
    try {
      setBusyId(p.id)
      const r = await fetch('/api/assistant/unassignPatient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ patientId: p.id })
      })
      const j = await safeJson(r)
      if (!r.ok || !j.ok) throw new Error(j.error || `Error ${r.status}`)
      await loadAll()
    } catch (e: any) {
      alert(e.message || 'Error al desasignar')
    } finally {
      setBusyId(null)
    }
  }

  if (loading || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <TopBar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-600 border-t-transparent mx-auto mb-6"></div>
            <p className="text-gray-600 text-lg">Cargando pool de pacientes...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <TopBar />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-red-800 font-semibold text-lg mb-3">Error</h3>
              <p className="text-red-700 text-sm mb-6">{error}</p>
              <button onClick={loadAll} className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">
                Reintentar
              </button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <TopBar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-6">
              <div>
                <div className="text-teal-700 font-semibold mb-1">Pool de Pacientes</div>
                <h1 className="text-2xl font-bold text-gray-900">Vista del Asistente</h1>
                <p className="text-gray-600 mt-1">Asigna pacientes a psicólogos de tu organización o desasigna cuando corresponda.</p>
              </div>
              <div className="w-full sm:w-80">
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a psicólogo</label>
                <select
                  value={selectedPsychId}
                  onChange={e => setSelectedPsychId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">{psychologists.length > 1 ? 'Selecciona un psicólogo' : 'Único psicólogo disponible'}</option>
                  {psychologists.map(p => <option key={p.id} value={p.id}>{p.name} — {p.email}</option>)}
                </select>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <input
                type="text"
                placeholder="Buscar paciente por nombre, RUT o email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>Sin asignar: <b className="text-teal-700">{stats.unassigned}</b></div>
              <div>Asignados: <b className="text-green-700">{stats.assigned}</b></div>
              <div>Total: <b className="text-gray-900">{stats.total}</b></div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Gestión de Asignaciones</h2>
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
                {filtered.length > 0 ? filtered.map((p) => {
                  const assigned = p.isAssigned
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {p.firstName} {p.lastNamePaternal} {p.lastNameMaternal}
                        </div>
                        <div className="text-xs text-gray-500">{p.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.rut}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assigned
                          ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Asignado</span>
                          : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Sin asignar</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {p.assignedTo ? p.assignedTo.name : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {assigned ? (
                          <button
                            onClick={() => handleUnassign(p)}
                            disabled={busyId === p.id}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Desasignar
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssign(p)}
                            disabled={!selectedPsychId || busyId === p.id}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded text-sm bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 disabled:opacity-50"
                          >
                            Asignar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No hay pacientes que coincidan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}, ['ASSISTANT'])
