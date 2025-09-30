// src/components/Layout.tsx
import React, { ReactNode, useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/db'
import { RoleThemeProvider } from '@/components/ui/RoleTheme'
import AppShell from '@/components/ui/AppShell'

type Props = {
  children?: ReactNode
  title?: string
  bare?: boolean
}

export default function Layout({ children, title = 'App Sanamente', bare }: Props) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const logout = useCallback(async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      await fetch('/api/auth/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event: 'SIGNED_OUT' }),
      })
    } finally {
      setSigningOut(false)
      router.replace('/auth/login')
    }
  }, [router, signingOut])

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        {/* Iconos App */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0f766e" />
      </Head>

      {bare ? (
        // Para login / set-password / etc
        <div className="min-h-screen">{children}</div>
      ) : (
        <RoleThemeProvider>
          <AppShell>{children}</AppShell>
        </RoleThemeProvider>
      )}
    </>
  )
}
