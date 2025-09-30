import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/db'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [ready, setReady] = useState(false)

  // Intercambia el code (PKCE) si viene en la URL
  useEffect(() => {
    const run = async () => {
      try {
        if (typeof window !== 'undefined' && window.location.href.includes('code=')) {
          await supabase.auth.exchangeCodeForSession(window.location.href)
        }
      } catch (e) {
        // Ignora para no bloquear UI; el link de recuperación suele iniciar sesión automáticamente.
      } finally {
        setReady(true)
      }
    }
    run()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.replace('/auth/login?msg=reset_success')
    } catch (e: any) {
      setError(e.message || 'No se pudo actualizar tu contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Restablecer contraseña" bare>
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
          <h1 className="text-center text-2xl font-semibold text-white">Restablecer contraseña</h1>
          <p className="mt-2 text-center text-sm text-emerald-200/80">
            Crea una nueva contraseña para tu cuenta.
          </p>

          {!ready ? (
            <div className="mt-6 text-center text-emerald-200/80">Verificando enlace…</div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-5">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm text-emerald-100/90">Nueva contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-emerald-100/90">Confirmar contraseña</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-400 disabled:opacity-60"
              >
                {loading ? 'Actualizando…' : 'Actualizar contraseña'}
              </button>

              <div className="text-center text-sm text-emerald-200/80">
                <Link className="text-emerald-300 hover:text-emerald-200" href="/auth/login">Volver al inicio de sesión</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  )
}
