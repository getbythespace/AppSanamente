import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser } from '@/utils/auth-server'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const currentUser = await getSessionUser(req, res)
    
    if (!currentUser || currentUser.activeRole !== 'OWNER') {
      return res.status(403).json({ error: 'Acceso denegado' })
    }

    const admins = await prisma.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
        activeRole: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastNamePaternal: true,
        organizationId: true,
        activeRole: true,
        isPsychologist: true
      }
    })

    return res.json(admins)
  } catch (error) {
    console.error('Error getting admins:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}