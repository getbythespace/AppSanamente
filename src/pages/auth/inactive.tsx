// src/pages/auth/inactive.tsx
import Image from 'next/image'
import Link from 'next/link'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/db'

export default function InactiveAccountPage() {
  const handleExit = async () => {
    try { await supabase.auth.signOut() } catch {}
    window.location.href = '/auth/login'
  }

  return (
    <Layout title="Cuenta inactiva" bare>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-900 via-slate-900 to-slate-950 p-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white shadow-2xl backdrop-blur">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-yellow-500/15 grid place-items-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <Image
            src="/logo-sana.png"
            alt="Sanamente"
            width={60}
            height={60}
            className="mx-auto mb-4 opacity-90"
          />
          <h1 className="text-2xl font-semibold mb-2">Tu cuenta no está activa</h1>
          <p className="text-emerald-100/90">
            Actualmente tu usuario se encuentra <b>inactivo</b>. 
            Por favor comunícate con el <b>administrador</b> de tu organización
            o con <b>soporte</b> para regularizar tu situación.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={handleExit}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-400"
            >
              Volver a iniciar sesión
            </button>
            <Link
              href="/auth/login"
              className="rounded-lg border border-white/20 px-4 py-2 text-emerald-100 hover:bg-white/10"
            >
              Ir a Login
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
