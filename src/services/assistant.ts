// src/services/assistant.ts
export async function getPsychologists() {
  const res = await fetch('/api/assistant/psychologists')
  const json = await res.json()
  if (!res.ok || !json.ok) throw new Error(json.error || `Error ${res.status}`)
  return json.data as Array<{ id: string; name: string; email: string }>
}

export async function listPendingInvites() {
  const res = await fetch('/api/assistant/invitations/list')
  const json = await res.json()
  if (!res.ok || !json.ok) throw new Error(json.error || `Error ${res.status}`)
  return json.data as Array<{ id: string; email: string; name: string; rut: string; createdAt: string }>
}

export async function revokePending(userId: string) {
  const res = await fetch('/api/assistant/invitations/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
  const json = await res.json()
  if (!res.ok || !json.ok) throw new Error(json.error || `Error ${res.status}`)
  return true
}
