import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/db'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [ok, setOk] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setOk(false); setLoading(true)
    try {
      const site = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
      const redirectTo = `${site}/auth/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error

      // O podemos dejar un mensaje en esta misma pantalla:
      // setOk(true)
      // …pero para tu UX, redirigimos a login con msg=check_email
      router.replace('/auth/login?msg=check_email')
    } catch (e: any) {
      setError(e.message || 'No se pudo enviar el correo de recuperación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Recuperar contraseña" bare>
      <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
          <h1 className="text-center text-2xl font-semibold text-white">¿Olvidaste tu contraseña?</h1>
          <p className="mt-2 text-center text-sm text-emerald-200/80">
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm text-emerald-100/90">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/40 outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/30"
                placeholder="tu@correo.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>

            <div className="text-center text-sm text-emerald-200/80">
              <Link className="text-emerald-300 hover:text-emerald-200" href="/auth/login">Volver al inicio de sesión</Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
