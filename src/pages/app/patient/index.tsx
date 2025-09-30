// pages/app/patient/index.tsx
import React, { useEffect, useMemo, useState } from 'react'
import withPageRole from '@/utils/withPageRole'
import Link from 'next/link'
import { getJson, postJson } from '@/services'
import { supabase } from '@/lib/db'
import { useRouter } from 'next/router'
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ReferenceLine,
  Legend,
  ComposedChart,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { moodColor, MOOD_BANDS } from '@/utils/mood'
import ThemeToggle from '@/components/ui/ThemeToggle'

type MoodItem = { id: string; date: string; score: number; comment?: string | null }
type MoodData = { items: MoodItem[]; avgWeek: number; today: number | null }
type MoodRes  = { ok: true; data: MoodData }
type Reminder = { enabled: boolean; time: string }

/** Estructura normalizada que usará SIEMPRE el componente */
type NormalizedOverview = {
  patient: { id: string | null; name: string; rut: string | null; dob: string | null; age: number | null }
  psychologist: { id: string; name: string; rut: string | null } | null
  metrics?: {
    totalEntries?: number | null
    averageMood?: number | null
    currentStreak?: number | null
    chartDataPoints?: number | null
  }
}

/** Acepta tanto { patient, psychologist, metrics } como respuestas "planas" (patientName, averageMood, etc.) */
function normalizeOverviewPayload(raw: any): NormalizedOverview {
  const patient =
    raw?.patient
      ? raw.patient
      : {
          id: raw?.patientId ?? null,
          name: raw?.patientName ?? 'Paciente',
          rut: raw?.rut ?? null,
          dob: raw?.dob ?? null,
          age: typeof raw?.age === 'number' ? raw.age : null,
        }

  const psychologist = raw?.psychologist ?? null

  const metrics =
    raw?.metrics ?? {
      totalEntries: raw?.totalEntries ?? null,
      averageMood: typeof raw?.averageMood === 'number' ? +raw.averageMood.toFixed(1) : null,
      currentStreak: raw?.currentStreak ?? null,
      chartDataPoints: raw?.chartDataPoints ?? null,
    }

  return { patient, psychologist, metrics }
}

// Iconos SVG
const icons = {
  calendar: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  chart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2z" />
    </svg>
  ),
  heart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
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
  trend: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  fire: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 1-4 4-4 1.657 1.657 3 4 3 4s2-1.015 2.5-3.5c1.5 1.5 2.5 4 2.5 4-.5 2.5-2.843 5.657-5.343 8.157z" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M16.121 3.879a3 3 0 114.243 4.243L12 16.485 8 17l.515-4.121 7.606-7.606z" />
    </svg>
  )
}

