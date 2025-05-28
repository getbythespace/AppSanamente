import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

const AuthIndex = () => {
  const router = useRouter()
  useEffect(() => { router.replace('/auth/login') }, [router])
  return (
    <Layout title="Autenticación">
      <p className="text-center mt-20">Redirigiendo a login…</p>
    </Layout>
  )
}

export default AuthIndex