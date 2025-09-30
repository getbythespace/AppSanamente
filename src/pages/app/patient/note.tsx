import Link from 'next/link'
import withPageRole from '@/utils/withPageRole'

function Note() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Nueva nota</h1>
        <Link href="/app/patient" className="px-3 py-1.5 rounded-lg border">Volver</Link>
      </div>
      <div className="rounded-2xl border bg-white p-6 text-gray-600">
        Placeholder para notas personales / sesión (según el flujo que definas).
      </div>
    </div>
  )
}
export default withPageRole(Note as any, ['PATIENT'])
