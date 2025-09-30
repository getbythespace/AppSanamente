import React, { useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { getJson } from '@/services'
import { moodColor, moodEmoji } from '@/utils/mood'

type MoodItem = { id: string; date: string; score: number | null }

// Respuesta segura para tipar SWR (arregla el error TS2339)
type ApiResponse = {
  data?: { items?: MoodItem[] }
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth() + 1, 0) }

export default function PatientCalendar() {
  // 👇 Tipamos el hook para que `data` tenga forma conocida
  const { data } = useSWR<ApiResponse>('/api/mood-entries?days=365', getJson)
  const items: MoodItem[] = data?.data?.items ?? []

  const map = useMemo(() => {
    const m = new Map<string, MoodItem>()
    for (const it of items) m.set(ymd(new Date(it.date)), it)
    return m
  }, [items])

  const now = new Date()
  const first = startOfMonth(now)
  const last = endOfMonth(now)

  const cells: Date[] = []
  const leading = first.getDay() === 0 ? 6 : first.getDay() - 1 // semana inicia lunes
  for (let i = 0; i < leading; i++) {
    const d = new Date(first); d.setDate(d.getDate() - (leading - i)); cells.push(d)
  }
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) cells.push(new Date(d))
  while (cells.length % 7) {
    const d = new Date(last); d.setDate(d.getDate() + (cells.length % 7)); cells.push(d)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/app/patient"
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50
                       dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            ← Volver
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Calendario de ánimo</h1>
          <div />
        </div>

        <div className="grid grid-cols-7 gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="text-center">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {cells.map((d, i) => {
            const key = ymd(d)
            const isThisMonth = d.getMonth() === now.getMonth()
            const entry = map.get(key)
            const color = moodColor(entry?.score ?? null)

            return (
              <div
                key={i}
                className={`rounded-xl border p-2 h-20
                  ${isThisMonth
                    ? 'bg-white border-slate-200 dark:bg-slate-900/60 dark:border-slate-700'
                    : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-700'
                  }`}
              >
                <div className="text-[11px] text-right text-slate-500 dark:text-slate-400">{d.getDate()}</div>

                <div
                  className={`mt-1 text-center text-lg ${entry ? '' : 'text-slate-400 dark:text-slate-500'}`}
                  // Solo pintamos color cuando HAY entrada del mes actual; en los demás casos usamos las clases
                  style={entry && isThisMonth ? { color } : undefined}
                >
                  {moodEmoji(entry?.score ?? null)} {entry?.score ?? '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
