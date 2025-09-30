export async function getJson<T = any>(url: string): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return { ok: false, error: 'No autenticado' } as T
      }
      const text = await response.text()
      try {
        const j = JSON.parse(text)
        throw new Error(j.error || j.message || `Error ${response.status}`)
      } catch {
        throw new Error(text || `Error ${response.status}`)
      }
    }
    return (await response.json()) as T
  } catch (error) {
    console.error('Error in getJson:', error)
    throw error
  }
}

export async function postJson<T = any>(url: string, body: any): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    try {
      const j = JSON.parse(text)
      throw new Error(j.error || j.message || `Error ${response.status}`)
    } catch {
      throw new Error(text || `Error ${response.status}`)
    }
  }
  return (await response.json()) as T
}

export async function putJson<T = any>(url: string, body: any): Promise<T> {
  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    try {
      const j = JSON.parse(text)
      throw new Error(j.error || j.message || `Error ${response.status}`)
    } catch {
      throw new Error(text || `Error ${response.status}`)
    }
  }
  return (await response.json()) as T
}

export async function deleteRequest<T = any>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    const text = await response.text()
    try {
      const j = JSON.parse(text)
      throw new Error(j.error || j.message || `Error ${response.status}`)
    } catch {
      throw new Error(text || `Error ${response.status}`)
    }
  }
  return (await response.json()) as T
}

export default async function fetcher(url: string) {
  return getJson(url)
}
