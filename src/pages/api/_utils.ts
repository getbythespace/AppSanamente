
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'
import { supabase } from '../../services/db'

export async function withUser(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (user: any) => Promise<void | NextApiResponse<any>>
) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { roles: true }
  })
  if (!dbUser) {
    return res.status(403).json({ error: 'Access denied' })
  }

  return handler(dbUser)
}

export function requireRole(user: any, roles: string[]) {
  if (!user.roles.some((r: any) => roles.includes(r.role))) {
    throw { status: 403, message: 'Forbidden' }
  }
}