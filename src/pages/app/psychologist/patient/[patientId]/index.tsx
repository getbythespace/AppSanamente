// src/pages/app/psychologist/patient/[patientId]/index.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import withPageRole from '@/utils/withPageRole'
import Layout from '@/components/Layout'
import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { getJson, postJson } from '@/services'
import { moodColor } from '@/utils/mood'

type Patient = {
  id: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal?: string | null
  email?: string | null
  rut?: string | null
  dob?: string | null
  avg30?: number | null
  lastEntryAt?: string | null
}
type Assignment = { status: string; startedAt?: string | null }
type SessionNote = { id: string; note: string; createdAt: string }
type ClinicalEntry = { id: string; content: string; createdAt: string }

type ApiResp =
  | {
      ok: true
      data: {
        patient: Patient
        assignment: Assignment
        sessionNotes: SessionNote[]
        clinicalEntries: ClinicalEntry[]
      }
    }
  | { ok: false; error?: string }

type MoodItem = { id: string; date?: string; createdAt?: string; score: number; comment?: string | null }

function fmtDateTime(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(+d) ? '—' : d.toLocaleString('es-CL')
}
function fmtDate(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(+d) ? '—' : d.toLocaleDateString('es-CL')
}
function fullName(p: Patient) {
  return [p.firstName, p.lastNamePaternal, p.lastNameMaternal].filter(Boolean).join(' ')
}
function ageLabel(dob?: string | null) {
  if (!dob) return ''
  const d = new Date(dob)
  if (isNaN(+d)) return ''
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  let months = now.getMonth() - d.getMonth()
  if (now.getDate() < d.getDate()) months--
  if (months < 0) { years--; months += 12 }
  return `(${years} año${years !== 1 ? 's' : ''}${months > 0 ? ` y ${months} mes${months !== 1 ? 'es' : ''}` : ''})`
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border bg-white/95 backdrop-blur-sm
      border-slate-200 shadow-[0_1px_0_#fff_inset,0_10px_25px_rgba(112,35,255,0.06)]
      dark:bg-slate-900/60 dark:border-slate-700 ${className}`}
    >
      {children}
    </section>
  )
}

/** Mini gráfico de barras del mes actual (sin librerías) */
function MonthMiniChart({ items }: { items: MoodItem[] }) {
  // Construir mapa día->promedio del mes actual
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const byDay: Record<number, number[]> = {}
  for (const it of items) {
    const raw = it.date || it.createdAt
    if (!raw) continue
    const d = new Date(raw)
    if (isNaN(+d)) continue
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      byDay[day] = byDay[day] ? [...byDay[day], it.score] : [it.score]
    }
  }

  const series = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const vals = byDay[day] || []
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    return { day, value: avg }
  })

  return (
    <div className="w-full">
      <div className="flex items-end gap-[6px] h-32 px-2">
        {series.map(s => (
          <div key={s.day} className="flex-1 flex flex-col items-center">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-violet-400 to-fuchsia-400 dark:from-violet-600 dark:to-fuchsia-600 transition-[height]"
              style={{ height: `${(s.value / 10) * 100}%` }}
              title={`${s.day.toString().padStart(2, '0')}: ${s.value.toFixed(1)}/10`}
            />
            <span className="mt-1 text-[10px] text-slate-500">{String(s.day).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <div className="px-2 pb-2 text-xs text-slate-500">
        {now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, m => m.toUpperCase())}
      </div>
    </div>
  )
}

export default withPageRole(function PsychologistPatientProfile() {
  const router = useRouter()
  const { patientId } = router.query as { patientId?: string }

  const { data: resp, error, isLoading, mutate } = useSWR<ApiResp>(
    patientId ? `/api/psychologist/getMyPatientById?id=${patientId}` : null,
    getJson
  )

  const [mood, setMood] = useState<MoodItem[]>([])
  const [loadingMood, setLoadingMood] = useState(false)

  useEffect(() => {
    if (!patientId) return
    let alive = true
    ;(async () => {
      try {
        setLoadingMood(true)
        const j = await getJson<{ data?: { items?: MoodItem[] } }>(
          `/api/psychologist/patient/${patientId}/mood?days=365`
        )
        if (!alive) return
        const items = j?.data?.items ?? []
        setMood(items || [])
      } catch {
        setMood([])
      } finally {
        setLoadingMood(false)
      }
    })()
    return () => { alive = false }
  }, [patientId])

  const patient = resp && 'ok' in resp && resp.ok ? resp.data.patient : undefined
  const assignment = resp && 'ok' in resp && resp.ok ? resp.data.assignment : undefined
  const notes = resp && 'ok' in resp && resp.ok ? resp.data.sessionNotes : []
  const clinical = resp && 'ok' in resp && resp.ok ? resp.data.clinicalEntries : []

  const avg30 = useMemo(() => {
    const v = patient?.avg30
    return typeof v === 'number' ? v.toFixed(1) : '—'
  }, [patient?.avg30])

  const goBack = () => router.back()
  const exportPdf = () => {
    if (!patientId) return
    window.open(`/api/psychologist/patient/${patientId}/export?format=pdf`, '_blank')
  }
  const releasePatient = async () => {
    if (!patientId || !patient) return
    if (!confirm(`¿Liberar a ${fullName(patient)}?`)) return
    try {
      const r = await postJson(`/api/patients/${patientId}/link-psychologist`, { mode: 'release' })
      if ((r as any)?.ok) router.replace('/app/psychologist')
    } catch {}
  }

  if (isLoading) {
    return (
      <Layout title="Paciente">
        <div className="p-6 flex items-center justify-center h-64">
          <div className="h-10 w-10 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
          <span className="ml-3 text-slate-600">Cargando perfil del paciente…</span>
        </div>
      </Layout>
    )
  }
  if (error || !resp || !('ok' in resp) || !resp.ok || !patient) {
    return (
      <Layout title="Paciente">
        <div className="p-6 text-center">
          <div className="text-red-600 mb-4">
            {(resp as any)?.error || 'No se pudo cargar la información del paciente.'}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => mutate()} className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
              Reintentar
            </button>
            <button onClick={goBack} className="px-4 py-2 rounded-lg border hover:bg-slate-50">
              Volver
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Psicólogo/a · Perfil de paciente">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
        {/* Header con accesos (incluye ThemeToggle para asegurar visibilidad) */}
        <Card>
          <div className="p-4 sm:p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                  {fullName(patient)}
                </h1>
                <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                  <span>{patient.email || '—'}</span>
                  {patient.rut ? <span>· RUT {patient.rut}</span> : null}
                  {patient.dob ? <span>· Nació: {fmtDate(patient.dob)} {ageLabel(patient.dob)}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <ThemeToggle />
                <button onClick={goBack} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50 text-sm">
                  ← Volver
                </button>
                <Link
                  href={`/app/psychologist/patient/${patientId}/days`}
                  className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                >
                  Historial detallado
                </Link>
                <Link
                  href={`/app/psychologist/patient/${patientId}/month`}
                  className="px-3 py-1.5 rounded-lg border text-sm hover:bg-slate-50"
                >
                  Mes en detalle
                </Link>
                <button
                  onClick={exportPdf}
                  className="px-3 py-1.5 rounded-lg bg-[#6d28d9] text-white text-sm hover:bg-[#7c3aed]"
                >
                  Exportar PDF
                </button>
                <button
                  onClick={releasePatient}
                  className="px-3 py-1.5 rounded-lg border border-red-300 text-red-700 text-sm hover:bg-red-50"
                >
                  Liberar paciente
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Stat label="Promedio 30 días" value={avg30} />
              <Stat label="Último registro" value={fmtDateTime(patient.lastEntryAt)} />
              <Stat label="Estado asignación" value={assignment?.status || '—'} />
              <Stat label="Asignado desde" value={fmtDate(assignment?.startedAt)} />
              <Stat label="Nacimiento" value={`${fmtDate(patient.dob)} ${ageLabel(patient.dob)}`} />
            </div>
          </div>
        </Card>

        {/* Gráfico del mes actual */}
        <Card>
          <div className="p-4 sm:p-6">
            <h2 className="font-semibold text-slate-900 mb-3">Ánimo — mes actual</h2>
            <MonthMiniChart items={mood} />
            <div className="mt-3 text-xs text-slate-500">
              Promedio del mes: <span className="font-semibold">
                {(() => {
                  const now = new Date()
                  const mm = now.getMonth(); const yy = now.getFullYear()
                  const vals = mood
                    .map(m => m.date || m.createdAt)
                    .filter(Boolean)
                    .map(d => new Date(d as string))
                    .filter(d => d.getMonth() === mm && d.getFullYear() === yy)
                    .map((_, i) => mood[i].score)
                  if (!vals.length) return '—'
                  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
                  return avg.toFixed(1)
                })()}
              </span>
            </div>
          </div>
        </Card>

        {/* Últimos estados de ánimo */}
        {(loadingMood || mood.length > 0) && (
          <Card>
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900">Últimos estados de ánimo</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Registros: {mood.length}</span>
                  <Link
                    href={`/app/psychologist/patient/${patientId}/days`}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs hover:bg-purple-700"
                  >
                    Ver historial detallado →
                  </Link>
                </div>
              </div>

              {loadingMood ? (
                <div className="h-24 grid place-items-center text-slate-500">Cargando…</div>
              ) : mood.length === 0 ? (
                <div className="text-sm text-slate-500">No hay registros de ánimo.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {mood.slice(0, 12).map((m) => {
                    const when = m.date || m.createdAt
                    const dateStr = when ? new Date(when).toLocaleDateString('es-CL') : '—'
                    return (
                      <div key={m.id} className="border rounded-lg p-3 text-sm bg-white/70 dark:bg-slate-900/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">{dateStr}</span>
                          <span className="font-semibold" style={{ color: moodColor(m.score) }}>
                            {m.score}/10
                          </span>
                        </div>
                        {!!m.comment && (
                          <div className="text-slate-700 dark:text-slate-200 mt-1 line-clamp-2">{m.comment}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Notas (bitácora de sesión) */}
        <Card>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">Historial de notas</h2>
              <div className="flex items-center gap-2">
                <Link
                  href={`/app/psychologist/sessions/${patient.id}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm"
                >
                  Ver más
                </Link>
                <Link
                  href={`/app/psychologist/session/new/${patient.id}`}
                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 text-sm"
                >
                  📝 Nueva sesión
                </Link>
              </div>
            </div>
            {notes.length === 0 ? (
              <div className="text-sm text-slate-500">Aún no hay notas de sesión.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notes.map((n) => (
                  <div key={n.id} className="border rounded-lg p-3 hover:bg-slate-50">
                    <div className="text-xs text-slate-500 mb-2">📝 {fmtDateTime(n.createdAt)}</div>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap">{n.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Hoja clínica */}
        <Card>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-900">Entradas clínicas</h2>
              <Link
                href={`/app/psychologist/clinical-sheet/${patient.id}`}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
              >
                Abrir hoja clínica →
              </Link>
            </div>
            {clinical.length === 0 ? (
              <div className="text-sm text-slate-500">Sin entradas clínicas.</div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {clinical.map((c) => (
                  <div key={c.id} className="border rounded-lg p-3 hover:bg-slate-50">
                    <div className="text-xs text-slate-500 mb-2">🏥 {fmtDateTime(c.createdAt)}</div>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap">{c.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  )
}, ['PSYCHOLOGIST'])

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:bg-slate-800/40 dark:border-slate-700">
      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value || '—'}</div>
    </div>
  )
}
