import Link from 'next/link'
import withPageRole from '@/utils/withPageRole'

function History() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-900 transition-colors duration-300">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Historial</h1>
          <Link
            href="/app/patient"
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50
                       dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Volver
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 text-slate-600
                        dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          Próximamente: selector de meses, exportaciones y filtros.
        </div>
      </div>
    </div>
  )
}

export default withPageRole(History as any, ['PATIENT'])
