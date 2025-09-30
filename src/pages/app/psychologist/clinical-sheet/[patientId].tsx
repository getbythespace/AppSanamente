// src/pages/app/psychologist/clinical-sheet/[patientId].tsx
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ClinicalEntry {
  id: string
  content: string
  createdAt: string
  authorId: string
  author: {
    firstName: string
    lastNamePaternal: string
  }
}

interface Patient {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  rut: string
}

export default function ClinicalSheetPage() {
  const router = useRouter()
  const { patientId } = router.query
  const [patient, setPatient] = useState<Patient | null>(null)
  const [entries, setEntries] = useState<ClinicalEntry[]>([])
  const [newEntry, setNewEntry] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (patientId) fetchClinicalSheet()
  }, [patientId])

  const fetchClinicalSheet = async () => {
    try {
      const response = await fetch(`/api/psychologist/clinical-sheet/${patientId}`)
      if (!response.ok) throw new Error('Error al cargar hoja clínica')
      const data = await response.json()
      setPatient(data.patient)
      setEntries(data.entries || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEntry = async () => {
    if (!newEntry.trim()) return
    setSaving(true); setError(null)
    try {
      const response = await fetch(`/api/psychologist/clinical-sheet/${patientId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newEntry.trim() })
      })
      if (!response.ok) throw new Error('Error al guardar entrada')
      const savedEntry = await response.json()
      setEntries(prev => [savedEntry, ...prev]) // ✅ FIX spread
      setNewEntry('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Hoja Clínica">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (!patient) {
    return (
      <Layout title="Hoja Clínica">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Paciente no encontrado
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`Hoja Clínica - ${patient.firstName} ${patient.lastNamePaternal}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <Link href="/app/psychologist" className="text-blue-600 hover:text-blue-800 text-sm">← Volver al Panel</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Hoja Clínica</h1>
            <p className="text-gray-600">{patient.firstName} {patient.lastNamePaternal} {patient.lastNameMaternal} • RUT: {patient.rut}</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/app/psychologist/clinical-sheet/${patientId}/history`} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">📚 Ver Historial</Link>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        {/* Nueva entrada */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Nueva Entrada Clínica</h2>
          <textarea
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            placeholder="Escriba la nueva entrada clínica..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSaveEntry}
              disabled={!newEntry.trim() || saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar Entrada'}
            </button>
          </div>
        </div>

        {/* Entradas existentes */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Entradas Recientes ({entries.length})</h2>
          </div>

          {entries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No hay entradas clínicas registradas.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <div key={entry.id} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">{entry.author.firstName} {entry.author.lastNamePaternal}</span>
                      {' • '}
                      <span>{format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                    </div>
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap">{entry.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
