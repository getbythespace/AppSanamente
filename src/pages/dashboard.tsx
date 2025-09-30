// src/pages/dashboard.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function DashboardRedirect() {
  const r = useRouter()
  useEffect(() => { r.replace('/app') }, [r])
  return <div className="p-6">Redirigiendo…</div>
}
