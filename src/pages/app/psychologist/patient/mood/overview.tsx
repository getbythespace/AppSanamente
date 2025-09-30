// pages/app/psychologist/patient/[patientId]/mood/overview.tsx
import React, { useEffect, useMemo, useState } from 'react'
import withPageRole from '@/utils/withPageRole'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getJson } from '@/services'
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area, ComposedChart, Bar, Cell, Line, ReferenceLine
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { moodColor } from '@/utils/mood'

type MoodItem = { id: string; date: string; score: number; comment?: string | null }
type MoodOverviewRes = {
  ok: true
  data: {
    patient: { id: string; name: string; rut?: string | null; age?: number | null }
    stats: { monthlyAvg: number; monthlyCompletion: string; totalEntries: number }
  }
}
type MoodListRes = { ok: true; data: { items: MoodItem[]; avgWeek: number } }

function formatDate(d: Date) { return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) }
function formatDateTime(d: Date) { return d.toLocaleString('es-CL', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) }
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

const NEUTRAL = 5.5

export default withPageRole(function PsychPatientMoodOverview() {
  const router = useRouter()
  const raw = router.query.patientId
  const patientId = Array.isArray(raw) ? raw[0] : raw

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<MoodOverviewRes['data'] | null>(null)
  const [items, setItems] = useState<MoodItem[]>([])
  const [avgWeek, setAvgWeek] = useState(0)

  useEffect(() => {
    if (!patientId) return
    const run = async () => {
      setLoading(true); setError(null)
      try {
        const [ov, list] = await Promise.all([
          getJson(`/api/psychologist/patient/${patientId}/mood/overview`),
          getJson(`/api/psychologist/patient/${patientId}/mood?days=30`)
        ])
        if (!ov?.ok || !ov.data) throw new Error('No se pudo cargar el resumen del paciente')
        setOverview(ov.data)

        if (list?.ok && list.data) {
          setItems(Array.isArray(list.data.items) ? list.data.items : [])
          setAvgWeek(typeof list.data.avgWeek === 'number' ? list.data.avgWeek : 0)
        } else {
          setItems([]); setAvgWeek(0)
        }
      } catch (e: any) {
        setError(e?.message ?? 'Error cargando datos')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [patientId])

  const byDay = useMemo(() => {
    const m = new Map<string, MoodItem>()
    for (const it of items) m.set(ymd(new Date(it.date)), it)
    return m
  }, [items])

  // Ventana dinámica 7→14→30 días (como en paciente)
  const [rangeDays, setRangeDays] = useState(7)
  const daysBack = (n: number) => {
    const out: Date[] = []
    for (let i = n - 1; i >= 0; i--) out.push(addDays(new Date(), -i))
    return out
  }
  const recentDays = useMemo(() => daysBack(rangeDays), [rangeDays])

  useEffect(() => {
    if (!items.length) return
    const hasHits = (n: number) => daysBack(n).some(d => byDay.has(ymd(d)))
    if (!hasHits(7)) {
      if (hasHits(14)) setRangeDays(14)
      else setRangeDays(30)
    }
  }, [items, byDay])

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
  }, [recentDays, byDay])

  const weeklyCompletion = useMemo(() => {
    const n = recentDays.filter(d => byDay.has(ymd(d))).length
    return `${n}/${rangeDays}`
  }, [recentDays, byDay, rangeDays])

  // Mensual
  const monthDays = useMemo(() => daysOfMonth(new Date()), [])
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
    const monthItems = items.filter(i => {
      const d = new Date(i.date); const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    if (!monthItems.length) return 0
    const sum = monthItems.reduce((a,b)=>a+b.score,0)
    return +(sum / monthItems.length).toFixed(1)
  }, [items])

  type TTProps = TooltipProps<number, string> & { payload?: any[] }
  const WeeklyTooltip: React.FC<TTProps> = (props) => {
    const { active } = props
    const payload = (props as any).payload as any[] | undefined
    if (!active || !payload || !payload.length) return null
    const p: any = payload[0]
    return (
      <div className="rounded-xl border bg-white px-4 py-3 text-sm shadow-lg">
        <div className="font-semibold">{p?.payload?.full}</div>
        <div>Ánimo: <span className="font-semibold text-blue-600">{p?.value}/10</span></div>
        {p?.payload?.comment && <div className="text-xs text-gray-500 mt-2 italic">"{p.payload.comment}"</div>}
      </div>
    )
  }
  const MonthTooltip: React.FC<TTProps> = (props) => {
    const { active } = props
    const payload = (props as any).payload as any[] | undefined
    if (!active || !payload || !payload.length) return null
    const row: any = payload[0]; const d = row?.payload
    return (
      <div className="rounded-xl border bg-white px-4 py-3 text-sm shadow-lg">
        <div className="font-semibold">{d?.full}</div>
        {d?.score != null ? (<div>Ánimo: <span className="font-semibold text-blue-600">{d.score}/10</span></div>) : (<div className="text-gray-500">Sin registro</div>)}
        {d?.ma != null && <div className="text-gray-600">Promedio móvil: <span className="font-medium">{d.ma}</span></div>}
        {d?.comment && <div className="text-xs text-gray-500 mt-2 italic">"{d.comment}"</div>}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </div>
    )
  }
  if (error || !overview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error ?? 'No se pudo cargar la información'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href={`/app/psychologist/patient/${patientId}`} className="text-blue-600 hover:underline">← Volver al paciente</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">Ánimo y Tendencias — {overview.patient.name}</h1>
            <div className="text-sm text-gray-600">
              {overview.patient.rut ? `RUT ${overview.patient.rut}` : ''}{overview.patient.age != null ? ` • ${overview.patient.age} años` : ''}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-5 bg-white rounded-xl border">
            <div className="text-sm text-gray-600">Promedio semanal</div>
            <div className="text-3xl font-bold">{avgWeek.toFixed(1)}</div>
          </div>
          <div className="p-5 bg-white rounded-xl border">
            <div className="text-sm text-gray-600">Promedio mensual</div>
            <div className="text-3xl font-bold">{monthlyAvg.toFixed(1)}</div>
          </div>
          <div className="p-5 bg-white rounded-xl border">
            <div className="text-sm text-gray-600">Registros (30d)</div>
            <div className="text-3xl font-bold">{items.length}</div>
          </div>
        </div>

        {/* Semanal */}
        <div className="p-6 bg-white rounded-xl border mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Evolución (últimos {rangeDays} días)</div>
            <div className="text-sm text-gray-600">Completado: {weeklyCompletion}</div>
          </div>
          {weeklyData.length === 0 ? (
            <div className="h-56 grid place-items-center text-gray-400">Sin datos recientes</div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
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
                  <Area type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Mensual */}
        <div className="p-6 bg-white rounded-xl border">
          <div className="text-lg font-semibold mb-4">
            Vista mensual — {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <ComposedChart data={monthBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" interval={0} tickFormatter={(v) => (parseInt(v,10)%2===1 ? v : '')} />
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
        </div>
      </div>
    </div>
  )
}, ['PSYCHOLOGIST'])
