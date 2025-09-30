import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/router'
import withPageRole from '@/utils/withPageRole'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import RolePill from '@/components/ui/RolePill'
import { getJson, postJson } from '@/services'

type LiteUser = {
  id: string
  email: string
  rut: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED'
  role: 'OWNER' | 'ADMIN' | 'PSYCHOLOGIST' | 'ASSISTANT' | 'PATIENT'
  dob?: string | null
}

type ListUsersRes = { ok: boolean; users: LiteUser[]; error?: string }

function AdminUserDetail() {
  const router = useRouter()
  const { id } = router.query as { id?: string }

  const { data, error, mutate } = useSWR<ListUsersRes>('/api/admin/listUsers', getJson)
  const user = useMemo(() => (data?.users || []).find(u => u.id === id), [data?.users, id])

  const [firstName, setFirstName] = useState<string>('')
  const [lastNameP, setLastNameP] = useState<string>('')
  const [lastNameM, setLastNameM] = useState<string>('')
  const [rut, setRut] = useState<string>('')
  const [dob, setDob] = useState<string>('')

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastNameP(user.lastNamePaternal || '')
      setLastNameM(user.lastNameMaternal || '')
      setRut(user.rut || '')
      setDob(user.dob ? user.dob.slice(0,10) : '')
    }
  }, [user])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true); setErr(null); setMsg(null)
    try {
      const res = await postJson('/api/admin/updateUser', {
        id: user.id,
        firstName,
        lastNamePaternal: lastNameP,
        lastNameMaternal: lastNameM,
        rut,
        ...(dob ? { dob } : {}),
      })
      if (res?.error) throw new Error(res.error)
      setMsg('Cambios guardados ✅')
      mutate()
    } catch (e: any) {
      setErr(e.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  if (!id) {
    return (
      <div className="min-h-screen role-surface">
        <TopBar title="Administración — Usuario" />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Card className="p-6">Cargando parámetro…</Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen role-surface">
        <TopBar title="Administración — Usuario" />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Card className="p-6 text-red-600">Error cargando usuarios.</Card>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen role-surface">
        <TopBar title="Administración — Usuario" />
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Card className="p-6">No se encontró el usuario.</Card>
        </div>
      </div>
    )
  }

  const fullName = `${user.firstName} ${user.lastNamePaternal} ${user.lastNameMaternal}`.trim()

  return (
    <div className="min-h-screen role-surface">
      <TopBar title="Administración — Usuario" />

      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">{fullName || 'Usuario'}</h1>
              <div className="mt-1 text-sm text-muted-foreground">{user.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <RolePill role={user.role} />
              <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs">
                {user.status}
              </span>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="text-sm font-medium mb-2">Datos personales</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input className="input" placeholder="Nombre" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
                <input className="input" placeholder="Apellido Paterno" value={lastNameP} onChange={e=>setLastNameP(e.target.value)} required />
                <input className="input" placeholder="Apellido Materno" value={lastNameM} onChange={e=>setLastNameM(e.target.value)} required />
              </div>
            </div>

            <input className="input" placeholder="RUT" value={rut} onChange={e=>setRut(e.target.value)} />
            <input className="input" type="date" placeholder="Fecha de nacimiento" value={dob} onChange={e=>setDob(e.target.value)} />

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
              {err && <span className="text-red-600 text-sm">{err}</span>}
              {msg && <span className="text-green-600 text-sm">{msg}</span>}
            </div>
          </form>
        </Card>

        {/* Meta */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{user.id}</span></div>
            <div><span className="text-muted-foreground">Email:</span> {user.email}</div>
            <div><span className="text-muted-foreground">RUT:</span> {user.rut}</div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default withPageRole(AdminUserDetail, ['ADMIN', 'OWNER', 'SUPERADMIN'])
