import React from 'react'

export default function PageBg() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      {/*  */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-900" />
      {/*  */}
      <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-emerald-300/25 blur-3xl
                      dark:left-auto dark:-right-24 dark:bg-emerald-400/10" />
      {/*  */}
      <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-lime-200/25 blur-3xl
                      dark:right-auto dark:-left-24 dark:bg-lime-300/10" />
    </div>
  )
}
