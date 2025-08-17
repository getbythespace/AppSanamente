import useSWR from 'swr'
import { fetcher } from '@/services/fetcher'

export function useCurrentUser() {
  const { data, error, isLoading, mutate } = useSWR('/api/users/me', fetcher, {
    shouldRetryOnError: false
  })
  return {
    user: data,        
    loading: isLoading,
    error,
    refresh: mutate
  }
}
