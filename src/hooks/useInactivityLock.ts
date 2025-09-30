// src/hooks/useInactivityLock.ts
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import useCurrentUser from '@/hooks/useCurrentUser'

export default function useInactivityLock(minutes = 15) {
  const { user } = useCurrentUser()
  const router = useRouter()
  const timer = useRef<any>(null)

  useEffect(() => {
    const roles = (user?.roles ?? []).map((r:any)=> typeof r === 'string' ? r : r.role)
    const needsLock = roles.some((r:string)=> ['OWNER','ADMIN','SUPERADMIN','PSYCHOLOGIST'].includes(r))
    if (!needsLock) return

    const reset = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        router.replace('/auth/login?locked=1') 
      }, minutes * 60 * 1000)
    }

    const events = ['click','keydown','mousemove','scroll','touchstart','visibilitychange']
    events.forEach(e => window.addEventListener(e, reset))
    reset()

    return () => {
      clearTimeout(timer.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [user, router, minutes])
}
