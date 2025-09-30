// src/pages/api/_utils/auth.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/services/supabaseAdmin'

export async function requireUser(req: NextApiRequest, res: NextApiResponse) {
  // 1) Intentar Bearer
  let token: string | undefined
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) token = auth.slice(7)

  // 2) Fallback: cookie de Supabase (mismo dominio)
  if (!token) token = req.cookies?.['sb-access-token'] || undefined

  if (!token) {
    res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
    return null
  }

  // Validar token con el service role
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    res.status(401).json({ ok: false, error: 'UNAUTHORIZED' })
    return null
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: data.user.id },
    include: { roles: true },
  })

  if (!dbUser) {
    res.status(403).json({ ok: false, error: 'FORBIDDEN' })
    return null
  }
  if (dbUser.status !== 'ACTIVE') {
    res.status(403).json({ ok: false, error: 'USER_INACTIVE' })
    return null
  }

  return dbUser
}
