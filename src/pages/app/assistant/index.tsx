import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import withPageRole from '@/utils/withPageRole'
import useCurrentUser from '@/hooks/useCurrentUser'
import { postJson } from '@/services'
import RoleSwitcher from '@/components/roleSwitcher'
import { supabase } from '@/lib/db'
import { useRouter } from 'next/router'

type Psychologist = { id: string; firstName: string; lastNamePaternal: string; email: string }

const icons = {
  user: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  send: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function TopBar() {
  const router = useRouter()
  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } finally { router.replace('/auth/login') }
  }

  return (
    <header className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg backdrop-blur-sm">S</div>
          <div className="font-semibold text-xl">Sanamente</div>
          <div className="hidden sm:block px-3 py-1 bg-white/10 rounded-full text-sm font-medium">Asistente</div>
        </div>
        <div className="flex items-center gap-3">
          <RoleSwitcher />
          <Link
            href="/app/assistant/pool-patients"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200"
          >
            {icons.users}
            <span>Pool de Pacientes</span>
          </Link>
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

type InviteForm = {
  email: string
  rut: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  dob?: string
}

function AssistantPage() {
  useCurrentUser()

  const [form, setForm] = useState<InviteForm>({
    email: '',
    rut: '',
    firstName: '',
    lastNamePaternal: '',
    lastNameMaternal: '',
    dob: ''
  })

  const [psychologists, setPsychologists] = useState<Psychologist[]>([])
  const [selectedPsychId, setSelectedPsychId] = useState<string>('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

useEffect(() => {
  (async () => {
    try {
      const r = await fetch('/api/assistant/psychologists', { credentials: 'include' })
      const ct = r.headers.get('content-type') || ''
      const j = ct.includes('application/json') ? await r.json() : { ok: false }
      if (r.ok && j?.ok) {
        const list: Psychologist[] = j.data || []
        setPsychologists(list)
        if (list.length === 1) setSelectedPsychId(list[0].id)
      } else {
        setPsychologists([])
      }
    } catch {
      setPsychologists([])
    }
  })()
}, [])

  const requirePsych =
    psychologists.length > 1 && !selectedPsychId

  const canSubmit = useMemo(() => {
    const hasBasics = !!form.email && !!form.rut && !!form.firstName && !!form.lastNamePaternal
    return hasBasics && (!requirePsych)
  }, [form, requirePsych])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || busy) return
    try {
      setBusy(true)
      setOkMsg(null)
      setError(null)

      const payload: any = {
        email: form.email.trim(),
        rut: form.rut.trim(),
        firstName: form.firstName.trim(),
        lastNamePaternal: form.lastNamePaternal.trim(),
        lastNameMaternal: form.lastNameMaternal?.trim() || '',
        dob: form.dob || undefined
      }
      // Si hay varios psicólogos, enviamos el seleccionado
      if (selectedPsychId) payload.targetPsychologistId = selectedPsychId

      const resp = await postJson('/api/assistant/invitePatient', payload)
      if (!resp.ok) throw new Error(resp.error || 'No se pudo enviar la invitación')

      setOkMsg('Invitación enviada. La persona confirmará su cuenta y luego aparecerá en el Pool de Pacientes.')
      setForm({ email: '', rut: '', firstName: '', lastNamePaternal: '', lastNameMaternal: '', dob: '' })
    } catch (err: any) {
      setError(err?.message || 'Error enviando invitación')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <TopBar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Card className="p-8" gradient>
            <div>
              <div className="flex items-center gap-2 text-teal-700 mb-2">
                {icons.users}
                <span className="font-semibold">Invitar Paciente</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Panel Asistente</h1>
              <p className="text-gray-600 mt-2">Envía invitaciones a pacientes para que creen su cuenta y confirmen su contraseña.</p>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200">{error}</div>}
          {okMsg && <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 text-green-700 border border-green-200">{okMsg}</div>}

          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Nombre" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido paterno</label>
              <input value={form.lastNamePaternal} onChange={e => setForm(f => ({ ...f, lastNamePaternal: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Apellido paterno" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido materno</label>
              <input value={form.lastNameMaternal} onChange={e => setForm(f => ({ ...f, lastNameMaternal: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Apellido materno (opcional)" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
              <input value={form.rut} onChange={e => setForm(f => ({ ...f, rut: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="12.345.678-9" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="correo@dominio.cl" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
              <input type="date" value={form.dob || ''} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
            </div>

            {/* Nuevo: selector de psicólogo cuando hay más de 1 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a psicólogo</label>
              <select
                value={selectedPsychId}
                onChange={(e) => setSelectedPsychId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {psychologists.length <= 1 ? (
                  <option value={selectedPsychId || ''}>
                    {psychologists.length === 1
                      ? `${psychologists[0].firstName} ${psychologists[0].lastNamePaternal} — ${psychologists[0].email}`
                      : 'No hay psicólogos disponibles'}
                  </option>
                ) : (
                  <>
                    <option value="">Selecciona un psicólogo…</option>
                    {psychologists.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastNamePaternal} — {p.email}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {requirePsych && (
                <p className="mt-1 text-xs text-rose-600">
                  Tu organización tiene múltiples psicólogos. Debes seleccionar uno.
                </p>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={!canSubmit || busy}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {icons.send}
                {busy ? 'Enviando...' : 'Enviar invitación'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default withPageRole(AssistantPage, ['ASSISTANT'])
