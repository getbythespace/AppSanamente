// src/components/DatePicker.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { format as fnsFormat, parse as fnsParse, isValid as fnsIsValid } from 'date-fns'
import 'react-day-picker/dist/style.css'

type Props = {
  label?: string
  value?: string // ISO yyyy-MM-dd
  onChange: (isoDate: string) => void
  fromYear?: number
  toYear?: number
  disabled?: boolean
  placeholder?: string
  dropDirection?: 'down' | 'up'
}

function isoToDate(iso?: string) {
  if (!iso) return undefined
  const d = fnsParse(iso, 'yyyy-MM-dd', new Date())
  return fnsIsValid(d) ? d : undefined
}
function dateToIso(d?: Date) {
  return d ? fnsFormat(d, 'yyyy-MM-dd') : ''
}
function pretty(d?: Date) {
  return d ? fnsFormat(d, 'dd-MM-yyyy') : ''
}

export default function DatePicker({
  label,
  value,
  onChange,
  fromYear = 1930,
  toYear = new Date().getFullYear(),
  disabled,
  placeholder = 'dd-mm-aaaa',
  dropDirection = 'down'
}: Props) {
  const selected = useMemo(() => isoToDate(value), [value])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return
      if (!boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const handleSelect = (d?: Date) => {
    if (!d) return
    onChange(dateToIso(d))
    setOpen(false)
  }

  const popPos = dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'

  return (
    <div className="relative" ref={boxRef}>
      {label && (
        <label className="mb-1 block text-xs font-medium text-white">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-white outline-none transition
                   focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/30 disabled:opacity-60"
      >
        <div className="flex items-center justify-between gap-3">
          <span className={selected ? '' : 'text-white/60'}>
            {selected ? pretty(selected) : placeholder}
          </span>
          <svg className="h-4 w-4 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </button>

      {open && (
        <div
          className={`absolute z-50 ${popPos} w-[19rem] rounded-xl border border-white/12 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-xl ring-1 ring-white/10`}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={es}
            captionLayout="dropdown"  
            fromYear={fromYear}
            toYear={toYear}
            showOutsideDays
            weekStartsOn={1}
            classNames={{
              root: 'rdp !m-0 text-white',
              caption: 'flex items-center justify-between px-2 py-2 border-b border-white/10',
              caption_label: 'sr-only',              /* 👈 oculta “mes año” textual */
              caption_dropdowns: 'flex items-center gap-2',
              dropdown: 'rounded-md bg-slate-800 text-white border border-white/15 text-xs px-2 py-1 focus:outline-none',
              dropdown_month: 'rounded-md bg-slate-800 text-white border border-white/15 text-xs px-2 py-1 focus:outline-none',
              dropdown_year: 'rounded-md bg-slate-800 text-white border border-white/15 text-xs px-2 py-1 focus:outline-none',
              nav: 'flex items-center gap-1',
              nav_button: 'h-8 w-8 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40',
              nav_button_next: 'h-8 w-8 rounded-lg text-white hover:bg-white/10',
              nav_button_previous: 'h-8 w-8 rounded-lg text-white hover:bg-white/10',

              months: 'space-y-2',
              month: 'px-2',
              table: 'w-full border-collapse',
              head_row: 'text-white/75 text-[11px]',
              head_cell: 'py-2 font-medium',
              row: 'h-9',
              cell: 'text-center align-middle',
              day: 'h-8 w-8 rounded-lg text-sm text-white hover:bg-emerald-500/15 focus:outline-none focus:ring-2 focus:ring-emerald-400/40',
              day_selected: 'bg-emerald-500 text-white hover:bg-emerald-500',
              day_today: 'ring-1 ring-emerald-400/50',
              day_outside: 'text-white/35',
              day_disabled: 'text-white/25 line-through',
              weeknumber: 'text-white/50',
            }}
          />
        </div>
      )}
    </div>
  )
}
