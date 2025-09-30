import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import withPageRole from '@/utils/withPageRole'
import Link from 'next/link'
import { getJson, postJson } from '@/services'
import { supabase } from '@/lib/db'
import { useRouter } from 'next/router'

type MoodItem = { id: string; date: string; score: number; comment?: string | null }

interface ApiResponse {
  success?: boolean
  data?: { items?: MoodItem[] }
  items?: MoodItem[]
  entries?: MoodItem[]
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

// Iconos
const icons = {
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  filter: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.708V4z" />
    </svg>
  ),
  clear: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  stats: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function TopBar() {
  const router = useRouter()
  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } finally { router.replace('/auth/login') }
  }
  return (
    <header className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg backdrop-blur-sm">
            S
          </div>
          <div className="font-semibold text-xl">Sanamente</div>
        </div>
        <div className="flex items-center gap-3">
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
    <section
      className={`rounded-2xl border border-slate-200 bg-white/90 shadow-sm hover:shadow-md transition-shadow duration-200
                  dark:border-slate-700 dark:bg-slate-900/60
                  ${gradient ? 'bg-gradient-to-br from-white to-gray-50 dark:from-slate-900/60 dark:to-slate-900/40' : ''} ${className}`}
    >
      {children}
    </section>
  )
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
function getMoodColor(score: number) {
  if (score >= 8) return 'from-green-500 to-green-600'
  if (score >= 6) return 'from-blue-500 to-blue-600'
  if (score >= 4) return 'from-yellow-500 to-yellow-600'
  if (score >= 2) return 'from-orange-500 to-orange-600'
  return 'from-red-500 to-red-600'
}

