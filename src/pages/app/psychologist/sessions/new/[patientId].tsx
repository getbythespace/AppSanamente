// src/pages/app/psychologist/session/new/[patientId].tsx
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { format, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'

type Patient = {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal?: string
  rut?: string
}

type SessionNote = {
  id: string
  note: string
  date: string
  editableUntil: string | null
  canEdit: boolean
}

export default function NewSessionPage() {
  const router = useRouter()
  const rawId = router.query?.patientId
  const patientId = Array.isArray(rawId) ? rawId[0] : rawId

  const [patient, setPatient] = useState<Patient | null>(null)
  const [sessionNote, setSessionNote] = useState('')
  const [existingSession, setExistingSession] = useState<SessionNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (!patientId) return
    const run = async () => {
      setLoading(true); setError(null)
      try {
        // 1) Traer sesión de hoy (si existe)
        const r = await fetch(`/api/psychologist/session/today/${patientId}`)
        const j = await r.json().catch(() => ({}))
        if (r.ok && j?.ok !== false) {
          setPatient(j.patient as Patient)
          if (j.session) {
            setExistingSession(j.session as SessionNote)
            setSessionNote((j.session as SessionNote).note || '')
          }
        } else {
          // 2) No hay sesión hoy → traemos paciente por ID (endpoint válido)
          const rp = await fetch(`/api/psychologist/getMyPatientById?id=${patientId}`)
          const jp = await rp.json().catch(() => ({}))
          if (!rp.ok || !jp?.ok) throw new Error(jp?.error ?? 'No se pudo cargar el paciente')
          setPatient(jp.data.patient as Patient)
        }
      } catch (e: any) {
        setError(e?.message ?? 'Error cargando datos')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [patientId])

  // Timer de edición cada minuto
  useEffect(() => {
    if (!existingSession?.editableUntil) return
    const updateTimer = () => {
      const now = new Date()
      const limit = new Date(existingSession.editableUntil as string)
      if (isAfter(now, limit)) { setTimeRemaining('Tiempo agotado'); return }
      const diff = +limit - +now
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setTimeRemaining(`${h}h ${m}m restantes`)
    }
    updateTimer()
    const id = setInterval(updateTimer, 60_000)
    return () => clearInterval(id)
  }, [existingSession])

  async function handleSaveSession() {
    if (!patientId) return
    if (!sessionNote.trim()) return
    setSaving(true); setError(null)

    try {
      // Crear o editar según corresponda
      const creating = !existingSession
      const url = creating
        ? `/api/psychologist/session/new/${patientId}`
        : `/api/psychologist/session/${existingSession!.id}`
      const method = creating ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: sessionNote.trim() })
      })
      const j = await res.json().catch(() => ({}))

      if (!res.ok || j?.ok === false) {
        // Mapear errores comunes a mensajes claros
        const code = j?.error ?? 'Error al guardar sesión'
        const friendly =
          code === 'ALREADY_EXISTS_TODAY' ? 'Ya existe una sesión creada hoy para este paciente.' :
          code === 'NOT_YOUR_PATIENT'    ? 'Este paciente no está vinculado a tu cartera.' :
          code === 'VALIDATION'          ? 'Faltan datos obligatorios (nota/paciente).' :
          code
        throw new Error(friendly)
      }

      const saved = (j?.data ?? j) as any
      setExistingSession({
        id: saved.id,
        note: saved.note,
        date: saved.date,
        editableUntil: saved.editableUntil ?? null,
        canEdit: saved.editableUntil ? new Date() <= new Date(saved.editableUntil) : false
      })

      // Ir al historial del paciente
      router.push(`/app/psychologist/sessions/${patientId}`)
    } catch (e: any) {
      setError(e?.message ?? 'Error al guardar sesión')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Nueva Sesión">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </Layout>
    )
  }

  if (!patient) {
    return (
      <Layout title="Nueva Sesión">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Paciente no encontrado
        </div>
      </Layout>
    )
  }

  const canEdit = !existingSession || existingSession.canEdit
  const isNewSession = !existingSession

  return (
    <Layout title={`${isNewSession ? 'Nueva' : 'Editar'} Sesión - ${patient.firstName} ${patient.lastNamePaternal}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <Link href="/app/psychologist" className="text-blue-600 hover:text-blue-800 text-sm">
              ← Volver al Panel
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              {isNewSession ? 'Nueva Sesión' : 'Editar Sesión'}
            </h1>
            <p className="text-gray-600">
              {patient.firstName} {patient.lastNamePaternal} {patient.lastNameMaternal ?? ''} • {format(new Date(), 'dd/MM/yyyy', { locale: es })}
            </p>
          </div>

          {existingSession && (
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Creada: {format(new Date(existingSession.date), 'dd/MM/yyyy HH:mm', { locale: es })}
              </div>
              {existingSession.editableUntil && (
                <div className={`text-sm ${canEdit ? 'text-orange-600' : 'text-red-600'}`}>
                  {timeRemaining}
                </div>
              )}
            </div>
          )}
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
              {canEdit && (
                <span className="text-sm text-gray-500">
                  {isNewSession
                    ? 'Tendrás 24 horas para editar después de guardar'
                    : existingSession?.editableUntil
                      ? `Editable hasta ${format(new Date(existingSession.editableUntil), 'dd/MM/yyyy HH:mm', { locale: es })}`
                      : 'Editable por 24 horas'
                  }
                </span>
              )}
            </div>

            <textarea
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="Describa lo ocurrido en la sesión, temas tratados, observaciones, conclusiones..."
              disabled={!canEdit}
              className={`w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="flex justify-between">
            <Link
              href={`/app/psychologist/sessions/${patient.id}`}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Ver Historial
            </Link>

            {canEdit && (
              <button
                onClick={handleSaveSession}
                disabled={!sessionNote.trim() || saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : isNewSession ? 'Crear Sesión' : 'Actualizar Sesión'}
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
          <h3 className="font-semibold mb-1">ℹ️ Información importante:</h3>
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
