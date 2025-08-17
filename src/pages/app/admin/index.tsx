import Layout from '@/components/Layout'
import withPageRole from '@/utils/withPageRole'

function AdminHome() {
  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Admin</h1>
        {/* Tabla de usuarios */}
      </div>
    </Layout>
  )
}
export default withPageRole(AdminHome, ['ADMIN'])
