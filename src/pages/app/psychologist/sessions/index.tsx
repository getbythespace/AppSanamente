import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function SessionsIndex() {
  const router = useRouter()
  useEffect(() => { router.replace('/app/psychologist') }, [router])
  return <div className="p-6 text-gray-600">Redirigiendo al Panel…</div>
}
