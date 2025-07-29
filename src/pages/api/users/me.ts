import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { supabase } from '../../../services/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No autenticado' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'No autenticado' })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { roles: true, organization: true }
  })
  if (!dbUser) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json(dbUser)
}