// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  // No proteger auth ni público
  const open = ['/auth', '/_next', '/public', '/.well-known']
  if (open.some(p => req.nextUrl.pathname.startsWith(p))) return res

  // Proteger solo paneles
  const protectedPrefixes = [
    '/dashboard','/admin','/psychologist','/patient','/organization','/superadmin'
  ]
  if (!protectedPrefixes.some(p => req.nextUrl.pathname.startsWith(p))) return res

  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    const url = new URL('/auth/login', req.url)
    url.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return res
}

export const config = {
  matcher: [
    '/((?!api|_next|static|favicon.ico|.well-known).*)',
  ],
}
