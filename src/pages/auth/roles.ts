
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from 'src/lib/prisma'
import { supabase } from 'src/lib/db'

export async function withUser(
  req: NextApiRequest, res: NextApiResponse,
  handler: (user: any) => Promise<void>
) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).end()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).end()
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) return res.status(403).end()
  return handler(dbUser)
}

export function requireRole(user: any, roles: string[]) {
  if (!roles.includes(user.role)) throw { status: 403, message: 'Forbidden' }
}