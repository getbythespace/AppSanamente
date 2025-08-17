import Layout from '@/components/Layout'
import withPageRole from '@/utils/withPageRole'

function PatientHome() {
  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Panel Paciente</h1>
        {/* */}
      </div>
    </Layout>
  )
}
export default withPageRole(PatientHome, ['PATIENT'])
