// src/pages/app/assistant/index.tsx
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import withPageRole from '@/utils/withPageRole'
import useCurrentUser from '@/hooks/useCurrentUser'
import RoleSwitcher from '@/components/roleSwitcher'
import { supabase } from '@/lib/db'
import { useRouter } from 'next/router'

type PendingInvite = {
  id: string
  email: string
  name: string
  rut: string
  createdAt: string
}

const icons = {
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-3h4m-4 0a2 2 0 00-2 2v1h8V6a2 2 0 00-2-2m-4 0h4" />
    </svg>
  )
}

function TopBar() {
  const router = useRouter()
  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } finally { router.replace('/auth/login') }
  }

  return (
    <header className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg backdrop-blur-sm">S</div>
          <div className="font-semibold text-xl">Sanamente</div>
          <div className="hidden sm:block px-3 py-1 bg-white/10 rounded-full text-sm font-medium">Panel Asistente</div>
        </div>
        <div className="flex items-center gap-3">
          <RoleSwitcher />
          <Link href="/app/profile" className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200">
            {icons.user} Perfil
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

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border bg-white shadow-sm ${className}`}>{children}</section>
}

export default withPageRole(function AssistantDashboard() {
  const { loading } = useCurrentUser()
  const [pending, setPending] = useState<PendingInvite[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadPending() {
    try {
      setError(null)
      const res = await fetch('/api/assistant/invitations/list')
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || `Error ${res.status}`)
      setPending(json.data)
    } catch (e: any) {
      setError(e.message || 'Error cargando invitaciones')
    }
  }

  useEffect(() => {
    if (!loading) loadPending()
  }, [loading])

  async function revoke(userId: string) {
    try {
      setBusyId(userId)
      setError(null)
      const res = await fetch('/api/assistant/invitations/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || `Error ${res.status}`)
      await loadPending()
    } catch (e: any) {
      setError(e.message || 'No se pudo revocar')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <TopBar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Asistente</h1>
                <p className="text-gray-600">Invita pacientes y gestiona pendientes</p>
              </div>
              <Link
                href="/app/assistant/invite"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-sm"
              >
                {icons.plus}
                Nueva invitación
              </Link>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pacientes pendientes de activación</h2>
            {error && <span className="text-sm text-red-600">⚠️ {error}</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RUT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No hay pendientes.</td>
                  </tr>
                ) : pending.map(p => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.rut}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(p.createdAt).toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => revoke(p.id)}
                        disabled={busyId === p.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {icons.trash} {busyId === p.id ? 'Revocando...' : 'Revocar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  )
}, ['ASSISTANT'])