function StatCard({ title, value, subtitle, color = 'blue' }: {
  title: string
  value: string | number
  subtitle?: string
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'red'
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600'
  }
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{title}</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
          {subtitle && <div className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-sm`}>
          {icons.stats}
        </div>
      </div>
    </Card>
  )
}

const quickRanges = [7, 30, 90, 180, 365] as const

export default withPageRole(function PatientDaysPage() {
  const { data, isLoading, mutate } = useSWR('/api/mood-entries?days=365', getJson)
  const items: MoodItem[] =
    (data as ApiResponse)?.data?.items ??
    (data as ApiResponse)?.items ??
    (data as ApiResponse)?.entries ?? []

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

  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<MoodItem | null>(null)
  const [localScore, setLocalScore] = useState(7)
  const [localComment, setLocalComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const openModal = (it: MoodItem) => {
    setSelected(it)
    setLocalScore(it.score)
    setLocalComment(it.comment || '')
    setErr(null)
    setOpen(true)
  }
  const closeModal = () => { setOpen(false); setSelected(null) }
  const isTodaySelected = selected ? isSameDay(new Date(selected.date), new Date()) : false

  async function saveToday() {
    if (!selected || !isTodaySelected) { closeModal(); return }
    try {
      setSaving(true); setErr(null)
      await postJson('/api/mood-entries', {
        score: localScore,
        comment: localComment.trim() || undefined
      })
      await mutate()
      closeModal()
    } catch (e: any) {
      setErr(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function onPickMonth(m: string) { setMonth(m === '' ? ('' as any) : parseInt(m, 10)) }
  function onPickYear(y: string) { setYear(y === '' ? ('' as any) : parseInt(y, 10)) }
  function chooseRange(d: number) { setRangeDays(d); setMonth('' as any); setYear('' as any) }
  const clearFilters = () => { setMonth('' as any); setYear('' as any); setRangeDays(30) }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-900 transition-colors duration-300">
      <TopBar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Card className="p-8" gradient>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <Link
                    href="/app/patient"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors dark:text-emerald-300 dark:hover:text-emerald-200"
                  >
                    {icons.back}
                    Volver al Panel
                  </Link>
                </div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-3">
                  {icons.calendar}
                  Historial Detallado
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-300">
                  Explora tu historial completo de estados de ánimo con filtros avanzados
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCard title="Total Registros" value={stats.total} subtitle="en el período" color="blue" />
            <StatCard
              title="Promedio"
              value={stats.avg}
              subtitle="puntuación media"
              color={stats.avg >= 6 ? 'green' : stats.avg >= 4 ? 'yellow' : 'red'}
            />
          </div>
        )}

        {/* Filtros */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              {icons.filter}
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-lg">Filtros de Búsqueda</span>
            </div>

            {/* Rápidos */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-fit">Período rápido:</span>
              <div className="flex flex-wrap gap-2">
                {quickRanges.map(d => (
                  <button
                    key={d}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      month !== '' || year !== ''
                        ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500'
                        : rangeDays === d
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => chooseRange(d)}
                    disabled={month !== '' || year !== ''}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            </div>

            {/* Mes/Año */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-fit">Mes específico:</span>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={month}
                  onChange={e => onPickMonth(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm
                             bg-white dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700"
                >
                  <option value="">Seleccionar mes...</option>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Date(2000, i, 1).toLocaleDateString('es-CL', { month: 'long' })}
                    </option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={e => onPickYear(e.target.value)}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm
                             bg-white dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700"
                >
                  <option value="">Seleccionar año...</option>
                  {yearsInData.map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                {(month !== '' || year !== '') && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors
                               dark:text-red-300 dark:hover:text-red-200 dark:hover:bg-red-950/30"
                  >
                    {icons.clear}
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Info filtros */}
            <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3">
              {month !== '' && year !== '' ? (
                <span>Mostrando registros de <strong>{new Date(year, month).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</strong></span>
              ) : (
                <span>Mostrando últimos <strong>{rangeDays} días</strong></span>
              )}
              {filtered.length > 0 && <span> • {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        </Card>

        {/* Lista */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {icons.calendar}
              Registros de Estados de Ánimo
            </h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-300 text-lg">Cargando historial...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-slate-400 dark:text-slate-500 text-6xl mb-4">📊</div>
              <h3 className="text-slate-700 dark:text-slate-200 font-semibold text-lg mb-3">No hay registros</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                {items.length === 0
                  ? 'Aún no tienes registros de estados de ánimo.'
                  : 'No se encontraron registros en el período seleccionado.'}
              </p>
              <Link
                href="/app/patient"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Volver al Panel
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {filtered.map((it) => {
                const d = new Date(it.date)
                const hoy = isSameDay(d, new Date())
                return (
                  <div key={it.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-6 flex-1">
                        <div className="flex flex-col items-center min-w-fit">
                          <div className="text-4xl mb-2">{getMoodEmoji(it.score)}</div>
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getMoodColor(it.score)} flex items-center justify-center text-white font-bold shadow-sm text-lg`}>
                            {it.score}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1 leading-tight">
                              {d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="text-lg text-slate-600 dark:text-slate-300 font-medium">
                              {d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                              {hoy && (
                                <span className="ml-3 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full">
                                  ¡HOY!
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mb-3">
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
                              {getMoodLabel(it.score)}
                            </h3>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              Puntuación: {it.score}/10
                            </div>
                          </div>

                          {it.comment && (
                            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 text-slate-700 dark:text-slate-200 italic max-w-2xl">
                              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Comentario:</div>
                              <div className="text-base">"{it.comment}"</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => openModal(it)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm ml-4 min-w-fit"
                      >
                        {icons.eye}
                        {hoy ? 'Editar' : 'Ver'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
      {open && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <Card className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {isTodaySelected ? 'Editar Estado de Hoy' : 'Detalle del Registro'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-6">
                <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">Fecha del registro</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight">
                  {new Date(selected.date).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-lg text-slate-600 dark:text-slate-300 font-medium">
                  {new Date(selected.date).toLocaleTimeString('es-CL')}
                  {isTodaySelected && <span className="ml-3 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-semibold">HOY</span>}
                </div>
              </div>

              {isTodaySelected ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Estado de ánimo
                    </label>

                    <div className="text-center mb-4">
                      <div className="text-5xl mb-2">{getMoodEmoji(localScore)}</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                        {localScore}/10
                      </div>
                      <div className="text-lg text-slate-600 dark:text-slate-300">
                        {getMoodLabel(localScore)}
                      </div>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={localScore}
                      onChange={(e) => setLocalScore(parseInt(e.target.value))}
                      className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                      <span>Muy mal</span>
                      <span>Excelente</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Comentarios
                    </label>
                    <textarea
                      value={localComment}
                      onChange={(e) => setLocalComment(e.target.value)}
                      rows={3}
                      className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100"
                      placeholder="¿Cómo te sentiste hoy? ¿Qué influyó en tu estado de ánimo?"
                      maxLength={500}
                    />
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                      {localComment.length}/500
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="text-5xl mb-2">{getMoodEmoji(selected.score)}</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {selected.score}/10
                    </div>
                    <div className="text-lg text-slate-600 dark:text-slate-300">
                      {getMoodLabel(selected.score)}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Comentario del día</div>
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 text-slate-700 dark:text-slate-200">
                      {selected.comment || (
                        <span className="text-slate-500 dark:text-slate-400 italic">Sin comentarios para este día</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {err && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl">
                  <div className="text-sm text-red-700 dark:text-red-200">{err}</div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors font-medium"
                >
                  {isTodaySelected ? 'Cancelar' : 'Cerrar'}
                </button>
                {isTodaySelected && (
                  <button
                    onClick={saveToday}
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    {saving ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Guardando...
                      </div>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}, ['PATIENT'])
