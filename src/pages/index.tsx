import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

const HomePage = () => {
  const router = useRouter()
  useEffect(() => {
    router.replace('/auth/login')
  }, [router])

  return (
    <Layout title="Bienvenido">
      <p className="text-center mt-20 text-gray-700">
        Redirigiendo al inicio de sesión…
      </p>
    </Layout>
  )
}

export default HomePage