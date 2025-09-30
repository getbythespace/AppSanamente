import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import Link from 'next/link'
import { supabaseInvite } from '@/lib/supabaseInvite'

export default function SetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ready, setReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tokenError, setTokenError] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)

  const getURLParams = () => {
    const url = new URL(window.location.href)
    const h = new URLSearchParams(url.hash.replace(/^#/, ''))
    const q = url.searchParams
    return {
      access_token: h.get('access_token') || q.get('access_token'),
      refresh_token: h.get('refresh_token') || q.get('refresh_token'),
      code: h.get('code') || q.get('code'),
      type: h.get('type') || q.get('type'),
    }
  }

  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      try {
        const { access_token, refresh_token, code } =
          typeof window !== 'undefined' ? getURLParams() : ({} as any)

        if (access_token && refresh_token) {
          const { error } = await supabaseInvite.auth.setSession({ access_token, refresh_token })
          if (error) throw error
        } else if (code) {
          const { error } = await supabaseInvite.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          setTokenError('El enlace no incluye credenciales válidas. Pide una nueva invitación.')
          return
        }

        const { data } = await supabaseInvite.auth.getSession()
        if (!data?.session) {
          setTokenError('Auth session missing. Vuelve a abrir el enlace del correo.')
          return
        }
      } catch {
        setTokenError('No fue posible validar tu enlace. Pide una nueva invitación.')
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [])

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (!/[A-Z]/.test(pwd)) return 'Debe tener al menos una mayúscula.'
    if (!/\d/.test(pwd)) return 'Debe tener al menos un número.'
    if (!/[!@#$%^&*]/.test(pwd)) return 'Debe tener al menos un símbolo.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setTokenError('')

    if (password !== confirm) {
      setFormError('Las contraseñas no coinciden.')
      return
    }
    const v = validatePassword(password)
    if (v) { setFormError(v); return }

    setSubmitting(true)
    try {
      const { data } = await supabaseInvite.auth.getSession()
      if (!data?.session) {
        setTokenError('Auth session missing. Vuelve a abrir el enlace del correo.')
        return
      }

      // 1) Establecer contraseña
      const { error: updErr } = await supabaseInvite.auth.updateUser({ password })
      if (updErr && !/different from the old password/i.test(updErr.message || '')) {
        const msg = (updErr.message || '').toLowerCase()
        if (msg.includes('missing') || msg.includes('expired') || msg.includes('invalid')) {
          setTokenError('El enlace de invitación no es válido o ya expiró. Solicita una nueva invitación.')
        } else {
          setFormError(updErr.message || 'Error al establecer la contraseña.')
        }
        return
      }

      // 2) Finalizar la invitación en tu backend
      const accessToken = data.session.access_token
      const r = await fetch('/api/auth/complete-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || 'No se pudo finalizar la invitación.')
      }

      // 3) Feedback y redirección
      setSuccess(true)
      try { await supabaseInvite.auth.signOut() } catch {}
      setTimeout(() => router.push('/auth/login'), 1500)
    } catch (e: any) {
      setFormError(e?.message || 'Error inesperado. Intenta más tarde.')
    } finally {
      setSubmitting(false)
    }
  }

  // ===== UI =====
  if (!ready) {
    return (
      <Layout title="Activar cuenta" bare>
        <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-950 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl text-emerald-200/90 text-center">
            Verificando invitación…
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Activar cuenta" bare>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-950">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 place-items-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
            <h1 className="text-center text-2xl font-semibold tracking-tight text-white">
              Crea tu contraseña
            </h1>
            <p className="mt-2 text-center text-sm text-emerald-200/80">
              Completa este paso para activar tu cuenta.
            </p>

            {tokenError ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {tokenError}
                </div>
                <div className="text-center text-sm text-emerald-200/80">
                  <Link className="text-emerald-300 hover:text-emerald-200" href="/auth/login">
                    Volver al inicio de sesión
                  </Link>
                </div>
              </div>
            ) : success ? (
              <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-emerald-200">
                ¡Contraseña guardada! Redirigiendo al login…
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {formError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm text-emerald-100/90">Nueva contraseña</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                    minLength={8}
                    required
                  />
                  <p className="mt-1 text-xs text-emerald-200/70">
                    Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 símbolo.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-emerald-100/90">Repetir contraseña</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                    minLength={8}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="relative inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.01] hover:bg-emerald-400 disabled:opacity-60"
                >
                  {submitting ? 'Guardando…' : 'Guardar contraseña'}
                </button>

                <div className="text-center text-sm text-emerald-200/80">
                  <Link className="text-emerald-300 hover:text-emerald-200" href="/auth/login">
                    Volver al inicio de sesión
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
