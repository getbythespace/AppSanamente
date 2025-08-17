import Layout from '@/components/Layout'
import withPageRole from '@/utils/withPageRole'

function AssistantHome() {
  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Asistente</h1>
        {/* Pendiente*/}
      </div>
    </Layout>
  )
}
export default withPageRole(AssistantHome, ['ASSISTANT','ADMIN'])
