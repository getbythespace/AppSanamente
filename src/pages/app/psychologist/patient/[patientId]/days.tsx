// pages/app/psychologist/patient/[patientId]/days.tsx
import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import withPageRole from '@/utils/withPageRole'
import Layout from '@/components/Layout'
import Link from 'next/link'
import { getJson } from '@/services'

type MoodItem = { id: string; date: string; score: number; comment?: string | null }
type PatientMini = { id: string; firstName?: string | null; lastNamePaternal?: string | null; lastNameMaternal?: string | null; rut?: string | null }

type MoodsResp =
  | { ok: true; data: { patient: PatientMini; items: MoodItem[]; avgWeek: number; today: number | null } }
  | { ok: false; error?: string }

const quickRanges = [7, 30, 90, 180, 365] as const

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function fullName(p?: PatientMini) {
  if (!p) return 'Paciente'
  return [p.firstName, p.lastNamePaternal, p.lastNameMaternal].filter(Boolean).join(' ') || 'Paciente'
}
function getMoodEmoji(score: number) {
  if (score >= 8) return '😊'
  if (score >= 6) return '🙂'
  if (score >= 4) return '😐'
  if (score >= 2) return '😔'
  return '😢'
}
function getMoodLabel(score: number) {
  if (score >= 8) return 'Muy bien'
  if (score >= 6) return 'Bien'
  if (score >= 4) return 'Regular'
  if (score >= 2) return 'Mal'
  return 'Muy mal'
}

export default withPageRole(function PsychologistPatientDays() {
  const router = useRouter()
  const { patientId } = router.query as { patientId?: string }

  const { data, isLoading, error } = useSWR<MoodsResp>(
    patientId ? `/api/psychologist/patient/${patientId}/mood?days=365` : null,
    getJson
  )

  const items: MoodItem[] = data && 'ok' in data && data.ok ? data.data.items : []
  const patient = data && 'ok' in data && data.ok ? data.data.patient : undefined

  const [rangeDays, setRangeDays] = useState<number>(30)
  const [month, setMonth] = useState<number | ''>('' as any)
  const [year, setYear] = useState<number | ''>('' as any)

  const yearsInData = useMemo(() => {
    const ys = new Set<number>()
    for (const it of items) ys.add(new Date(it.date).getFullYear())
    return Array.from(ys).sort((a, b) => b - a)
  }, [items])

  const filtered = useMemo(() => {
    if (!items.length) return []
    if (month !== '' && year !== '') {
      return items
        .filter(it => {
          const d = new Date(it.date)
          return d.getFullYear() === year && d.getMonth() === month
        })
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    }
    const since = new Date()
    since.setDate(since.getDate() - rangeDays + 1)
    since.setHours(0, 0, 0, 0)
    return items
      .filter(it => new Date(it.date) >= since)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  }, [items, rangeDays, month, year])

  const stats = useMemo(() => {
    if (!filtered.length) return { total: 0, avg: 0 }
    const total = filtered.length
    const sum = filtered.reduce((acc, item) => acc + item.score, 0)
    const avg = Math.round((sum / total) * 10) / 10
    return { total, avg }
  }, [filtered])

  function onPickMonth(m: string) { setMonth(m === '' ? ('' as any) : parseInt(m, 10)) }
  function onPickYear(y: string) { setYear(y === '' ? ('' as any) : parseInt(y, 10)) }
  function chooseRange(d: number) { setRangeDays(d); setMonth('' as any); setYear('' as any) }
  const clearFilters = () => { setMonth('' as any); setYear('' as any); setRangeDays(30) }

  return (
    <Layout title="Psicólogo/a · Historial detallado">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <Link href={`/app/psychologist/patient/${patientId}`} className="px-3 py-1.5 rounded-lg border hover:bg-slate-50">
              ← Volver
            </Link>
            <h1 className="text-2xl font-semibold">Historial detallado</h1>
            <span className="text-2xl font-bold text-[#1f376c]">
              {fullName(patient)}
            </span>
          </div>
        </div>

        {/* Estado de carga/errores */}
        {isLoading && (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-600 text-lg">Cargando historial...</p>
          </div>
        )}
        {error && !isLoading && (
          <div className="p-6 text-center text-red-600">Error al cargar el historial.</div>
        )}

        {/* Stats */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCard title="Total Registros" value={stats.total} subtitle="en el período" />
            <StatCard title="Promedio" value={stats.avg} subtitle="puntuación media" />
          </div>
        )}

        {/* Filtros */}
        <div className="rounded-2xl border bg-white p-6 mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-sm font-medium min-w-fit">Período rápido:</span>
              <div className="flex flex-wrap gap-2">
                {quickRanges.map(d => (
                  <button
                    key={d}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      month !== '' || year !== ''
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                        : rangeDays === d
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    onClick={() => chooseRange(d)}
                    disabled={month !== '' || year !== ''}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-sm font-medium min-w-fit">Mes específico:</span>
              <div className="flex flex-wrap items-center gap-3">
                <select value={month} onChange={e => onPickMonth(e.target.value)} className="px-4 py-2 border rounded-lg text-sm">
                  <option value="">Seleccionar mes...</option>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Date(2000, i, 1).toLocaleDateString('es-CL', { month: 'long' })}
                    </option>
                  ))}
                </select>

                <select value={year} onChange={e => onPickYear(e.target.value)} className="px-4 py-2 border rounded-lg text-sm">
                  <option value="">Seleccionar año...</option>
                  {yearsInData.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                {(month !== '' || year !== '') && (
                  <button onClick={clearFilters} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              {month !== '' && year !== '' ? (
                <span>
                  Mostrando <b>{new Date(year, month).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</b>
                </span>
              ) : (
                <span>Mostrando últimos <b>{rangeDays} días</b></span>
              )}
              {filtered.length > 0 && <span> • {filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Registros de Estados de Ánimo</h2>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-600">No hay registros en el período seleccionado.</div>
          ) : (
            <div className="divide-y">
              {filtered.map((it) => {
                const d = new Date(it.date)
                const hoy = isSameDay(d, new Date())
                return (
                  <div key={it.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-6 flex-1">
                        <div className="flex flex-col items-center min-w-fit">
                          <div className="text-4xl mb-2">{getMoodEmoji(it.score)}</div>
                          <div className="w-14 h-14 rounded-xl bg-blue-600 text-white grid place-items-center text-lg font-bold">
                            {it.score}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <div className="text-2xl font-bold mb-1 leading-tight">
                              {d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="text-lg text-slate-600">
                              {d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                              {hoy && (
                                <span className="ml-3 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full">
                                  HOY
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mb-3">
                            <h3 className="text-xl font-semibold mb-1">{getMoodLabel(it.score)}</h3>
                            <div className="text-sm text-slate-500">
                              Puntuación: {it.score}/10
                            </div>
                          </div>

                          {it.comment && (
                            <div className="bg-slate-50 rounded-xl p-4 text-slate-700 italic max-w-2xl">
                              <div className="text-sm text-slate-500 mb-1">Comentario:</div>
                              <div className="text-base">"{it.comment}"</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}, ['PSYCHOLOGIST'])

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-600 mb-1">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-600 opacity-90" />
      </div>
    </div>
  )
}
