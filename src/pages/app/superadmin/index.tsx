import Layout from '@/components/Layout'
import withPageRole from '@/utils/withPageRole'

function SuperadminHome() {
  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Superadmin</h1>
        {/* Orgs, métricas globales, auditoría */}
      </div>
    </Layout>
  )
}
export default withPageRole(SuperadminHome, ['SUPERADMIN'])
