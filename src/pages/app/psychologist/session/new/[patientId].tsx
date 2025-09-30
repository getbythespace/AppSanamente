// src/pages/app/psychologist/session/[sid].tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { format, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'

type Patient = {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal?: string | null
  rut?: string | null
}

type SessionNote = {
  id: string
  patientId: string
  note: string
  date: string
  editableUntil: string | null
}

export default function EditSessionBySidPage() {
  const router = useRouter()
  const rawSid = router.query?.sid
  const sid = Array.isArray(rawSid) ? rawSid[0] : rawSid

  const [patient, setPatient] = useState<Patient | null>(null)
  const [session, setSession] = useState<SessionNote | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>('')

  const canEdit = useMemo(() => {
    if (!session?.editableUntil) return true
    return new Date() <= new Date(session.editableUntil)
  }, [session?.editableUntil])

  // contador simple (actualiza cada minuto)
  useEffect(() => {
    if (!session?.editableUntil) return
    const tick = () => {
      const now = new Date()
      const limit = new Date(session.editableUntil as string)
      if (isAfter(now, limit)) { setTimeLeft('Tiempo agotado'); return }
      const diff = +limit - +now
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setTimeLeft(`${h}h ${m}m restantes`)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [session?.editableUntil])

  useEffect(() => {
    if (!sid) return
    ;(async () => {
      try {
        setLoading(true); setError(null)
        // Cargar sesión por SID
        const r = await fetch(`/api/psychologist/session/${sid}`)
        const j = await r.json().catch(() => ({}))
        if (!r.ok || j?.ok === false) throw new Error(j?.error || 'No se pudo cargar la sesión')

        const s = (j.session ?? j.data ?? j) as SessionNote
        setSession(s)
        setNote(s?.note || '')

        // Intentar traer paciente (si el endpoint ya lo retorna, úsalo)
        const p = (j.patient ?? j.meta?.patient) as Patient | undefined
        if (p) {
          setPatient(p)
        } else if (s?.patientId) {
          const rp = await fetch(`/api/psychologist/getMyPatientById?id=${s.patientId}`)
          const jp = await rp.json().catch(() => ({}))
          if (rp.ok && jp?.ok) setPatient(jp.data.patient as Patient)
        }
      } catch (e: any) {
        setError(e?.message || 'Error cargando sesión')
      } finally {
        setLoading(false)
      }
    })()
  }, [sid])

  async function handleSave() {
    if (!sid) return
    if (!note.trim()) return
    try {
      setSaving(true); setError(null)
      const r = await fetch(`/api/psychologist/session/${sid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok === false) {
        const code = j?.error ?? 'Error al guardar sesión'
        throw new Error(code === 'EDIT_WINDOW_CLOSED' ? 'El tiempo de edición expiró.' : code)
      }
      const s = (j.session ?? j.data ?? j) as SessionNote
      setSession(s)
      // Volver al historial del paciente
      const pid = s?.patientId || patient?.id
      if (pid) router.replace(`/app/psychologist/sessions/${pid}`)
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Editar sesión">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
        </div>
      </Layout>
    )
  }

  if (!session) {
    return (
      <Layout title="Editar sesión">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Sesión no encontrada.
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`Editar Sesión · ${patient ? `${patient.firstName} ${patient.lastNamePaternal}` : ''}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/app/psychologist/sessions/${session.patientId}`}
              className="text-purple-600 hover:text-purple-800 text-sm"
            >
              ← Volver al historial
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">Editar Sesión</h1>
            <p className="text-slate-600">
              {patient ? `${patient.firstName} ${patient.lastNamePaternal} ${patient.lastNameMaternal ?? ''}` : 'Paciente'} ·{' '}
              {session?.date ? format(new Date(session.date), 'dd/MM/yyyy HH:mm', { locale: es }) : '—'}
            </p>
          </div>

          <div className="text-right">
            {session?.editableUntil && (
              <div className={`text-sm ${canEdit ? 'text-orange-600' : 'text-red-600'}`}>
                {timeLeft || (canEdit ? 'Editable temporalmente' : 'Tiempo agotado')}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {!canEdit && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
            ⚠️ El tiempo de edición ha expirado. Esta sesión ya no puede ser modificada.
          </div>
        )}

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-900">Notas de la Sesión</h2>
              {canEdit && session?.editableUntil && (
                <span className="text-sm text-gray-500">
                  Editable hasta {format(new Date(session.editableUntil), 'dd/MM/yyyy HH:mm', { locale: es })}
                </span>
              )}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describa lo ocurrido en la sesión, temas tratados, observaciones, conclusiones..."
              disabled={!canEdit}
              className={`w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="flex justify-between">
            <Link
              href={`/app/psychologist/sessions/${session.patientId}`}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Ver Historial
            </Link>

            {canEdit && (
              <button
                onClick={handleSave}
                disabled={!note.trim() || saving}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Actualizar Sesión'}
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-purple-50 border border-purple-200 text-purple-800 px-4 py-3 rounded text-sm">
          <h3 className="font-semibold mb-1">ℹ️ Recuerda:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Las notas de sesión quedan bloqueadas después de 24 horas desde su creación.</li>
            <li>Solo puedes tener una sesión por día por paciente.</li>
            <li>Todas las modificaciones quedan registradas para auditoría.</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
