import { useEffect, useState } from 'react'

export default function useCurrentUser() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users/me', { credentials: 'include' })
      .then(async res => {
        if (res.ok) setUser(await res.json())
        else setUser(null)
        setIsLoading(false)
      })
      .catch(() => {
        setUser(null)
        setIsLoading(false)
      })
  }, [])

  return { user, isLoading }
}
