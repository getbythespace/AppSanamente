import React from 'react'
import type { GetServerSideProps } from 'next'
import Layout from '@/components/Layout'

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/auth/login',
      permanent: false,
    },
  }
}

export default function HomePage() {
  return (
    <Layout title="Redirigiendo…">
      <p className="text-center mt-20 text-gray-700">Redirigiendo al inicio de sesión…</p>
    </Layout>
  )
}