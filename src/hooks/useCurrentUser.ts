import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/db'
import type { RoleType } from '@/types/roles'

let globalUserCache: User | null = null
let cacheTimestamp = 0
let fetchPromise: Promise<any> | null = null
const CACHE_DURATION = 60000

let didLoadOnceGlobal = false
let unauthorizedGlobal = false

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED'

export interface User {
  id: string
  email: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal?: string
  rut?: string
  dob?: Date
  isPsychologist: boolean
  organizationId: string | null
  activeRole: string | null
  roles: RoleType[]
  status?: UserStatus               // ⬅️ NUEVO
  createdAt: Date
  updatedAt: Date
}

export interface UseCurrentUserReturn {
  user: User | null
  loading: boolean
  isLoading: boolean
  error: string | null
  unauthorized: boolean
  didLoadOnce: boolean
  refetch: () => Promise<void>
  mutate: () => Promise<void>
}

async function fetchUserOnce(): Promise<User | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session?.user) {
    globalUserCache = null
    cacheTimestamp = 0
    unauthorizedGlobal = false
    didLoadOnceGlobal = true
    return null
    }

  const response = await fetch('/api/auth/me', {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

  if (!response.ok) {
    if (response.status === 401) {
      globalUserCache = null
      cacheTimestamp = 0
      unauthorizedGlobal = true
      didLoadOnceGlobal = true
      return null
    }
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Error obteniendo usuario')
  }

  const data = await response.json()
  if (data?.ok && data?.data) {
    globalUserCache = data.data
    cacheTimestamp = Date.now()
    unauthorizedGlobal = false
    didLoadOnceGlobal = true
    return data.data
  }
  throw new Error(data?.error || 'Respuesta inválida')
}

export function invalidateUserCache() {
  globalUserCache = null
  cacheTimestamp = 0
}

function useCurrentUser(): UseCurrentUserReturn {
  const [user, setUser] = useState<User | null>(globalUserCache)
  const [loading, setLoading] = useState(!globalUserCache && !didLoadOnceGlobal)
  const [error, setError] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState<boolean>(unauthorizedGlobal)
  const [didLoadOnce, setDidLoadOnce] = useState<boolean>(didLoadOnceGlobal)
  const isMounted = useRef(true)
  const hasInitialized = useRef(false)

  const runFetch = async () => {
    try {
      const now = Date.now()
      if (globalUserCache && (now - cacheTimestamp) < CACHE_DURATION) {
        if (isMounted.current) {
          setUser(globalUserCache)
          setLoading(false)
          setUnauthorized(unauthorizedGlobal)
          setDidLoadOnce(didLoadOnceGlobal)
        }
        return
      }

      if (fetchPromise) {
        await fetchPromise
        if (isMounted.current) {
          setUser(globalUserCache)
          setLoading(false)
          setUnauthorized(unauthorizedGlobal)
          setDidLoadOnce(didLoadOnceGlobal)
        }
        return
      }

      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      fetchPromise = fetchUserOnce()
      const result = await fetchPromise

      if (isMounted.current) {
        setUser(result)
        setUnauthorized(unauthorizedGlobal)
        setDidLoadOnce(didLoadOnceGlobal)
      }
    } catch (err: any) {
      console.error('💥 [useCurrentUser] Error:', err)
      if (isMounted.current) {
        setError(err.message)
        setUser(null)
        setUnauthorized(unauthorizedGlobal)
        setDidLoadOnce(didLoadOnceGlobal)
      }
      globalUserCache = null
      cacheTimestamp = 0
    } finally {
      fetchPromise = null
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    isMounted.current = true

    runFetch()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          invalidateUserCache()
          unauthorizedGlobal = false
          didLoadOnceGlobal = true
          if (isMounted.current) {
            setUser(null)
            setError(null)
            setUnauthorized(false)
            setDidLoadOnce(true)
          }
        } else if (event === 'SIGNED_IN' && session) {
          invalidateUserCache()
          await new Promise(r => setTimeout(r, 150))
          runFetch()
        }
      }
    )

    return () => {
      isMounted.current = false
      subscription.unsubscribe()
    }
  }, [])

  const invalidateCacheAndFetch = async () => {
    invalidateUserCache()
    await runFetch()
  }

  return {
    user,
    loading,
    isLoading: loading,
    error,
    unauthorized,
    didLoadOnce,
    refetch: invalidateCacheAndFetch,
    mutate: invalidateCacheAndFetch,
  }
}

export default useCurrentUser
export { useCurrentUser }
