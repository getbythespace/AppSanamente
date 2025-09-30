import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

const OPEN_PREFIXES = ['/auth', '/_next', '/public', '/.well-known', '/static', '/favicon.ico']
const PROTECTED_PREFIXES = ['/app']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (OPEN_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (!PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  const res = NextResponse.next()              
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const url = new URL('/auth/login', req.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next|static|favicon.ico|.well-known).*)'],
}
