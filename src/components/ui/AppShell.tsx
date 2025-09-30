import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/db'
import RoleSwitcher from '@/components/roleSwitcher'
import { useRoleTheme } from './RoleTheme'

export default function AppShell({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  const t = useRoleTheme()
  const router = useRouter()

  const logout = async () => {
    try { await supabase.auth.signOut() }
    finally { router.replace('/auth/login') }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-slate-950">
      {/* TOPBAR con gradiente por rol */}
      <header className={`relative z-10 bg-gradient-to-b ${t.gradient}`}>
        {/* halos SOLO en la zona de la barra */}
        <div className="pointer-events-none absolute inset-0">
          <div className={`absolute -top-24 -left-24 h-80 w-80 rounded-full ${t.haloA}`} />
          <div className={`absolute -bottom-24 -right-24 h-96 w-96 rounded-full ${t.haloB}`} />
        </div>

        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 text-white">
          <div className="flex items-center gap-3">
            <Link href="/app" className="flex items-center gap-2">
              <Image
                src="/logo-sana.png"
                width={28}
                height={28}
                alt="Sanamente"
                className="drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]"
              />
              <span className="text-base font-semibold">Sanamente</span>
            </Link>
            {title && (
              <span className="hidden rounded-full bg-white/10 px-3 py-1 text-sm font-medium md:inline">
                {title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <RoleSwitcher />
            <Link
              href="/app/profile"
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 dark:border-white/10"
            >
              Perfil
            </Link>
            <button
              onClick={logout}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm hover:bg-red-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        <div className={`rounded-2xl border p-6 shadow-2xl ${t.panel}`}>
          {children}
        </div>
      </main>
    </div>
  )
}
