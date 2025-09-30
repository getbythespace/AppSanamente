// src/pages/app/psychologist/clinical-sheet/[patientId]/history.tsx
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Patient = {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal?: string | null
  rut?: string | null
}

type ClinicalEntry = {
  id: string
  content: string
  createdAt: string
  authorId: string
  author: { firstName: string; lastNamePaternal: string }
}

export default function ClinicalHistoryPage() {
  const router = useRouter()
  const raw = router.query?.patientId
  const patientId = Array.isArray(raw) ? raw[0] : raw

  const [patient, setPatient] = useState<Patient | null>(null)
  const [entries, setEntries] = useState<ClinicalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return
    ;(async () => {
      try {
        setLoading(true); setError(null)
        // Reutilizamos el mismo endpoint base que la hoja clínica
        const r = await fetch(`/api/psychologist/clinical-sheet/${patientId}`)
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j?.error || 'Error al cargar hoja clínica')
        setPatient(j.patient as Patient)
        setEntries((j.entries || []) as ClinicalEntry[])
      } catch (e: any) {
        setError(e?.message || 'Error')
      } finally {
        setLoading(false)
      }
    })()
  }, [patientId])

  if (loading) {
    return (
      <Layout title="Historial · Hoja Clínica">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent" />
        </div>
      </Layout>
    )
  }

  if (error || !patient) {
    return (
      <Layout title="Historial · Hoja Clínica">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Paciente no encontrado'}
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`Historial · Hoja Clínica · ${patient.firstName} ${patient.lastNamePaternal}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/app/psychologist/clinical-sheet/${patient.id}`}
              className="text-emerald-600 hover:text-emerald-800 text-sm"
            >
              ← Volver a Hoja Clínica
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">Historial de Hoja Clínica</h1>
            <p className="text-slate-600">
              {patient.firstName} {patient.lastNamePaternal} {patient.lastNameMaternal ?? ''} · RUT {patient.rut ?? '—'}
            </p>
          </div>

          <Link
            href="/app/psychologist"
            className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm"
          >
            Ir al Panel
          </Link>
        </div>

        {/* Entradas */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Entradas registradas ({entries.length})
            </h2>
          </div>

          {entries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Aún no hay entradas clínicas registradas para este paciente.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {entries.map((e) => (
                <div key={e.id} className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">
                        {e.author?.firstName} {e.author?.lastNamePaternal}
                      </span>{' '}
                      • {format(new Date(e.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                    <span className="text-xs text-gray-400">#{e.id.slice(0, 6)}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-gray-900">{e.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
