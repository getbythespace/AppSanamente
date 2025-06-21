import useSWR from 'swr'

export function useCurrentUser() {
  const { data, error, isLoading } = useSWR('/api/users/me', url =>
    fetch(url).then(r => r.json())
  )
  return {
    user: data,
    isLoading,
    isError: error
  }
}