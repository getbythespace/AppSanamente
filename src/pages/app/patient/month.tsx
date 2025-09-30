import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { getJson } from '@/services'
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Legend,
  Bar, Line, ReferenceLine, Cell, Tooltip
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { moodColor, moodBand, MOOD_BANDS, moodEmoji } from '@/utils/mood'

type MoodItem = { id: string; date: string; score: number; comment?: string | null }

function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth()+1, 0) }
function daysOfMonth(d = new Date()) {
  const start = startOfMonth(d), end = endOfMonth(d)
  const out: Date[] = []
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate()+1)) out.push(new Date(cur))
  return out
}
function fmtLong(d: Date) { return d.toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'}) }
function fmtDay(d: Date)  { return String(d.getDate()).padStart(2,'0') }

const NEUTRAL = 5.5

function withAlpha(hex: string, a: number) {
  const h = hex.replace('#','')
  const r = parseInt(h.substring(0,2), 16)
  const g = parseInt(h.substring(2,4), 16)
  const b = parseInt(h.substring(4,6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export default function PatientMonthDetail() {
  const { data } = useSWR<{ data?: { items?: MoodItem[] } }>('/api/mood-entries?days=365', getJson)
  const items: MoodItem[] = data?.data?.items ?? []

  const years = useMemo(() => {
    const s = new Set<number>()
    for (const it of items) s.add(new Date(it.date).getFullYear())
    return Array.from(s).sort((a,b)=>b-a)
  }, [items])

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear]   = useState(now.getFullYear())

  const monthTitle = useMemo(
    () => new Date(year, month, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
    [year, month]
  )

  const monthDays = useMemo(() => daysOfMonth(new Date(year, month, 1)), [year, month])
  const byDay = useMemo(()=>{
    const m = new Map<string, MoodItem>()
    for (const it of items) m.set(ymd(new Date(it.date)), it)
    return m
  }, [items])

  const dataSet = useMemo(()=>{
    const base = monthDays.map(d => {
      const hit = byDay.get(ymd(d))
      return {
        label: fmtDay(d),
        score: hit ? hit.score : null as number | null,
        missing: hit ? null : NEUTRAL,
        full: hit ? fmtLong(new Date(hit.date)) : fmtLong(d),
        comment: hit?.comment ?? null,
        hasData: !!hit,
        iso: ymd(d),
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

  const responded = dataSet.filter(d => d.score != null)
  const monthlyAvg = responded.length
    ? +(responded.reduce((a,b)=>a+(b.score as number),0)/responded.length).toFixed(1)
    : 0

  const maFirst   = dataSet.find(d => d.ma != null)?.ma ?? null
  const maLast    = [...dataSet].reverse().find(d => d.ma != null)?.ma ?? null
  const missingCount = monthDays.length - responded.length
  const completionPct = responded.length / monthDays.length

  const counts = responded.reduce<Record<string, number>>((acc, d) => {
    const k = moodBand(d.score as number)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})

  type TTProps = TooltipProps<number, string> & { payload?: any[] }
  const MonthTooltip: React.FC<TTProps> = ({ active, payload }) => {
    const pl = (payload as any[]) || []
    if (!active || !pl.length) return null
    const row = pl[0]?.payload
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow
                      dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="font-medium mb-1">{row?.full}</div>
        {row?.hasData
          ? <div>Ánimo del día: <b>{row.score}</b></div>
          : <div>Sin registro — Base neutral: <b>{NEUTRAL}</b></div>}
        {row?.ma!=null && <div>Promedio móvil (hasta ahora): <b>{row.ma}</b></div>}
        {row?.comment && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">“{row.comment}”</div>}
      </div>
    )
  }

  function rangoPromedioLabel(avg: number) {
    if (avg < 2)   return 'muy bajo (1–2)'
    if (avg < 3)   return 'bajo (2–3)'
    if (avg < 4)   return 'bajo/moderado (3–4)'
    if (avg < 5)   return 'mixto con tendencia baja (4–5)'
    if (avg < 6)   return 'neutral (≈5)'
    if (avg < 7)   return 'positivo/funcional (6–7)'
    if (avg < 8)   return 'muy buen ánimo (7–8)'
    if (avg < 9)   return 'alto (8–9)'
    return 'excelente (9–10)'
  }
  function tonoMes(avg: number) {
    if (avg < 3.0) return { t:'difícil',  msg:'mes desafiante' }
    if (avg < 4.0) return { t:'difícil',  msg:'mes con predominio de ánimo bajo' }
    if (avg < 5.0) return { t:'mixto',    msg:'mes con tendencia baja' }
    if (avg < 6.0) return { t:'mixto',    msg:'mes neutro/mixto' }
    if (avg < 7.0) return { t:'positivo', msg:'mes con ánimo positivo en general' }
    if (avg < 8.5) return { t:'positivo', msg:'mes muy positivo' }
    return { t:'positivo', msg:'mes excelente' }
  }
  function tendencia(maFirst: number|null, maLast: number|null) {
    if (maFirst==null || maLast==null) return {dir:'estable', txt:'sin cambios claros'}
    const diff = +(maLast - maFirst).toFixed(1)
    if (diff >= 0.6) return {dir:'sube', txt:`alza (+${diff})`}
    if (diff <= -0.6) return {dir:'baja', txt:`baja (${diff})`}
    return {dir:'estable', txt:'estable (±0.5)'}
  }
  const trend = tendencia(maFirst, maLast)

  const topBands = (Object.keys(MOOD_BANDS) as Array<keyof typeof MOOD_BANDS>)
    .sort((a,b)=>(counts[b]??0)-(counts[a]??0))
    .slice(0,2)

  const lowResponses = responded.length < Math.min(25, monthDays.length)
  const completionNote = completionPct >= 0.5
    ? '👏 ¡Felicitaciones! Completaste más de la mitad del mes; eso hace más nítidas las conclusiones.'
    : 'Sugerencia: intenta registrar ≥25 días/mes para tener una referencia más confiable.'

  // Calendario (L–D)
  const firstDow = new Date(year, month, 1).getDay()
  const offset = (firstDow + 6) % 7
  const total = monthDays.length
  const tail = (offset + total) % 7 === 0 ? 0 : 7 - ((offset + total) % 7)
  const grid: Array<{ date: Date | null }> = [
    ...Array(offset).fill({ date: null }),
    ...monthDays.map(d => ({ date: d })),
    ...Array(tail).fill({ date: null })
  ]
  const weekLabels = ['L','M','M','J','V','S','D']
  const isToday = (d: Date | null) => d
    && d.getFullYear()===now.getFullYear()
    && d.getMonth()===now.getMonth()
    && d.getDate()===now.getDate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-6">
        {/* encabezado */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <Link
              href="/app/patient"
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700
                         dark:border-slate-700 dark:hover:bg-slate-800/40 dark:text-slate-200"
            >
              ← Volver
            </Link>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Mes en detalle</h1>
            <span className="text-2xl font-bold text-[#1f376c] dark:text-emerald-300 capitalize">
              {monthTitle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={e=>setMonth(parseInt(e.target.value,10))}
              className="border border-slate-300 rounded-lg px-2 py-1 text-sm bg-white text-slate-900
                         dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700"
            >
              {Array.from({length:12}).map((_,i)=>(
                <option key={i} value={i}>{new Date(2000,i,1).toLocaleDateString('es-CL',{month:'long'})}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e=>setYear(parseInt(e.target.value,10))}
              className="border border-slate-300 rounded-lg px-2 py-1 text-sm bg-white text-slate-900
                         dark:bg-slate-900/60 dark:text-slate-100 dark:border-slate-700"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">
            {new Date(year, month, 1).toLocaleDateString('es-CL',{month:'long',year:'numeric'})} • {responded.length}/{monthDays.length} días con registro
          </div>

          <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer>
              <ComposedChart data={dataSet} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" interval={0} />
                <YAxis domain={[0,10]} ticks={[0,2,4,6,8,10]} />
                <Tooltip content={<MonthTooltip />} />
                <Legend />
                <Bar dataKey="missing" name="Sin registro" fill="#e5e7eb" radius={[6,6,0,0]} />
                <Bar dataKey="score" name="Ánimo" radius={[6,6,0,0]} minPointSize={3}>
                  {dataSet.map((d,i)=><Cell key={i} fill={moodColor(d.score)} />)}
                </Bar>
                <Line type="monotone" dataKey="ma" name="Promedio móvil (7d)" dot={false} strokeWidth={2} stroke="#f59e0b" />
                <ReferenceLine y={monthlyAvg} stroke="#9ca3af" opacity={0.35} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* KPIs */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900/60">
              <div className="text-xs text-slate-500 dark:text-slate-400">Promedio móvil (último valor)</div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{maLast != null ? maLast.toFixed(1) : '—'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900/60">
              <div className="text-xs text-slate-500 dark:text-slate-400">Ánimo promedio del mes</div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{monthlyAvg.toFixed(1)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900/60">
              <div className="text-xs text-slate-500 dark:text-slate-400">Días sin registrar</div>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{missingCount}</div>
            </div>
          </div>

          {/* Conclusión */}
          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="font-medium text-slate-900 dark:text-slate-100">Conclusión</div>
            <ul className="text-sm text-slate-700 dark:text-slate-200 leading-6 list-disc pl-5">
              <li>
                <b>Promedio del mes:</b> {monthlyAvg.toFixed(1)} — {rangoPromedioLabel(monthlyAvg)} ({tonoMes(monthlyAvg).msg}).
              </li>
              <li>
                <b>Tendencia (promedio móvil):</b> {maFirst!=null && maLast!=null ? `${trend.txt}` : 'insuficiente para estimar'}.
              </li>
              <li>
                <b>Tasa de respuesta:</b> {responded.length}/{monthDays.length} ({Math.round(completionPct*100)}%).
                {' '}
                {lowResponses
                  ? 'Recomendación: registraste pocos días; el mes podría no reflejarse bien. Idealmente ≥25 días.'
                  : 'Buen nivel de respuestas; la lectura es más confiable.'}
              </li>
              {topBands.length > 0 && (
                <li>
                  <b>Franjas más frecuentes:</b>{' '}
                  {topBands.map((k, idx) => (
                    <span key={k} className="inline-flex items-center gap-1 mr-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: MOOD_BANDS[k].color}} />
                      {MOOD_BANDS[k].emoji} {MOOD_BANDS[k].label} <span>({counts[k] ?? 0} d.)</span>
                      {idx < topBands.length-1 ? ',' : ''}
                    </span>
                  ))}
                </li>
              )}
            </ul>

            <div className="text-sm text-slate-700 dark:text-slate-200">
              {completionNote}
            </div>

            {/* chips distribución */}
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              {(Object.keys(MOOD_BANDS) as Array<keyof typeof MOOD_BANDS>).map(k => (
                <span
                  key={k}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-slate-200 bg-white text-slate-800
                             dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200"
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: MOOD_BANDS[k].color}}/>
                  {MOOD_BANDS[k].emoji} {MOOD_BANDS[k].label}: <b className="ml-1">{counts[k] ?? 0}</b>
                </span>
              ))}
            </div>
          </div>

          {/* Calendario */}
          <div className="mt-6">
            <div className="mb-2 grid grid-cols-7 text-center text-xs text-slate-500 dark:text-slate-400">
              {weekLabels.map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {grid.map((cell, i) => {
                const d = cell.date
                if (!d) return <div key={i} className="aspect-square rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40" />
                const hit = byDay.get(ymd(d))
                const score = hit?.score ?? null
                const color = moodColor(score)
                const bg = hit ? withAlpha(color, 0.18) : '#f3f4f6'
                const border = hit ? color : '#e5e7eb'
                const emoji = hit ? moodEmoji(score) : '—'
                const today = isToday(d)
                const label = hit ? MOOD_BANDS[moodBand(score!)].label : ''
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-xl p-1 flex flex-col ${today ? 'ring-2 ring-[#1f376c] dark:ring-emerald-400' : ''}`}
                    style={{ backgroundColor: bg, border: `1px solid ${border}` }}
                    title={hit ? `${fmtLong(d)} — ánimo ${score}` : `${fmtLong(d)} — sin registro`}
                  >
                    <div className="text-[13px] md:text-sm font-semibold text-slate-700 dark:text-slate-200 text-right leading-none">
                      {d.getDate()}
                    </div>
                    <div className="flex-1 flex items-center justify-center text-xl leading-none">
                      {emoji}
                    </div>
                    <div className="text-[12px] text-slate-800 dark:text-slate-200 text-center font-medium leading-none pb-0.5">
                      {hit ? `${score} • ${label}` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Fin calendario */}
        </div>
      </div>
    </div>
  )
}
