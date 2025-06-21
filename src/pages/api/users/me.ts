import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuth } from '@clerk/nextjs/server'
import { prisma } from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req)
  if (!userId) return res.status(401).json({ error: 'No autenticado' })
  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json(user)
}