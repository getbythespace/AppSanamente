import Layout from '@/components/Layout'
import withPageRole from '@/utils/withPageRole'
import Link from 'next/link'

function PsychologistHome() {
  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Panel Psicólogo</h1>
          <Link className="text-indigo-600 underline" href="/app/patients/pool">Ir al Pool de Pacientes</Link>
        </div>
        {/* Cards de pacientes activos, últimas notas, etc. */}
      </div>
    </Layout>
  )
}
export default withPageRole(PsychologistHome, ['PSYCHOLOGIST','ADMIN','ASSISTANT'])
