import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSessionUser } from '@/utils/auth-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const authUser = await getSessionUser(req, res)
  
  if (!authUser) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  const isSuperAdmin = authUser.roles?.some((r: any) => r.role === 'SUPERADMIN')
  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Solo superadmins pueden ver usuarios' })
  }

  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId as string },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            rut: true
            // REMOVED: slug field doesn't exist in Organization schema
          }
        },
        roles: {
          select: {
            role: true
          }
        },
        _count: {
          select: {
            // REMOVED: sessions field doesn't exist in User schema
            assignmentsAsPatient: true,
            assignmentsAsPsychologist: true,
            moodEntries: true,
            sessionNotesAsPatient: true,
            sessionNotesAsPsychologist: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    // FIXED: Crear log de auditoría sin campo details (no existe en schema)
    await prisma.auditLog.create({
      data: {
        action: 'USER_VIEWED',
        userId: authUser.id,
        targetId: userId as string,
        description: `User ${user.email} viewed`
      }
    })

    return res.json({ user })

  } catch (error) {
    console.error('Error fetching user:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}