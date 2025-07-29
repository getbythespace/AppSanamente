import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Obtener sesión actual del usuario
  const { data: { session } } = await supabase.auth.getSession()

  // Redirigir al login si no hay sesión
  if (!session && !req.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return res
}

export const config = {
  matcher: [
    // Paneles y rutas privadas
    "/dashboard",
    "/dashboard/(.*)",
    "/admin",
    "/admin/(.*)",
    "/psychologist",
    "/psychologist/(.*)",
    "/patient",
    "/patient/(.*)",
    "/organization",
    "/organization/(.*)",
    // Rutas de autenticación
    "/api/(.*)",
  ],
}