/* ------------------ Fondo con halos pro (light/dark) ------------------ */
const Bg = () => (
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    {/* base: degrade suave en ambas temáticas */}
    <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-white dark:from-[#0B0F14] dark:via-[#0D1218] dark:to-[#0F141A]" />
    {/* halo central “spotlight” */}
    <div className="absolute inset-x-0 -top-40 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(59,130,246,0.15),transparent)] dark:bg-[radial-gradient(60%_60%_at_50%_0%,rgba(56,189,248,0.14),transparent)] blur-2xl" />
    {/* blobs animados muy sutiles */}
    <div className="blob absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-300/25 dark:bg-cyan-400/10 blur-3xl" />
    <div className="blob-delay absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-indigo-200/25 dark:bg-indigo-300/10 blur-3xl" />
    <style jsx>{`
      @keyframes floaty { 0%,100%{ transform:translate3d(0,0,0) scale(1)}
                          50%{ transform:translate3d(28px,18px,0) scale(1.04)} }
      .blob{ animation: floaty 16s ease-in-out infinite; }
      .blob-delay{ animation: floaty 20s ease-in-out infinite; animation-delay: -6s; }
    `}</style>
  </div>
)

/* ------------------ TopBar ------------------ */
function TopBar() {
  const router = useRouter()
  const handleSignOut = async () => {
    try { await supabase.auth.signOut() } finally { router.replace('/auth/login') }
  }
  return (
    <header className="w-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold text-lg backdrop-blur-sm">
            S
          </div>
          <div className="font-semibold text-xl">Sanamente</div>
        </div>
        <div className="flex items-center gap-3">
          {/* 👇 importante: deshabilitamos el FAB flotante */}
          <ThemeToggle floating={false} />
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

/* ------------------ Card ------------------ */
function Card({
  children,
  className = '',
  gradient = false,
  onClick
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  onClick?: () => void;
}) {
  const Component = (onClick ? 'button' : 'div') as any
  return (
    <Component
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white/90 shadow-sm hover:shadow-md transition-all duration-200
                  dark:border-slate-700 dark:bg-slate-900/60
                  ${gradient ? 'bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-900/60 dark:via-slate-900/50 dark:to-slate-900/40' : ''}
                  ${onClick ? 'cursor-pointer hover:-translate-y-[1px]' : ''} ${className}`}
    >
      {children}
    </Component>
  )
}

/* ------------------ StatCard ------------------ */
function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  trend,
  onClick
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo'
  trend?: 'up' | 'down' | 'neutral'
  onClick?: () => void
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-50',
    green: 'from-green-500 to-green-600 text-green-50',
    purple: 'from-purple-500 to-purple-600 text-purple-50',
    orange: 'from-orange-500 to-orange-600 text-orange-50',
    red: 'from-red-500 to-red-600 text-red-50',
    indigo: 'from-indigo-500 to-indigo-600 text-indigo-50'
  }
  const trendIcons = {
    up: <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>,
    down: <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>,
    neutral: <svg className="w-4 h-4 text-gray-500 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
  }
  return (
    <Card className={`p-6 ${onClick ? 'cursor-pointer hover:shadow-lg' : ''} transition-all duration-200`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">{title}</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">{value}</div>
          {subtitle && (
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              {trend && trendIcons[trend]}
              {subtitle}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

function metricBar(value: number, max = 10) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  return (
    <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div
        style={{ width: `${pct}%` }}
        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
      />
    </div>
  )
}

function formatDate(d: Date) { return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) }
function formatDateTime(d: Date) {
  return d.toLocaleString('es-CL', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

// fechas
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x }
function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth()+1, 0) }
function daysOfMonth(d = new Date()) {
  const start = startOfMonth(d), end = endOfMonth(d)
  const out: Date[] = []
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate()+1)) out.push(new Date(cur))
  return out
}

export default withPageRole(function PatientDashboard() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [overview, setOverview] = useState<NormalizedOverview | null>(null)
  const [items, setItems] = useState<MoodItem[]>([])
  const [avgWeek, setAvgWeek] = useState<number>(0)
  const [todayScore, setTodayScore] = useState<number | null>(null)
  const [todayComment, setTodayComment] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reminder, setReminder] = useState<Reminder>({ enabled: false, time: '21:00' })
  const [savingReminder, setSavingReminder] = useState(false)

  const [score, setScore] = useState(7)
  const [comment, setComment] = useState('')

  const [showMoodModal, setShowMoodModal] = useState(false)
  const [savingEntry, setSavingEntry] = useState(false)

  useEffect(() => { if (todayScore != null) setScore(todayScore) }, [todayScore])

  async function loadAll() {
    setLoading(true); setError(null)
    try {
      const [ovRaw, moodRaw] = await Promise.all([
        getJson('/api/patient/overview'),
        getJson('/api/mood-entries?days=30'),
      ])

      // --- OVERVIEW: tolerante al formato
      const ovJson = (ovRaw?.data ?? ovRaw)
      if (!ovJson) throw new Error('No se pudo cargar la información del paciente.')
      const ovNormalized = normalizeOverviewPayload(ovJson)
      setOverview(ovNormalized)

      // --- MOOD (opcional)
      if (!moodRaw || (moodRaw.ok === false && !moodRaw.data)) {
        setItems([]); setAvgWeek(0); setTodayScore(null); setTodayComment('')
      } else {
        const mood = (moodRaw.data ?? moodRaw) as MoodData | MoodRes | any
        const itemsArr: MoodItem[] = Array.isArray((mood as MoodData).items) ? (mood as MoodData).items : Array.isArray((mood as any)?.items) ? (mood as any).items : []
        setItems(itemsArr)
        setAvgWeek(typeof (mood as MoodData).avgWeek === 'number' ? (mood as MoodData).avgWeek : 0)
        setTodayScore((mood as MoodData).today ?? null)

        const start = new Date(); start.setHours(0,0,0,0)
        const end = new Date();   end.setHours(23,59,59,999)
        const todayItem = itemsArr.find((i: MoodItem) => {
          const d = new Date(i.date); return d >= start && d <= end
        })
        setTodayComment(todayItem?.comment || '')
      }

      // --- Reminder (no crítico)
      try {
        const r = await getJson('/api/patient/reminder') as any
        if (r?.data) setReminder(r.data)
      } catch {}
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  // map por día
  const byDay = useMemo(() => {
    const m = new Map<string, MoodItem>()
    for (const it of items) m.set(ymd(new Date(it.date)), it)
    return m
  }, [items])

  // ===== Ventana semanal dinámica: 7 → 14 → 30
  function daysBack(n: number) {
    const out: Date[] = []
    for (let i = n - 1; i >= 0; i--) out.push(addDays(new Date(), -i))
    return out
  }
  const [rangeDays, setRangeDays] = useState(7)
  const recentDays = useMemo(() => daysBack(rangeDays), [rangeDays])

  useEffect(() => {
    if (!items.length) return
    const hasHits = (n: number) => daysBack(n).some(d => byDay.has(ymd(d)))
    if (!hasHits(7)) {
      if (hasHits(14)) setRangeDays(14)
      else setRangeDays(30)
    }
  }, [items, byDay])

  // datos semanales
  const weeklyData = useMemo(() => {
    return recentDays
      .map(d => {
        const hit = byDay.get(ymd(d))
        if (!hit) return null
        return {
          label: formatDate(d),
          score: hit.score,
          comment: hit.comment ?? '',
          full: formatDateTime(new Date(hit.date)),
        }
      })
      .filter(Boolean) as { label: string; score: number; comment: string; full: string }[]
  }, [byDay, recentDays])

  const weeklyCompletion = useMemo(() => {
    const n = recentDays.filter(d => byDay.has(ymd(d))).length
    return `${n}/${rangeDays}`
  }, [byDay, recentDays, rangeDays])

  // mes actual
  const monthDays = useMemo(() => daysOfMonth(new Date()), [])
  const monthItems = useMemo(() => {
    const now = new Date()
    return items
      .filter(i => {
        const d = new Date(i.date)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .sort((a,b)=>+new Date(a.date)-+new Date(b.date))
  }, [items])
  const monthCompletion = useMemo(() => `${monthItems.length}/${monthDays.length}`, [monthItems.length, monthDays.length])

  // dataset mensual
  const NEUTRAL = 5.5
  const monthBarData = useMemo(() => {
    const base = monthDays.map(d => {
      const hit = byDay.get(ymd(d))
      return {
        label: String(d.getDate()).padStart(2,'0'),
        score: hit ? hit.score : null as number | null,
        missing: hit ? null : NEUTRAL,
        full: hit ? formatDateTime(new Date(hit.date)) : d.toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' }),
        comment: hit?.comment ?? null,
      }
    })
    const w = 7
    const ma = base.map((_, i) => {
      const slice = base.slice(Math.max(0, i-(w-1)), i+1)
      const vals = slice.map(s => s.score).filter((v): v is number => v != null)
      return vals.length ? +(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null
    })
    return base.map((d, i) => ({ ...d, ma: ma[i] }))
  }, [byDay, monthDays])

  const monthlyAvg = useMemo(() => {
    if (!monthItems.length) return 0
    const sum = monthItems.reduce((a,b)=>a+b.score,0)
    return +(sum / monthItems.length).toFixed(1)
  }, [monthItems])

  // Tooltips
  type TTProps = TooltipProps<number, string> & { payload?: any[] }

  const WeeklyTooltip: React.FC<TTProps> = (props) => {
    const { active } = props
    const payload = (props as any).payload as any[] | undefined
    if (!active || !payload || !payload.length) return null
    const p: any = payload[0]
    const full: string | undefined = p?.payload?.full
    const comment: string | undefined = p?.payload?.comment
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg backdrop-blur-sm
                      dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{full}</div>
        <div className="text-slate-700 dark:text-slate-200">Ánimo: <span className="font-semibold text-blue-600 dark:text-blue-300">{p?.value}/10</span></div>
        {comment && <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">"{comment}"</div>}
      </div>
    )
  }

  const MonthTooltip: React.FC<TTProps> = (props) => {
    const { active } = props
    const payload = (props as any).payload as any[] | undefined
    if (!active || !payload || !payload.length) return null
    const row: any = payload[0]
    const d = row?.payload
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg backdrop-blur-sm
                      dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="font-semibold text-slate-900 dark:text-slate-100">{d?.full}</div>
        {d?.score != null ? (
          <div className="text-slate-700 dark:text-slate-200">Ánimo: <span className="font-semibold text-blue-600 dark:text-blue-300">{d.score}/10</span></div>
        ) : (
          <div className="text-slate-500 dark:text-slate-400">Sin registro</div>
        )}
        {d?.ma != null && <div className="text-slate-600 dark:text-slate-300">Promedio móvil: <span className="font-medium">{d.ma}</span></div>}
        {d?.comment && <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">"{d?.comment}"</div>}
      </div>
    )
  }

  // guardar
  async function saveEntry(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      setSavingEntry(true)
      await postJson('/api/mood-entries', { score, comment: comment.trim() || undefined })
      setComment('')
      setShowMoodModal(false)
      await loadAll()
    } catch (e:any) {
      setError(e.message || 'Error al guardar')
    } finally { setSavingEntry(false) }
  }

  const getMoodEmoji = (score: number) => {
    if (score >= 8) return '😊'
    if (score >= 6) return '🙂'
    if (score >= 4) return '😐'
    if (score >= 2) return '😔'
    return '😢'
  }

  const getMoodLabel = (score: number) => {
    if (score >= 8) return 'Muy bien'
    if (score >= 6) return 'Bien'
    if (score >= 4) return 'Regular'
    if (score >= 2) return 'Mal'
    return 'Muy mal'
  }

  if (loading) {
    return (
      <div className="relative min-h-[100svh] overflow-x-hidden transition-colors duration-300">
        <Bg />
        <TopBar />
        <div className="flex items-center justify-center min-h-[calc(100svh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
            <p className="text-slate-600 dark:text-slate-300 text-lg">Cargando tu panel...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-[100svh] overflow-x-hidden transition-colors duration-300">
        <Bg />
        <TopBar />
        <div className="flex items-center justify-center min-h-[calc(100svh-4rem)]">
          <Card className="p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-red-700 dark:text-red-300 font-semibold text-lg mb-3">Error cargando datos</h3>
              <p className="text-red-700 dark:text-red-300 text-sm mb-6">{error}</p>
              <button
                onClick={loadAll}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors font-medium"
              >
                Reintentar
              </button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[100svh] overflow-x-hidden transition-colors duration-300">
      <Bg />
      <TopBar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Principal */}
        <div className="mb-8">
          <Card className="p-8" gradient>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Mi Panel de Salud Mental
                </h1>
                <div className="text-lg text-slate-600 dark:text-slate-300 mb-2">
                  Hola, <span className="font-semibold text-slate-800 dark:text-slate-100">{overview?.patient.name || 'Paciente'}</span> 👋
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {new Date().toLocaleDateString('es-CL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                {overview && (
                  <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="flex items-center gap-2">
                      {icons.user}
                      <span>
                        {overview.patient.rut && ` RUT ${overview.patient.rut}`}
                        {typeof overview.patient.age === 'number' && ` • ${overview.patient.age} años`}
                      </span>
                    </div>
                    {overview.psychologist && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>
                          Psicólogo/a: <span className="font-medium">{overview.psychologist.name}</span>
                          {overview.psychologist.rut && ` (${overview.psychologist.rut})`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowMoodModal(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg"
                >
                  {icons.plus}
                  {todayScore ? 'Actualizar estado' : 'Registrar estado hoy'}
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Promedio Semanal"
            value={avgWeek.toFixed(1)}
            subtitle={`Completado: ${weeklyCompletion}`}
            icon={icons.chart}
            color="blue"
            trend={avgWeek >= 6 ? 'up' : avgWeek >= 4 ? 'neutral' : 'down'}
            onClick={() => {}}
          />
          <StatCard
            title="Estado de Hoy"
            value={todayScore ?? '—'}
            subtitle={todayScore ? getMoodLabel(todayScore) : 'Sin registro'}
            icon={icons.heart}
            color={todayScore ? (todayScore >= 6 ? 'green' : todayScore >= 4 ? 'orange' : 'red') : 'purple'}
          />
          <StatCard
            title="Promedio Mensual"
            value={monthlyAvg.toFixed(1)}
            subtitle={`Completado: ${monthCompletion}`}
            icon={icons.calendar}
            color="indigo"
            trend={monthlyAvg >= 6 ? 'up' : monthlyAvg >= 4 ? 'neutral' : 'down'}
          />
          <StatCard
            title="Racha Actual"
            value={recentDays.filter(d => byDay.has(ymd(d))).length}
            subtitle="días consecutivos"
            icon={icons.fire}
            color="orange"
          />
        </div>

        {/* Estado Actual */}
        {todayScore && (
          <div className="mb-8">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {icons.heart}
                  Estado de Hoy
                </h2>

                {/* Botón “Editar registro” decente */}
                <Link
                  href="/app/patient/days"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all border border-amber-200/60 dark:border-amber-400/20 shadow-md"
                >
                  {icons.edit}
                  Editar registro
                </Link>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-6xl">{getMoodEmoji(todayScore)}</div>
                <div className="flex-1">
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {todayScore}/10
                  </div>
                  <div className="text-lg text-slate-600 dark:text-slate-300 mb-3">
                    {getMoodLabel(todayScore)}
                  </div>
                  {metricBar(todayScore)}
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Registrado hoy • {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              {todayComment && (
                <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-white/70 dark:bg-slate-800/40 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">Comentario del día:</div>
                  <div className="text-slate-800 dark:text-slate-200 italic">"{todayComment}"</div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Gráfico Semanal */}
          <div className="xl:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {icons.trend}
                  Evolución Semanal
                </h2>
                <Link
                  href="/app/patient/days"
                  className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-medium"
                >
                  Ver historial
                </Link>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Últimos {rangeDays} días • Completado: {weeklyCompletion}
              </div>

              {!mounted || weeklyData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <div>Sin datos para mostrar</div>
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <AreaChart data={weeklyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="label" />
                      <YAxis domain={[0,10]} ticks={[0,2,4,6,8,10]} />
                      <Tooltip content={<WeeklyTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#3B82F6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {recentDays.map((d) => {
                  const hit = byDay.get(ymd(d))
                  return (
                    <div
                      key={ymd(d)}
                      className={`px-3 py-2 rounded-full text-xs border ${
                        hit
                          ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-200'
                          : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {formatDate(d)}: <span className="font-semibold">{hit ? hit.score : '—'}</span>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Guía de Calificación */}
          <div>
            <Card className="p-6">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Guía de Calificación
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Califica tu estado general de ánimo del 1 al 10:
              </p>
              <div className="space-y-3">
                {Object.values(MOOD_BANDS).map((b) => (
                  <div key={b.range} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div className="text-lg">{b.emoji}</div>
                    <div className="text-sm">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{b.label}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">{b.range}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-xl dark:bg-blue-950/30">
                <div className="text-xs text-blue-700 dark:text-blue-200">
                  💡 <span className="font-medium">Tip:</span> Registra tu estado al final del día para obtener mejores insights.
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Gráfico Mensual */}
        <div className="mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {icons.calendar}
                Vista Mensual - {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
              </h2>
              <Link
                href="/app/patient/month"
                className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-medium"
              >
                Ver detalles por mes
              </Link>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {monthCompletion} días con registro • Promedio mensual: {monthlyAvg.toFixed(1)}
            </div>

            {!mounted || monthBarData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📅</div>
                  <div>Sin datos mensuales</div>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <ComposedChart data={monthBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis
                      dataKey="label"
                      interval={0}
                      tickFormatter={(v) => (parseInt(v,10)%2===1 ? v : '')}
                    />
                    <YAxis domain={[0,10]} ticks={[0,2,4,6,8,10]} />
                    <Tooltip content={<MonthTooltip />} />
                    <Legend />
                    <Bar dataKey="missing" name="Sin registro" fill="#e5e7eb" radius={[4,4,0,0]} />
                    <Bar dataKey="score" name="Ánimo" radius={[4,4,0,0]} minPointSize={3}>
                      {monthBarData.map((d, i) => (
                        <Cell key={i} fill={d.score == null ? '#e5e7eb' : moodColor(d.score)} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="ma" name="Promedio móvil (7d)" dot={false} strokeWidth={2} stroke="#f59e0b" />
                    <ReferenceLine y={monthlyAvg} stroke="#9ca3af" opacity={0.5} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">Cargando...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-4">
            <div className="text-sm text-red-600 dark:text-red-200 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 inline-block">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Registro de Estado */}
      {showMoodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMoodModal(false)} />
          <Card className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Registrar Estado de Ánimo</h3>
              <button
                onClick={() => setShowMoodModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={saveEntry} className="space-y-6">
              {/* Score con emoji */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  ¿Cómo te sientes hoy?
                </label>

                <div className="text-center mb-6">
                  <div className="text-6xl mb-3">{getMoodEmoji(score)}</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {score}/10
                  </div>
                  <div className="text-lg text-slate-600 dark:text-slate-300">
                    {getMoodLabel(score)}
                  </div>
                </div>

                <input
                  type="range"
                  min="1"
                  max="10"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #8b5cf6 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-2">
                  <span>Muy mal</span>
                  <span>Excelente</span>
                </div>
              </div>

              {/* Comentario */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Comentarios (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100"
                  rows={3}
                  placeholder="¿Cómo te sientes hoy? ¿Qué ha influido en tu ánimo?"
                  maxLength={500}
                />
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                  {comment.length}/500
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMoodModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEntry}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                >
                  {savingEntry ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </div>
                  ) : (
                    todayScore ? 'Actualizar' : 'Guardar'
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}, ['PATIENT'])
